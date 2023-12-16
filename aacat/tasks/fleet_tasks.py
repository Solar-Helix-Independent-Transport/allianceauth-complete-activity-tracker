import logging

from allianceauth.eveonline.models import EveCharacter
from allianceauth.services.tasks import QueueOnce
from bravado.exception import (HTTPBadGateway, HTTPGatewayTimeout,
                               HTTPNotFound, HTTPServiceUnavailable)
from celery import shared_task
from django.contrib.auth.models import Permission, User
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from esi.models import Token

from .. import providers
from ..models import Fleet, FleetEvent

logger = logging.getLogger(__name__)


def get_permission_object(permission_str):
    app_label, codename = permission_str.split('.')
    return Permission.objects.filter(content_type__app_label=app_label, codename=codename).first()


def get_users_with_permission(permission_str, include_su=True):
    permission_obj = get_permission_object(permission_str)
    q = Q(groups__permissions=permission_obj) | Q(
        user_permissions=permission_obj)
    if include_su:
        q |= Q(is_superuser=True)
    return User.objects.filter(q).distinct()


@shared_task(bind=True, base=QueueOnce, max_retries=3)
def check_all_watched_characters(self):
    users = get_users_with_permission("aacat.monitor_us")
    for u in users:
        for c in u.character_ownerships.all():
            check_character_online.delay(character_id=c.character.character_id)


@shared_task(bind=True, base=QueueOnce, max_retries=3)
def check_character_online(self, character_id):
    token = Token.get_token(character_id, ['esi-location.read_online.v1'])
    online_status = providers.esi.client.Location.get_characters_character_id_online(character_id=character_id,
                                                                                     token=token.valid_access_token()).result()
    if online_status.get('online', False):
        logger.info(F"HEY!!!! I'm online! {token.character_name}")
        check_character_fleet.delay(character_id)
    else:
        logger.info(F"OFFLINE! {token.character_name}")


@shared_task(bind=True, base=QueueOnce, max_retries=3)
def check_character_fleet(self, character_id):
    token = Token.get_token(character_id, ['esi-fleets.read_fleet.v1'])
    logger.info(F"{token.character_name} checking fleets")

    try:
        fleet_details = providers.esi.client.Fleets.get_characters_character_id_fleet(character_id=character_id,
                                                                                      token=token.valid_access_token()).result()
        logger.info(
            f"{token.character_name} in the the fleet {fleet_details.get('fleet_id')}")

        fleet_characters = providers.esi.client.Fleets.get_fleets_fleet_id_members(fleet_id=fleet_details.get('fleet_id'),
                                                                                   token=token.valid_access_token()).result()

        logger.info(
            f"{token.character_name} the boss of the fleet {fleet_details.get('fleet_id')}")

        char = EveCharacter.objects.get(character_id=character_id)
        fleet = Fleet.objects.get_or_create(boss=char,
                                            eve_fleet_id=fleet_details.get(
                                                'fleet_id'),
                                            defaults={'start_time': timezone.now(),
                                                      "name": f"{char}'s Fleet"})

        snapshot_fleet.apply_async(args=[character_id,
                                         fleet_details.get('fleet_id')],
                                   priority=3)
    except Exception as e:
        logger.error(e, stack_info=True)
        logger.error(f"I'm not in a fleet or i am not the boss.")


@shared_task(bind=True)
def bootstrap_snapshot_fleet(self, character_id, fleet_id):
    snapshot_fleet.apply_async(args=[character_id,
                                     fleet_id],
                               countdown=9,
                               priority=1)
    logger.info(f"Sent Task for fleet {fleet_id}, {character_id}")


@shared_task(bind=True, base=QueueOnce, max_retries=8, retry_backoff=15)
def snapshot_fleet(self, character_id, fleet_id):
    token = Token.get_token(character_id, ['esi-fleets.read_fleet.v1'])
    fleet = Fleet.objects.get(
        boss__character_id=character_id, eve_fleet_id=fleet_id)
    logger.info(f"snap-shotting fleet {fleet_id}, {character_id}")

    try:
        fleet_characters = providers.esi.client.Fleets.get_fleets_fleet_id_members(fleet_id=fleet_id,
                                                                                   token=token.valid_access_token()).result()
        new_events = []
        types = []
        names = []
        locations = []

        current_time = timezone.now()

        char_ids = set([f['character_id'] for f in fleet_characters])

        chars = {}

        for c in EveCharacter.objects.filter(character_id__in=list(char_ids)).values("character_id", "pk"):
            chars[c['character_id']] = c['pk']
            char_ids.discard(c['character_id'])

        for cid in char_ids:
            c = EveCharacter.objects.create_character(cid)
            chars[c.pk] = c.character_id

        for c in fleet_characters:
            types.append(c.get('ship_type_id'))

            try:
                _evnt = FleetEvent(time=current_time,
                                   fleet=fleet,
                                   character_id=c.get('character_id'),
                                   character_name_id=chars[c.get(
                                       'character_id')],
                                   join_time=c.get('join_time'),
                                   ship_id=c.get('ship_type_id'),
                                   ship_type_id=c.get('ship_type_id'),
                                   role=c.get('role'),
                                   squad_id=c.get('squad_id'),
                                   wing_id=c.get('wing_id', None),
                                   takes_fleet_warp=c.get('takes_fleet_warp'),
                                   solar_system_id=c.get('solar_system_id')
                                   )

                new_events.append(_evnt)
            except:
                pass
        logger.info(f"Creating DB Entries for {fleet_id}")
        FleetEvent.objects.bulk_create(new_events)
        fleet.events += 1
        fleet.save()
        bootstrap_snapshot_fleet.apply_async(args=[character_id,
                                                   fleet_id],
                                             # highly threaded we need a delay to finish this task...
                                             countdown=1,
                                             priority=1)
    except (HTTPBadGateway, HTTPGatewayTimeout, HTTPServiceUnavailable, OSError) as e:
        logger.error(e)
        self.retry()
    except HTTPNotFound as e:
        logger.error(e)
        # TODO do we want to retry this a few times?
        # are we not the boss any more? did we DC? i cant think of more ATM...

        fleet.end_time = timezone.now()
        fleet.save()
