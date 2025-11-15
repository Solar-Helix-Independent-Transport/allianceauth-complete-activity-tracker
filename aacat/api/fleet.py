import logging
from collections import defaultdict
from datetime import timedelta
from typing import List

from aacat import providers
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

from .. import models, schema

logger = logging.getLogger(__name__)


class FleetStatsEndpoints():
    def __init__(self, api) -> None:
        @api.get(
            "/fleets/{fleet_id}/stats",
            response={200: list, **schema.error_responses},
            tags=["Stats"]
        )
        def get_fleet_stats(request, fleet_id: int):
            """
                Provide the most recent snapshot of a fleet grouped by ship types etc.
            """
            if not request.user.has_perm('aacat.edit_fleets'):
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
                type_id=F("ship_type_id"),
                cat_name=F("ship__cat__name"),
                cat_id=F("ship__cat__id")
            ).order_by("-count")
            return ship_counts

        @api.get(
            "/fleets/{fleet_id}/timeline",
            response={200: list, **schema.error_responses},
            tags=["Stats"]
        )
        def get_fleet_timeline(request, fleet_id: int):
            """
                Provide timeline data for graph.
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)

            events = models.FleetEvent.objects.filter(fleet=fleet).values(
                "time"
            ).annotate(
                count=Count("ship__name"),
                type_id=F("ship_type_id"),
                cat_name=F("ship__cat__name"),
                ship_name=F("ship__name"),
                cat_id=F("ship__cat__id")
            ).order_by("ship__name")

            """
            [
                {
                    "label":"ship_name",
                    "data":[
                        {
                            "primary": date,
                            "secondary": count
                        },
                        {
                            "primary": date,
                            "secondary": count
                        },
                        ...
                    ]
                },
                {
                    "label":"string",
                    "data":[
                        {
                            "primary": date,
                            "secondary": count
                        },
                        ...
                    ]
                },
                ...
            ]
            """

            out = {}
            for event in events:
                print(event)

            return list(out.values())

        @api.get(
            "/fleets/{fleet_id}/time_diff/{minutes}",
            response={200: list},
            tags=["Stats"]
        )
        def get_fleet_time_diff(request, fleet_id: int, minutes: int):
            """
                Provide the rolling changes of a fleets comp in the time period
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

            output = {}
            # output = defaultdict( lambda: {
            #     "count":0,
            #     "name": "",
            #     "type_id": 0
            # })

            start_counts = oldest_events.values(
                name=F("ship__name")
            ).annotate(
                count=Count("ship__name"),
                type_id=F("ship_type_id")
            )

            for ev in start_counts:
                output[ev['name']] = {
                    "name": ev['name'],
                    "start_count": ev['count'],
                    "end_count": 0,
                    "diff": -ev['count'],
                    "type_id": ev['type_id']
                }

            end_counts = latest_events.values(
                name=F("ship__name")
            ).annotate(
                count=Count("ship__name"),
                type_id=F("ship_type_id")
            )

            for ev in end_counts:
                if ev['name'] not in output:
                    output[ev['name']] = {
                        "name": ev['name'],
                        "start_count": 0,
                        "type_id": ev['type_id']
                    }
                output[ev['name']].update({
                    "end_count": ev['count'],
                    "diff": ev['count'] - output[ev['name']]["start_count"]
                })

            return list(output.values())


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

            fleet_wing_data = providers.esi.get_fleet_wings(fleet_id, token)

            fleet_member_data = providers.esi.client.Fleets.GetFleetsFleetIdMembers(
                fleet_id=fleet_id,
                token=token
            ).result()

            fleet_structure = {
                "fleet_boss": fleet.boss,
                "commander": None,
                "wings": {}
            }

            for wing in fleet_wing_data:
                w = wing.id

                if w not in fleet_structure["wings"]:
                    fleet_structure["wings"][w] = {
                        "wing_id": w,
                        "name": wing.name,
                        "commander": None,
                        "squads": {}
                    }
                for squad in wing.squads:
                    s = squad.id

                    if s not in fleet_structure["wings"][w]["squads"]:
                        fleet_structure["wings"][w]["squads"][s] = {
                            "squad_id": s,
                            "name": squad.name,
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
                if e.character_id in chars:
                    r = e.role
                    w = e.wing_id
                    s = e.squad_id
                    if r == FleetRoles.SQUAD_MEMBER:
                        fleet_structure["wings"][w]["squads"][s]["characters"].append(
                            chars[e.character_id])
                    elif r == FleetRoles.FLEET_COMMANDER:
                        fleet_structure["commander"] = chars[e.character_id]
                    elif r == FleetRoles.WING_COMMANDER:
                        fleet_structure["wings"][w]["commander"] = chars[e.character_id]
                    elif r == FleetRoles.SQUAD_COMMANDER:
                        fleet_structure["wings"][w]["squads"][s]["commander"] = chars[
                            e.character_id
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
