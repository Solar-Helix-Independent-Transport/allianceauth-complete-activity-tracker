import logging
from collections import defaultdict
from datetime import timedelta
from typing import List

from allianceauth.eveonline.models import EveCharacter
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.db.models import (CharField, Count, ExpressionWrapper, F,
                              IntegerField, Max, Min, TextChoices, Value)
from django.utils import timezone
from esi.models import Token
from ninja import Field, NinjaAPI
from ninja.security import django_auth

from aacat.tasks.fleet_tasks import check_character_online, snapshot_fleet

from .. import models, providers, schema
from .fat import FatEndpoints
from .fleet import FleetStatsEndpoints
from .search import SearchEndpoints
from .squad import SquadEndpoints
from .wing import WingEndpoints

logger = logging.getLogger(__name__)

api = NinjaAPI(title="CAT API", version="0.0.1",
               urls_namespace='aacat:api', auth=django_auth, csrf=True,
               )  # openapi_url=settings.DEBUG and "/openapi.json" or "")


# init API "classes"...
# TODO maybe look into using django-ninja-extras class based stuffs
SearchEndpoints(api)
WingEndpoints(api)
SquadEndpoints(api)
FleetStatsEndpoints(api)
FatEndpoints(api)


@api.post(
    "/fleets/track",
    response={200: List[schema.Character], **schema.error_responses},
    tags=["Tracking"]
)
def track_me(request):
    """
        Track any fleeets currently being run by the logged in user.
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"
    char_ownerships = request.user.character_ownerships.all()
    characters = []
    for c in char_ownerships:
        characters.append(c.character)
        check_character_online.apply_async(
            args=[c.character.character_id], priority=1)

    return 200, characters


@api.post(
    "/fleets/{character_id}/track",
    response={200: schema.Character, **schema.error_responses},
    tags=["Tracking"]
)
def track_character(request, character_id: int):
    """
        Track the fleet being run by the character_id, if they are in a fleet.
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"
    character = EveCharacter.objects.get(character_id=character_id)
    check_character_online.apply_async(
        args=[character.character_id], priority=1)
    return 200, character


@api.post(
    "/fleets/{fleet_id}/end",
    response={200: list[str], **schema.error_responses},
    tags=["Tracking"]
)
def end_fleet(request, fleet_id: int):
    """
        Stop Tracking a fleet.
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"
    fleets = models.Fleet.objects.filter(eve_fleet_id=fleet_id)
    out = []
    for f in fleets:
        f.end_time = timezone.now()
        f.save()
        out.append("Tracking Stopped")
    return 200, out


@api.post(
    "/fleets/{fleet_id}/restart",
    response={200: list[str], **schema.error_responses},
    tags=["Tracking"]
)
def restart_fleet_tasks(request, fleet_id: int):
    """
        Restart any fleet tasks that may have failed.
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"
    fleets = models.Fleet.objects.filter(eve_fleet_id=fleet_id)
    out = []
    for f in fleets:
        snapshot_fleet.apply_async(
            args=[f.boss.character_id, f.eve_fleet_id], priority=1)
        out.append(f"{f.eve_fleet_id} {f.boss.character_name}")
    return 200, out


@api.get(
    "/fleets/active/",
    response={200: List[schema.FleetDetails], **schema.error_responses},
    tags=["Stats"]
)
def get_fleets_active(request, limit: int = 50):
    """
        Show all actively tracked fleets
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    return models.Fleet.objects.filter(end_time__isnull=True)[:limit]


@api.get(
    "/fleets/recent/",
    response={200: List[schema.FleetDetails], **schema.error_responses},
    tags=["Stats"]
)
def get_fleets_recent(request, days_look_back: int = 90):
    """
        Show a list of previously tracked fleets
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    _start = timezone.now() - timedelta(days=days_look_back)
    return models.Fleet.objects.filter(start_time__gte=_start, end_time__isnull=False)


