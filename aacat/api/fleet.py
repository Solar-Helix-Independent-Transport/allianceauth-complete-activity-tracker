import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import List

from aacat import providers
from allianceauth.eveonline.models import EveCharacter
from django.utils import timezone
from esi.models import Token
from eve_sde.models import ItemType, SolarSystem as SDESolarSystem

from .. import models, schema

logger = logging.getLogger(__name__)


def _latest_snapshot(fleet):
    if not fleet.snapshots:
        return None
    return max(fleet.snapshots, key=lambda s: s["time"])


def _build_char_data(members):
    """Bulk-load EveCharacters and eve_sde lookups for a list of member dicts."""
    char_name_ids = [m["character_name_id"] for m in members if m.get("character_name_id")]
    ship_type_ids = {m["ship_type_id"] for m in members if m.get("ship_type_id")}
    solar_system_ids = {m["solar_system_id"] for m in members if m.get("solar_system_id")}

    eve_chars = {
        c.pk: c for c in EveCharacter.objects.filter(pk__in=char_name_ids).select_related(
            "character_ownership__user__profile__main_character"
        )
    }
    ships = {t.id: t for t in ItemType.objects.filter(id__in=ship_type_ids)}
    systems = {s.id: s for s in SDESolarSystem.objects.filter(id__in=solar_system_ids)}

    result = {}
    for m in sorted(members, key=lambda x: x.get("distance_from_fc", 999)):
        char = eve_chars.get(m.get("character_name_id"))
        main_char = None
        try:
            main_char = char.character_ownership.user.profile.main_character
        except Exception:
            pass
        ship = ships.get(m.get("ship_type_id"))
        system = systems.get(m.get("solar_system_id"))
        result[m["character_id"]] = {
            "character": char,
            "main": main_char,
            "distance": m.get("distance_from_fc", -2),
            "system": {
                "id": m.get("solar_system_id"),
                "name": system.name if system else str(m.get("solar_system_id", "Unknown")),
                "cat": "SolarSystem",
            },
            "ship": {
                "id": m.get("ship_type_id"),
                "name": ship.name if ship else f"Unknown ({m.get('ship_type_id')})",
            },
            "role": m.get("role"),
            "join_time": m.get("join_time"),
            "takes_fleet_warp": m.get("takes_fleet_warp", False),
        }
    return result


