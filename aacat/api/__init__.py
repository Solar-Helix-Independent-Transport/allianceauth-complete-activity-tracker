import logging
from collections import defaultdict
from datetime import timedelta
from typing import List

from allianceauth.eveonline.models import EveCharacter
from django.contrib.auth.models import Group, User
from django.db.models import TextChoices
from django.utils import timezone
from esi.models import Token
from eve_sde.models import ItemType, SolarSystem as SDESolarSystem
from ninja import NinjaAPI
from ninja.security import django_auth

from aacat.tasks.fleet_tasks import check_character_online, snapshot_fleet

from .. import models, providers, schema
from .fleet import _build_char_data, _latest_snapshot
from .fat import FatEndpoints
from .fleet import FleetStatsEndpoints
from .search import SearchEndpoints
from .squad import SquadEndpoints
from .wing import WingEndpoints

logger = logging.getLogger(__name__)

api = NinjaAPI(title="CAT API", version="0.0.1",
               urls_namespace='aacat:api', auth=django_auth,
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
    latest = _latest_snapshot(fleet)
    if not latest:
        return 404, "No snapshots"
    chars = _build_char_data(latest["members"])
    return {"time": latest["time"], "snapshot": list(chars.values())}


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
    snapshots = fleet.snapshots
    if not snapshots:
        return {"new_joiners": [], "deserters": []}

    latest = _latest_snapshot(fleet)
    time_start_str = (timezone.now() - timedelta(minutes=minutes)).isoformat()
    recent = [s for s in snapshots if s["time"] >= time_start_str]
    oldest = min(recent, key=lambda s: s["time"]) if recent else snapshots[0]

    def main_names_from_snapshot(snap):
        char_name_ids = [m["character_name_id"] for m in snap["members"] if m.get("character_name_id")]
        chars = {
            c.pk: c for c in EveCharacter.objects.filter(pk__in=char_name_ids).select_related(
                "character_ownership__user__profile__main_character"
            )
        }
        names = []
        for cid in char_name_ids:
            char = chars.get(cid)
            if not char:
                continue
            try:
                names.append(char.character_ownership.user.profile.main_character.character_name)
            except Exception:
                pass
        return names

    start = main_names_from_snapshot(oldest)
    output = {"new_joiners": [], "deserters": []}

    for name in main_names_from_snapshot(latest):
        if name in start:
            start.remove(name)
        else:
            output["new_joiners"].append(name)

    output["deserters"] = start
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
    snapshots = fleet.snapshots
    total_events = len(snapshots)

    output = {
        "current": {"name": "Current", "total": total_events, "characters": []},
        "joiners": {"name": "Joiners", "total": total_events, "characters": []},
        "leavers": {"name": "Leavers", "total": total_events, "characters": []},
        "unaffiliated": {"name": "Unaffiliated", "total": total_events, "characters": []},
    }

    if not snapshots:
        return list(output.values())

    # Count appearances per character_name_id across all snapshots
    char_counts = defaultdict(int)
    for snap in snapshots:
        for m in snap["members"]:
            if m.get("character_name_id"):
                char_counts[m["character_name_id"]] += 1

    all_chars = {
        c.pk: c for c in EveCharacter.objects.filter(pk__in=char_counts.keys()).select_related(
            "character_ownership__user__profile__main_character"
        )
    }

    # Main character IDs present in the latest snapshot
    latest = _latest_snapshot(fleet)
    latest_main_ids = set()
    for m in latest["members"]:
        char = all_chars.get(m.get("character_name_id"))
        if char:
            try:
                latest_main_ids.add(char.character_ownership.user.profile.main_character.character_id)
            except Exception:
                pass

    cutoff = total_events * ratio_cutoff

    # Aggregate by main character (highest count per main wins)
    main_data = {}
    unaffiliated_data = {}

    for char_name_id, count in char_counts.items():
        char = all_chars.get(char_name_id)
        if not char:
            continue
        try:
            main = char.character_ownership.user.profile.main_character
            key = main.character_id
            if key not in main_data or main_data[key]["count"] < count:
                main_data[key] = {
                    "character": {
                        "character_name": main.character_name,
                        "character_id": main.character_id,
                        "corporation_name": main.corporation_name,
                        "corporation_id": main.corporation_id,
                        "alliance_name": main.alliance_name,
                        "alliance_id": main.alliance_id,
                    },
                    "count": count,
                }
        except Exception:
            key = char.character_id
            if key not in unaffiliated_data or unaffiliated_data[key]["count"] < count:
                unaffiliated_data[key] = {
                    "character": {
                        "character_name": char.character_name,
                        "character_id": char.character_id,
                        "corporation_name": char.corporation_name,
                        "corporation_id": char.corporation_id,
                        "alliance_name": char.alliance_name,
                        "alliance_id": char.alliance_id,
                    },
                    "count": count,
                }

    output["unaffiliated"]["characters"] = [
        {"character": d["character"], "count": d["count"]} for d in unaffiliated_data.values()
    ]

    for main_id, data in main_data.items():
        entry = {"character": data["character"], "count": data["count"]}
        if main_id in latest_main_ids:
            if data["count"] > cutoff:
                output["current"]["characters"].append(entry)
            else:
                output["joiners"]["characters"].append(entry)
        else:
            output["leavers"]["characters"].append(entry)

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

    online_status = providers.esi.client.Location.GetCharactersCharacterIdOnline(
        character_id=character_id,
        token=token
    ).result()
    if online_status.get('online', False):
        return 404, f"{token.character_name} is offline"

    fleet_details = providers.esi.client.Fleets.GetCharactersCharacterIdFleet(
        character_id=character_id,
        token=token
    ).result()
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
    details = providers.esi.client.Fleets.GetFleetsFleetId(
        fleet_id=fleet_id,
        token=token_read
    ).result(use_etag=False)
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

    details = providers.esi.client.Fleets.PutFleetsFleetId(
        fleet_id=fleet_id,
        new_settings=new_settings,
        token=token
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
    status = providers.esi.client.Fleets.DeleteFleetsFleetIdMembersMemberId(
        fleet_id=fleet_id,
        member_id=character_id,
        token=token
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
    join = providers.esi.client.Fleets.PostFleetsFleetIdMembers(
        fleet_id=fleet_id,
        body={
            "character_id": character_id,
            "role": "squad_member"
        },
        token=token
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
    }

    if role in (FleetRoles.SQUAD_MEMBER, FleetRoles.SQUAD_COMMANDER):
        movement["squad_id"] = squad_id
        movement["wing_id"] = wing_id
    elif role == FleetRoles.WING_COMMANDER:
        movement["wing_id"] = wing_id

    move = providers.esi.client.Fleets.PutFleetsFleetIdMembersMemberId(
        fleet_id=fleet_id,
        member_id=character_id,
        body=movement,
        token=token
    ).result()

    return f"{character_id} Moved f:{fleet_id} r:{role} w:{wing_id} s:{squad_id}"


