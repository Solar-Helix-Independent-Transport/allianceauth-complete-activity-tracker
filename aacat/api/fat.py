import datetime
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
from django.utils.crypto import get_random_string
from esi.models import Token
from ninja import Field, NinjaAPI
from ninja.security import django_auth

from aacat.tasks.fleet_tasks import check_character_online, snapshot_fleet

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
                Create a fat from current snapshot of a fleet. this can happen in the future
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)

            if not date_time:
                date_time = timezone.now()

            max_date = models.FleetEvent.objects.filter(
                fleet=fleet, time__lte=date_time).aggregate(max_date=Max("time"))["max_date"]

            if not max_date or max_date < date_time - datetime.timedelta(minutes=5):
                return 401, "Invalid time try again! Must be within 5 minutes of a valid event during the fleet."

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

            for c in models.FleetEvent.objects.filter(fleet=fleet, time=max_date):
                Fat.objects.create(
                    fatlink=fl,
                    character=c.character_name,
                    system=c.solar_system.name,
                    shiptype=c.ship.name,
                )

            return 200, "Created a populated aFat Link!"
