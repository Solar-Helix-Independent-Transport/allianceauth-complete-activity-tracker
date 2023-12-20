import logging
from datetime import timedelta
from typing import List

from allianceauth.eveonline.models import EveCharacter
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.db.models import (CharField, Count, ExpressionWrapper, F,
                              IntegerField, Max, Value)
from django.utils import timezone
from esi.models import Token
from ninja import NinjaAPI
from ninja.security import django_auth

from aacat.tasks.fleet_tasks import check_character_online, snapshot_fleet

from . import models, providers, schema

logger = logging.getLogger(__name__)

api = NinjaAPI(title="CAT API", version="0.0.1",
               urls_namespace='aacat:api', auth=django_auth, csrf=True,
               )  # openapi_url=settings.DEBUG and "/openapi.json" or "")


@api.post(
    "/search/system/",
    response={200: List[schema.EveName]},
    tags=["Search"]
)
def post_system_search(request, search_text: str, limit: int = 10):
    if not request.user.has_perm('aacat.view_global'):
        return 403, "No Perms"

    return models.System.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("System", output_field=CharField()))[:limit]


@api.post(
    "/search/constellation/",
    response={200: List[schema.EveName]},
    tags=["Search"]
)
def post_constellation_search(request, search_text: str, limit: int = 10):
    if not request.user.has_perm('aacat.view_global'):
        return 403, "No Perms"

    return models.Constellation.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("Constellation", output_field=CharField()))[:limit]


@api.post(
    "/search/region/",
    response={200: List[schema.EveName]},
    tags=["Search"]
)
def post_region_search(request, search_text: str, limit: int = 10):
    if not request.user.has_perm('aacat.view_global'):
        return 403, "No Perms"

    return models.Region.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("Region", output_field=CharField()))[:limit]


@api.post(
    "/search/auth/group/",
    response={200: List},
    tags=["Search"]
)
def post_group_search(request, search_text: str, limit: int = 10):
    if not request.user.has_perm('aacat.view_global'):
        return 403, "No Perms"

    return models.Group.objects.filter(name__icontains=search_text).values("name", "id")[:limit]


@api.post(
    "/search/auth/character/",
    response={200: List[schema.Character]},
    tags=["Search"]
)
def post_character_search(request, search_text: str, limit: int = 10):
    if not request.user.has_perm('aacat.view_global'):
        return 403, "No Perms"

    return models.EveCharacter.objects.filter(character_name__icontains=search_text)[:limit]


@api.post(
    "/fleets/track",
    response={200: List[schema.Character], 403: str},
    tags=["Tracking"]
)
def post_track_me(request):
    """
        Track any fleeets currently being run by the logged in user.
    """
    if not request.user.has_perm('aacat.create_fleets'):
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
    response={200: schema.Character, 403: str},
    tags=["Tracking"]
)
def post_track_character(request, character_id: int):
    """
        Track the fleet being run by the character_id, if they are in a fleet.
    """
    if not request.user.has_perm('aacat.create_fleets'):
        return 403, "No Perms"
    character = EveCharacter.objects.get(character_id=character_id)
    check_character_online.apply_async(
        args=[character.character_id], priority=1)
    return 200, character


@api.post(
    "/fleets/{fleet_id}/end",
    response={200: list, 403: str},
    tags=["Tracking"]
)
def post_end_fleet(request, fleet_id: int):
    """
        Stop Tracking a fleet.
    """
    if not request.user.has_perm('aacat.create_fleets'):
        return 403, "No Perms"
    fleets = models.Fleet.objects.filter(eve_fleet_id=fleet_id)
    out = []
    for f in fleets:
        f.end_time = timezone.now()
        f.save()
        out.append(f"{f.eve_fleet_id} {f.boss.character_name} closed")
    return 200, out


@api.post(
    "/fleets/{fleet_id}/restart",
    response={200: list, 403: str},
    tags=["Tracking"]
)
def post_restart_fleet_tasks(request, fleet_id: int):
    """
        Restart any fleet tasks that may have failed.
    """
    if not request.user.has_perm('aacat.create_fleets'):
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
    response={200: List},
    tags=["Stats"]
)
def get_fleets_active(request, limit: int = 50):
    """
        Show all actively tracked fleets
    """
    if not request.user.has_perm('aacat.create_fleets'):
        return 403, "No Perms"

    return models.Fleet.objects.filter(end_time__isnull=True).values(
        "name",
        "eve_fleet_id",
        "boss__character_name",
        "last_update",
        approx_capture_minutes=ExpressionWrapper(
            F("events")*10/60, output_field=IntegerField())
    )[:limit]