@api.get(
    "/fleets/{fleet_id}/snapshot",
    response={200: schema.Snapshot, **schema.error_responses},
    tags=["Stats"]
)
def get_fleet_recent_snapshot(request, fleet_id: int):
    """
        Provide teh most recent snapshot of a fleet
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    max_date = models.FleetEvent.objects.filter(
        fleet=fleet).aggregate(max_date=Max("time"))["max_date"]
    latest_events = models.FleetEvent.objects.filter(
        fleet=fleet, time=max_date).order_by("distance_from_fc", "ship__name")
    snapshot = []
    for e in latest_events:
        main_char = None
        try:
            main_char = e.character_name.character_ownership.user.profile.main_character
        except:
            pass

        snapshot.append({
            "character": e.character_name,
            "main": main_char,
            "distance": e.distance_from_fc,
            "system": {
                "id": e.solar_system.id,
                "name": e.solar_system.name,
                "cat": "SolarSystem"
            },
            "ship": {
                "id": e.ship.id,
                "name": e.ship.name,
            },
            "role": e.role,
            "join_time": e.join_time
        })
    return {"time": max_date, "snapshot": snapshot}


@api.get(
    "/fleets/{fleet_id}/time_diff/{minutes}/mains",
    response={200: dict},
    tags=["Stats"]
)
def get_fleet_time_diff_mains(request, fleet_id: int, minutes: int):
    """
        Provide the rolling changes of a fleets members in the time period
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    max_date = models.FleetEvent.objects.filter(
        fleet=fleet).aggregate(max_date=Max("time"))["max_date"]
    latest_events = models.FleetEvent.objects.filter(
        fleet=fleet, time=max_date)

    time_start = timezone.now() - timedelta(minutes=minutes)
    min_date = models.FleetEvent.objects.filter(
        fleet=fleet, time__gte=time_start).aggregate(min_date=Min("time"))["min_date"]
    oldest_events = models.FleetEvent.objects.filter(
        fleet=fleet, time=min_date)

    start = []
    output = {
        "new_joiners": [],
        "deserters": []
    }
    # output = defaultdict( lambda: {
    #     "count":0,
    #     "name": "",
    #     "type_id": 0
    # })
    start_chars = oldest_events.values(
        name=F(
            "character_name__character_ownership__user__profile__main_character__character_name")
    ).distinct()

    for ev in start_chars:
        start.append(
            ev['name']
        )

    end_chars = latest_events.values(
        name=F(
            "character_name__character_ownership__user__profile__main_character__character_name")
    ).distinct()

    for ev in end_chars:
        c = ev['name']
        if c in start:
            start.pop(start.index(c))
        else:
            output['new_joiners'].append(ev['name'])

    output['deserters'] = start
    return output


