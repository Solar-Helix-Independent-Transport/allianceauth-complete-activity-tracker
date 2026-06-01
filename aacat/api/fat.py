import datetime
import logging

from allianceauth.eveonline.models import EveCharacter
from django.utils import timezone
from django.utils.crypto import get_random_string
from eve_sde.models import ItemType, SolarSystem as SDESolarSystem

from .. import models, schema

logger = logging.getLogger(__name__)


class FatEndpoints():
    def __init__(self, api) -> None:
        @api.post(
            "/fleets/{fleet_id}/fat",
            response={200: str, **schema.error_responses},
            tags=["Fats"]
        )
        def post_fat_fleet(
            request,
            fleet_id: int,
            date_time: datetime.datetime = None,
            link_Type: int = None
        ):
            """
                Create a fat from current snapshot of a fleet.
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            if not fleet.snapshots:
                return 401, "No snapshots available for this fleet."

            if not date_time:
                date_time = timezone.now()

            # Find the latest snapshot at or before date_time
            valid = [
                s for s in fleet.snapshots
                if datetime.datetime.fromisoformat(s["time"]) <= date_time
            ]
            if not valid:
                return 401, "Invalid time try again! Must be within 5 minutes of a valid event during the fleet."

            closest = max(valid, key=lambda s: s["time"])
            snap_time = datetime.datetime.fromisoformat(closest["time"])
            if snap_time < date_time - datetime.timedelta(minutes=5):
                return 401, "Invalid time try again! Must be within 5 minutes of a valid event during the fleet."

            members = closest["members"]

            # Bulk look up names
            char_name_ids = [m["character_name_id"] for m in members if m.get("character_name_id")]
            ship_type_ids = {m["ship_type_id"] for m in members if m.get("ship_type_id")}
            solar_system_ids = {m["solar_system_id"] for m in members if m.get("solar_system_id")}

            chars = {c.pk: c for c in EveCharacter.objects.filter(pk__in=char_name_ids)}
            ships = {t.id: t for t in ItemType.objects.filter(id__in=ship_type_ids)}
            systems = {s.id: s for s in SDESolarSystem.objects.filter(id__in=solar_system_ids)}

            from afat.models import Fat, FatLink

            fl = FatLink.objects.create(
                fleet=f"[AUTO] - {fleet.name}",
                creator=request.user,
                character=fleet.boss,
                link_type_id=link_Type,
                is_esilink=True,
                is_registered_on_esi=False,
                esi_fleet_id=fleet.eve_fleet_id,
                created=date_time,
                hash=get_random_string(length=30)
            )

            for m in members:
                char = chars.get(m.get("character_name_id"))
                ship = ships.get(m.get("ship_type_id"))
                system = systems.get(m.get("solar_system_id"))
                Fat.objects.create(
                    fatlink=fl,
                    character=char,
                    system=system.name if system else str(m.get("solar_system_id", "Unknown")),
                    shiptype=ship.name if ship else f"Unknown ({m.get('ship_type_id')})",
                )

            return 200, "Created a populated aFat Link!"