@api.get(
    "/fleets/recent/",
    response={200: List},
    tags=["Stats"]
)
def get_fleets_recent(request, days_look_back: int = 14):
    """
        Show a list of previously tracked fleets
    """
    if not request.user.has_perm('aacat.view_global'):
        return 403, "No Perms"

    _start = timezone.now() - timedelta(days=days_look_back)
    return models.Fleet.objects.filter(start_time__gte=_start, end_time__isnull=False).values(
        "name",
        "eve_fleet_id",
        "boss__character_name",
        "start_time",
        "end_time",
        "last_update",
        approx_capture_minutes=ExpressionWrapper(
            F("events")*10/60, output_field=IntegerField())
    )


@api.get(
    "/fleets/{fleet_id}/snapshot",
    response={200: schema.Snapshot},
    tags=["Stats"]
)
def get_fleet_recent_snapshot(request, fleet_id: int):
    """
        Provide teh most recent snapshot of a fleet
    """
    if not request.user.has_perm('aacat.view_global'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    max_date = models.FleetEvent.objects.filter(
        fleet=fleet).aggregate(max_date=Max("time"))["max_date"]
    latest_events = models.FleetEvent.objects.filter(
        fleet=fleet, time=max_date)
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
    "/fleets/{fleet_id}/stats",
    response={200: list},
    tags=["Stats"]
)
def get_fleet_stats(request, fleet_id: int):
    """
        Provide the most recent snapshot of a fleet grouped by ship types etc.
    """
    if not request.user.has_perm('aacat.view_global'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    max_date = models.FleetEvent.objects.filter(
        fleet=fleet).aggregate(max_date=Max("time"))["max_date"]
    latest_events = models.FleetEvent.objects.filter(
        fleet=fleet, time=max_date)
    ship_counts = latest_events.values(
        name=F("ship__name")
    ).annotate(
        count=Count("ship__name"),
        type_id=F("ship_type_id")
    )
    return ship_counts


@api.get(
    "/fleets/{character_id}/fleet_id",
    response={200: int, 404: str, 403: str},
    tags=["Search"]
)
def get_fleet_id_from_character_id(request, character_id: int):
    """
        Get the fleet id a character is in.
    """
    if not request.user.has_perm('aacat.view_global'):
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
    response={200: dict, 403: str},
    tags=["Actions"]
)
def get_fleet_details(request, fleet_id: int):
    """
        Get the fleet settigns and MOTD
    """
    if not request.user.has_perm('aacat.create_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.write_fleet.v1'])
    details = providers.esi.client.Fleets.get_fleets_fleet_id(
        fleet_id=fleet_id,
        token=token.valid_access_token()
    ).result()
    return details


@api.put(
    "/fleets/{fleet_id}/details",
    response={200: dict, 403: str},
    tags=["Actions"]
)
def put_fleet_details(request, fleet_id: int, free_move: bool, motd: str):
    """
        Update fleet Free move and MOTD
    """
    if not request.user.has_perm('aacat.create_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.write_fleet.v1'])
    details = providers.esi.client.Fleets.put_fleets_fleet_id(
        fleet_id=fleet_id,
        new_settings={
            "is_free_move": free_move,
            "motd": motd
        },
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
    if not request.user.has_perm('aacat.create_fleets'):
        return 403, "No Perms"

    fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
    token = Token.get_token(fleet.boss.character_id, [
                            'esi-fleets.write_fleet.v1'])
    status = providers.esi.client.Fleets.delete_fleets_fleet_id_members_member_id(
        fleet_id=fleet_id,
        member_id=character_id,
        token=token.valid_access_token()
    ).result()
    return f"Kicked {character_id} from {fleet_id}"


@api.post(
    "/fleets/{fleet_id}/invite/{character_id}",
    response={200: str, 403: str},
    tags=["Actions"]
)
def invite_fleet_member(request, fleet_id: int, character_id: int):
    """
        Invite a character to fleet
    """
    if not request.user.has_perm('aacat.create_fleets'):
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