@api.get(
    "/fleets/{fleet_id}/character_changes",
    response={200: List[schema.CountResponse]},
    tags=["Stats"]
)
def get_fleet_character_changes(
    request,
    fleet_id: int,
    ratio_cutoff: float = 0.90
):
    """
        Provide an overview of fleet members who have left/joined late
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)

    max_date = models.FleetEvent.objects.filter(
        fleet=fleet).aggregate(max_date=Max("time"))["max_date"]

    latest_events = models.FleetEvent.objects.filter(
        fleet=fleet, time=max_date)

    current = []

    current_chars = latest_events.values(
        name=F(
            "character_name__character_ownership__user__profile__main_character__character_name")
    ).distinct()

    for ev in current_chars:
        current.append(
            ev['name']
        )

    total_events = models.FleetEvent.objects.filter(
        fleet=fleet
    ).values(
        "time"
    ).aggregate(
        total=Count("time", distinct=True)
    )['total']

    char_events = models.FleetEvent.objects.filter(
        fleet=fleet
    ).values(
        main_character_name=F(
            "character_name__character_ownership__user__profile__main_character__character_name")
    ).annotate(
        count=Count("time", distinct=True),
        main_character_id=F(
            "character_name__character_ownership__user__profile__main_character__character_id"),
        main_corporation_name=F(
            "character_name__character_ownership__user__profile__main_character__corporation_name"),
        main_corporation_id=F(
            "character_name__character_ownership__user__profile__main_character__corporation_id"),
        main_alliance_name=F(
            "character_name__character_ownership__user__profile__main_character__alliance_name"),
        main_alliance_id=F(
            "character_name__character_ownership__user__profile__main_character__alliance_id"),
    )

    unaffiliated = models.FleetEvent.objects.filter(
        fleet=fleet, character_name__character_ownership__isnull=True
    ).values(
        _character_name=F(
            "character_name__character_name")
    ).annotate(
        count=Count("time", distinct=True),
        _character_id=F(
            "character_name__character_id"),
        _corporation_name=F(
            "character_name__corporation_name"),
        _corporation_id=F(
            "character_name__corporation_id"),
        _alliance_name=F(
            "character_name__alliance_name"),
        _alliance_id=F(
            "character_name__alliance_id"),
    )

    output = {
        "current": {
            "name": "Current",
            "total": total_events,
            "characters": []
        },
        "joiners": {
            "name": "Joiners",
            "total": total_events,
            "characters": []
        },
        "leavers": {
            "name": "Leavers",
            "total": total_events,
            "characters": []
        },
        "unaffiliated": {
            "name": "Unaffiliated",
            "total": total_events,
            "characters": [{
                "character": {
                    "character_name": c.get("_character_name"),
                    "character_id": c.get("_character_id"),
                    "corporation_name": c.get("_corporation_name"),
                    "corporation_id": c.get("_corporation_id"),
                    "alliance_name": c.get("_alliance_name", None),
                    "alliance_id": c.get("_alliance_id", None),
                },
                "count": c.get("count", 0)
            } for c in unaffiliated]
        },
    }

    cutoff = total_events * ratio_cutoff

    for c in char_events:
        if c.get("main_character_id"):
            character_event = {
                "character": {
                    "character_name": c.get("main_character_name"),
                    "character_id": c.get("main_character_id"),
                    "corporation_name": c.get("main_corporation_name"),
                    "corporation_id": c.get("main_corporation_id"),
                    "alliance_name": c.get("main_alliance_name", None),
                    "alliance_id": c.get("main_alliance_id", None),
                },
                "count": c.get("count", 0)
            }
            if c['main_character_name'] in current:
                if c['count'] > cutoff:
                    output['current']["characters"].append(character_event)
                else:
                    output['joiners']["characters"].append(character_event)
            else:
                output['leavers']["characters"].append(character_event)

    return list(output.values())


@api.get(
    "/fleets/{character_id}/fleet_id",
    response={200: int, 404: str, 403: str},
    tags=["Search"]
)
def get_fleet_id_from_character_id(request, character_id: int):
    """
        Get the fleet id a character is in.
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    token = Token.get_token(
        character_id, ['esi-location.read_online.v1', 'esi-fleets.read_fleet.v1'])

    if not token:
        return 404, "No Tokens Found"

    online_status = providers.esi.client.Location.get_characters_character_id_online(character_id=character_id,
                                                                                     token=token.valid_access_token()).result()
    if online_status.get('online', False):
        return 404, f"{token.character_name} is offline"

    fleet_details = providers.esi.client.Fleets.get_characters_character_id_fleet(character_id=character_id,
                                                                                  token=token.valid_access_token()).result()
    return 200, fleet_details.get('fleet_id')


@api.get(
    "/fleets/{fleet_id}/details",
    response={200: schema.FleetDetails, **schema.error_responses},
    tags=["Actions"]
)
def get_fleet_details(request, fleet_id: int):
    """
        Get the fleet settigns and MOTD
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    token_write = Token.get_token(fleet.boss.character_id, [
        'esi-fleets.write_fleet.v1'])
    token_read = Token.get_token(fleet.boss.character_id, [
        'esi-fleets.read_fleet.v1'])
    details = providers.esi.client.Fleets.get_fleets_fleet_id(
        fleet_id=fleet_id,
        token=token_read.valid_access_token()
    ).result()
    _f = {
        "name": fleet.name,
        "boss": fleet.boss,
        "eve_fleet_id": fleet.eve_fleet_id,
        "start_time": fleet.start_time,
        "last_update": fleet.last_update,
        "end_time": fleet.end_time,
        "editable": True if token_write else False,
        "state": details
    }
    return _f


@api.post(
    "/fleets/{fleet_id}/name",
    response={200: str, **schema.error_responses},
    tags=["Actions"]
)
def post_fleet_name(request, fleet_id: int, name: str):
    """
        Update fleet Free name in auth
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    fleet.name = name
    fleet.save()
    return "Fleet Renamed"