class FleetStatsEndpoints():
    def __init__(self, api) -> None:
        @api.get(
            "/fleets/{fleet_id}/stats",
            response={200: list, **schema.error_responses},
            tags=["Stats"]
        )
        def get_fleet_stats(request, fleet_id: int):
            """
                Provide the most recent snapshot of a fleet grouped by ship types.
            """
            if not request.user.has_perm('aacat.view_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            latest = _latest_snapshot(fleet)
            if not latest:
                return []

            counts = Counter(m["ship_type_id"] for m in latest["members"])
            type_info = {
                t.id: t for t in ItemType.objects.filter(
                    id__in=counts.keys()
                ).select_related("group")
            }
            result = []
            for type_id, count in counts.items():
                t = type_info.get(type_id)
                result.append({
                    "name": t.name if t else f"Unknown ({type_id})",
                    "count": count,
                    "type_id": type_id,
                    "cat_name": t.group.name if t and t.group else None,
                    "cat_id": t.group.id if t and t.group else None,
                })
            return sorted(result, key=lambda x: -x["count"])

        @api.get(
            "/fleets/{fleet_id}/timeline",
            response={200: list, **schema.error_responses},
            tags=["Stats"]
        )
        def get_fleet_timeline(request, fleet_id: int):
            """
                Provide timeline data for graph.
            """
            if not request.user.has_perm('aacat.view_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            if not fleet.snapshots:
                return []

            all_type_ids = {m["ship_type_id"] for s in fleet.snapshots for m in s["members"]}
            type_info = {t.id: t for t in ItemType.objects.filter(id__in=all_type_ids)}

            timeline = defaultdict(list)
            for snap in fleet.snapshots:
                counts = Counter(m["ship_type_id"] for m in snap["members"])
                for type_id, count in counts.items():
                    t = type_info.get(type_id)
                    name = t.name if t else f"Unknown ({type_id})"
                    timeline[name].append({"primary": snap["time"], "secondary": count})

            return [{"label": name, "data": data} for name, data in timeline.items()]

        @api.get(
            "/fleets/{fleet_id}/stream",
            response={200: dict, **schema.error_responses},
            tags=["Stats"]
        )
        def get_fleet_stream(request, fleet_id: int):
            """
            Time-series fleet ship composition shaped for a Nivo stream chart.
            Returns keys (top-10 ship types), one data point per snapshot, and
            elapsed-time labels for the x-axis.
            """
            if not request.user.has_perm('aacat.view_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            if not fleet.snapshots:
                return {"keys": [], "data": [], "times": []}

            snapshots = sorted(fleet.snapshots, key=lambda s: s["time"])

            all_type_ids = {m["ship_type_id"] for s in snapshots for m in s["members"]}
            type_info = {t.id: t for t in ItemType.objects.filter(id__in=all_type_ids)}

            # Build per-snapshot ship counts with resolved names
            snap_counts = []
            all_names: set = set()
            for snap in snapshots:
                counts = Counter(m["ship_type_id"] for m in snap["members"])
                named = {}
                for type_id, count in counts.items():
                    t = type_info.get(type_id)
                    name = t.name if t else f"Unknown ({type_id})"
                    named[name] = count
                    all_names.add(name)
                snap_counts.append({"time": snap["time"], "counts": named})

            totals = {n: sum(s["counts"].get(n, 0) for s in snap_counts) for n in all_names}
            keys = sorted(all_names, key=lambda k: -totals[k])

            data = [{k: s["counts"].get(k, 0) for k in keys} for s in snap_counts]

            times = [s["time"] for s in snap_counts]

            return {"keys": keys, "data": data, "times": times}

        @api.get(
            "/fleets/{fleet_id}/system_stream",

            response={200: dict, **schema.error_responses},
            tags=["Stats"]
        )
        def get_fleet_system_stream(request, fleet_id: int):
            """
            Time-series fleet member distribution by solar system for a stream chart.
            """
            if not request.user.has_perm('aacat.view_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            if not fleet.snapshots:
                return {"keys": [], "data": [], "times": []}

            snapshots = sorted(fleet.snapshots, key=lambda s: s["time"])

            all_sys_ids = {
                m["solar_system_id"]
                for s in snapshots
                for m in s["members"]
                if m.get("solar_system_id")
            }
            system_info = {s.id: s for s in SDESolarSystem.objects.filter(id__in=all_sys_ids)}

            snap_counts = []
            all_names: set = set()
            for snap in snapshots:
                counts = Counter(
                    m["solar_system_id"]
                    for m in snap["members"]
                    if m.get("solar_system_id")
                )
                named = {}
                for sys_id, count in counts.items():
                    s = system_info.get(sys_id)
                    name = s.name if s else f"Unknown ({sys_id})"
                    named[name] = count
                    all_names.add(name)
                snap_counts.append({"time": snap["time"], "counts": named})

            totals = {n: sum(s["counts"].get(n, 0) for s in snap_counts) for n in all_names}
            keys = sorted(all_names, key=lambda k: -totals[k])

            data = [{k: s["counts"].get(k, 0) for k in keys} for s in snap_counts]
            times = [s["time"] for s in snap_counts]

            return {"keys": keys, "data": data, "times": times}

        @api.get(
            "/fleets/{fleet_id}/time_diff/{minutes}",
            response={200: list},
            tags=["Stats"]
        )
        def get_fleet_time_diff(request, fleet_id: int, minutes: int):
            """
                Provide the rolling changes of a fleet's comp in the time period.
            """
            if not request.user.has_perm('aacat.view_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            if not fleet.snapshots:
                return []

            latest = _latest_snapshot(fleet)
            time_start_str = (timezone.now() - timedelta(minutes=minutes)).isoformat()
            recent = [s for s in fleet.snapshots if s["time"] >= time_start_str]
            oldest = min(recent, key=lambda s: s["time"]) if recent else fleet.snapshots[0]

            start_counts = Counter(m["ship_type_id"] for m in oldest["members"])
            end_counts = Counter(m["ship_type_id"] for m in latest["members"])
            all_type_ids = set(start_counts) | set(end_counts)
            type_info = {t.id: t for t in ItemType.objects.filter(id__in=all_type_ids)}

            output = {}
            for type_id in all_type_ids:
                t = type_info.get(type_id)
                name = t.name if t else f"Unknown ({type_id})"
                start_c = start_counts.get(type_id, 0)
                end_c = end_counts.get(type_id, 0)
                output[name] = {
                    "name": name,
                    "start_count": start_c,
                    "end_count": end_c,
                    "diff": end_c - start_c,
                    "type_id": type_id,
                }
            return list(output.values())

        @api.get(
            "/fleets/{fleet_id}/structure",
            response={200: schema.FleetStructure, **schema.error_responses},
            tags=["Structure"]
        )
        def get_fleet_structure(request, fleet_id: int):
            """
                Get the fleet hierarchy.
            """
            if not request.user.has_perm('aacat.view_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.filter(eve_fleet_id=fleet_id).last()
            token = Token.get_token(fleet.boss.character_id, ["esi-fleets.read_fleet.v1"])

            fleet_wing_data = providers.esi.get_fleet_wings(fleet_id, token)
            fleet_member_data = providers.esi.client.Fleets.GetFleetsFleetIdMembers(
                fleet_id=fleet_id, token=token
            ).result(use_etag=False)

            fleet_structure = {
                "fleet_boss": fleet.boss,
                "commander": None,
                "wings": {},
            }
            for wing in fleet_wing_data:
                w = wing.id
                if w not in fleet_structure["wings"]:
                    fleet_structure["wings"][w] = {
                        "wing_id": w,
                        "name": wing.name,
                        "commander": None,
                        "squads": {},
                    }
                for squad in wing.squads:
                    s = squad.id
                    if s not in fleet_structure["wings"][w]["squads"]:
                        fleet_structure["wings"][w]["squads"][s] = {
                            "squad_id": s,
                            "name": squad.name,
                            "commander": None,
                            "characters": [],
                        }

            latest = _latest_snapshot(fleet)
            if not latest:
                return 404, "No snapshots"

            chars = _build_char_data(latest["members"])

            for e in fleet_member_data:
                if e.character_id not in chars:
                    logger.warning(f"No snapshot entry for {e}")
                    continue
                r = e.role
                w = e.wing_id
                s = e.squad_id
                char_entry = chars[e.character_id]
                if r == "squad_member":
                    fleet_structure["wings"][w]["squads"][s]["characters"].append(char_entry)
                elif r == "fleet_commander":
                    fleet_structure["commander"] = char_entry
                elif r == "wing_commander":
                    fleet_structure["wings"][w]["commander"] = char_entry
                elif r == "squad_commander":
                    fleet_structure["wings"][w]["squads"][s]["commander"] = char_entry

            for _, w in fleet_structure["wings"].items():
                w["squads"] = sorted(list(w["squads"].values()), key=lambda x: x["name"].lower())
            fleet_structure["wings"] = sorted(
                list(fleet_structure["wings"].values()), key=lambda x: x["name"].lower()
            )

            token_write = Token.get_token(fleet.boss.character_id, ["esi-fleets.write_fleet.v1"])
            fleet_structure["editable"] = True if token_write else False
            return fleet_structure