@api.put(
    "/fleets/{fleet_id}/details",
    response={200: schema.FleetState, **schema.error_responses},
    tags=["Actions"]
)
def put_fleet_details(request, fleet_id: int, free_move: bool = None, motd: str = None):
    """
        Update fleet Free move and MOTD
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.write_fleet.v1'])
    new_settings = {}

    if free_move is not None:
        new_settings['is_free_move'] = free_move

    if motd is not None:
        new_settings['motd'] = motd

    details = providers.esi.client.Fleets.put_fleets_fleet_id(
        fleet_id=fleet_id,
        new_settings=new_settings,
        token=token.valid_access_token()
    ).result()
    return {
        "is_free_move": free_move,
        "motd": motd
    }


@api.delete(
    "/fleets/{fleet_id}/kick/{character_id}",
    response={200: str, 403: str},
    tags=["Actions"]
)
def kick_fleet_member(request, fleet_id: int, character_id: int):
    """
        Kick character from fleet
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.write_fleet.v1'])
    if character_id == fleet.boss.character_id:
        return 403, "Cannot Kick Fleet Boss!"
    status = providers.esi.client.Fleets.delete_fleets_fleet_id_members_member_id(
        fleet_id=fleet_id,
        member_id=character_id,
        token=token.valid_access_token()
    ).result()
    return f"Kicked {character_id} from {fleet_id}"


@api.post(
    "/fleets/{fleet_id}/invite/{character_id}",
    response={200: str, **schema.error_responses},
    tags=["Actions"]
)
def invite_fleet_member(request, fleet_id: int, character_id: int):
    """
        Invite a character to fleet
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.write_fleet.v1'])
    join = providers.esi.client.Fleets.post_fleets_fleet_id_members(
        fleet_id=fleet_id,
        invitation={
            "character_id": character_id,
            "role": "squad_member"
        },
        token=token.valid_access_token()
    ).result()
    return f"sent Invite to {character_id} from {fleet_id} aka {token.character_name}"


class FleetRoles(TextChoices):
    FLEET_COMMANDER = "fleet_commander"
    WING_COMMANDER = "wing_commander"
    SQUAD_COMMANDER = "squad_commander"
    SQUAD_MEMBER = "squad_member"


@api.put(
    "/fleets/{fleet_id}/move/{character_id}",
    response={200: str, **schema.error_responses},
    tags=["Actions"]
)
def move_fleet_member(
    request,
    fleet_id: int,
    character_id: int,
    role: FleetRoles,
    squad_id: int = None,
    wing_id: int = None
):
    """
        Move a character in fleet

        If a character is moved to the `fleet_commander` role,
        **neither** `wing_id` or `squad_id` should be specified.

        If a character is moved to the `wing_commander` role,
        **only** `wing_id` should be specified.

        If a character is moved to the `squad_commander` role,
        **both** `wing_id` and `squad_id` should be specified.

        If a character is moved to the `squad_member` role,
        **both** `wing_id` and `squad_id` should be specified.
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    if role == FleetRoles.FLEET_COMMANDER and squad_id is not None and wing_id is not None:
        return 401, f"{FleetRoles.SQUAD_COMMANDER} requires neither squad_id and wing_id"

    if role == FleetRoles.SQUAD_COMMANDER and (squad_id is None or wing_id is None):
        return 401, f"{FleetRoles.SQUAD_COMMANDER} requires both squad_id and wing_id"

    if role == FleetRoles.SQUAD_COMMANDER and (squad_id is None or wing_id is None):
        return 401, f"{FleetRoles.SQUAD_COMMANDER} requires both squad_id and wing_id"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.write_fleet.v1'])
    movement = {
        "role": role,
        "squad_id": None,
        "wing_id": None
    }
    if role in (FleetRoles.SQUAD_MEMBER, FleetRoles.SQUAD_COMMANDER):
        movement["squad_id"] = squad_id
        movement["wing_id"] = wing_id
    elif role == FleetRoles.WING_COMMANDER:
        movement["wing_id"] = wing_id

    move = providers.esi.client.Fleets.put_fleets_fleet_id_members_member_id(
        fleet_id=fleet_id,
        member_id=character_id,
        movement=movement,
        token=token.valid_access_token()
    ).result()

    return f"{character_id} Moved f:{fleet_id} r:{role} w:{wing_id} s:{squad_id}"


@api.get(
    "/fleets/{fleet_id}/structure",
    response={200: schema.FleetStructure, **schema.error_responses},
    tags=["Structure"]
)
def get_fleet_structure(request, fleet_id: int):
    """
        Get the fleet hierarchy
        TODO Refactor this is way too big
        TODO can prob share logic with the snapshot task
    """
    if not request.user.has_perm('aacat.edit_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.filter(eve_fleet_id=fleet_id).last()
    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.read_fleet.v1'])

    fleet_wing_data = providers.esi.client.Fleets.get_fleets_fleet_id_wings(
        fleet_id=fleet_id,
        token=token.valid_access_token()
    ).result()

    fleet_member_data = providers.esi.client.Fleets.get_fleets_fleet_id_members(
        fleet_id=fleet_id,
        token=token.valid_access_token()
    ).result()

    fleet_structure = {
        "fleet_boss": fleet.boss,
        "commander": None,
        "wings": {}
    }

    for wing in fleet_wing_data:
        w = wing.get("id")

        if w not in fleet_structure["wings"]:
            fleet_structure["wings"][w] = {
                "wing_id": w,
                "name": wing.get("name"),
                "commander": None,
                "squads": {}
            }
        for squad in wing.get("squads"):
            s = squad.get("id")

            if s not in fleet_structure["wings"][w]["squads"]:
                fleet_structure["wings"][w]["squads"][s] = {
                    "squad_id": s,
                    "name": squad.get("name"),
                    "commander": None,
                    "characters": []
                }

    max_date = models.FleetEvent.objects.filter(
        fleet=fleet).aggregate(max_date=Max("time"))["max_date"]
    latest_events = models.FleetEvent.objects.filter(
        fleet=fleet, time=max_date).select_related(
            "solar_system",
            "ship",
            "character_name",
            "character_name__character_ownership__user__profile__main_character"
    ).order_by("distance_from_fc", "ship__name")

    chars = {}
    for e in latest_events:
        main_char = None
        try:
            main_char = e.character_name.character_ownership.user.profile.main_character
        except Exception:
            pass

        chars[e.character_id] = {
            "character": e.character_name,
            "main": main_char,
            "distance": e.distance_from_fc,
            "system": {
                "id": e.solar_system.id,
                "name": e.solar_system.name,
                "cat": "SolarSystem"
            },
            "ship": {
                "id": e.ship.id,
                "name": e.ship.name,
            },
            "role": e.role,
            "join_time": e.join_time,
            "takes_fleet_warp": e.takes_fleet_warp
        }

    for e in fleet_member_data:
        if e.get("character_id") in chars:
            r = e.get("role")
            w = e.get("wing_id")
            s = e.get("squad_id")
            if r == FleetRoles.SQUAD_MEMBER:
                fleet_structure["wings"][w]["squads"][s]["characters"].append(
                    chars[e.get("character_id")])
            elif r == FleetRoles.FLEET_COMMANDER:
                fleet_structure["commander"] = chars[e.get("character_id")]
            elif r == FleetRoles.WING_COMMANDER:
                fleet_structure["wings"][w]["commander"] = chars[e.get(
                    "character_id")]
            elif r == FleetRoles.SQUAD_COMMANDER:
                fleet_structure["wings"][w]["squads"][s]["commander"] = chars[
                    e.get("character_id")
                ]
        else:
            logger.warning(f"No event for {e}")

    # DictToList
    for _, w in fleet_structure["wings"].items():
        w["squads"] = sorted(list(w["squads"].values()),
                             key=lambda x: x['name'].lower())

    fleet_structure["wings"] = sorted(
        list(fleet_structure["wings"].values()), key=lambda x: x['name'].lower())

    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.write_fleet.v1'])
    fleet_structure["editable"] = True if token else False

    return fleet_structure
