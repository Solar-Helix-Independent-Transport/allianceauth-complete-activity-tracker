import json
import logging
import time
from datetime import timedelta

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
from networkx import NetworkXNoPath
from routing.routing import route_length

from .. import providers
from ..models import Fleet, FleetEvent, ShipCategory, ShipType

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
                                                      "name": f"{char}'s Fleet",
                                                      "fc": char})

        snapshot_fleet.apply_async(args=[character_id,
                                         fleet_details.get('fleet_id')],
                                   priority=1)

    except Exception as e:
        logger.error(e, stack_info=True)
        logger.error(f"I'm not in a fleet or i am not the boss.")


@shared_task(bind=True)
def bootstrap_snapshot_fleet(self, character_id, fleet_id):
    snapshot_fleet.apply_async(args=[character_id,
                                     fleet_id],
                               once={'graceful': False},
                               countdown=9.5,
                               priority=1)
    logger.info(f"Bootstrapping Task for fleet {fleet_id}, {character_id}")


@shared_task(bind=True, base=QueueOnce, max_retries=4, retry_backoff=15)
def snapshot_fleet(self, character_id, fleet_id):
    _timer = [time.perf_counter()]
    token = Token.get_token(character_id, ['esi-fleets.read_fleet.v1'])
    fleet = Fleet.objects.get(
        boss__character_id=character_id, eve_fleet_id=fleet_id)

    _timer.append(f"1: {time.perf_counter()-_timer[0]}")

    if fleet.end_time:
        logger.info(f"Stopping tracking of fleet {fleet_id}")
        return

    logger.info(f"Starting snap-shotting fleet {fleet_id}, {character_id}")

    try:
        fleet_characters = providers.esi.client.Fleets.get_fleets_fleet_id_members(fleet_id=fleet_id,
                                                                                   token=token.valid_access_token()).result()
        _timer.append(f"2: {time.perf_counter()-_timer[0]}")

        new_events = []

        current_time = timezone.now()

        char_ids = set()
        type_ids = set()
        fc_system_id = 0

        for f in fleet_characters:
            char_ids.add(f['character_id'])
            type_ids.add(f['ship_type_id'])
            if fleet.fc:
                if f['character_id'] == fleet.fc.character_id:
                    fc_system_id = f['solar_system_id']

        _timer.append(f"3: {time.perf_counter()-_timer[0]}")

        system_distances = {}
        chars = {}

        for c in EveCharacter.objects.filter(character_id__in=list(char_ids)).values("character_id", "pk"):
            chars[c['character_id']] = c['pk']
            char_ids.discard(c['character_id'])
        _timer.append(f"4: {time.perf_counter()-_timer[0]}")
        for cid in char_ids:
            logger.info(f"Creating new character {cid}")
            c = EveCharacter.objects.create_character(cid)
            chars[c.pk] = c.character_id
        _timer.append(f"5: {time.perf_counter()-_timer[0]}")
        for c in ShipType.objects.filter(id__in=list(type_ids)).values("id"):
            type_ids.discard(c['id'])
        _timer.append(f"6: {time.perf_counter()-_timer[0]}")
        for id in type_ids:
            ShipType.objects.create(id=id, name=f"Unknown({id})", cat=None)
        _timer.append(f"7: {time.perf_counter()-_timer[0]}")

        for c in fleet_characters:
            if fc_system_id:
                if c.get('solar_system_id') not in system_distances:
                    try:
                        _1 = time.perf_counter()
                        rl = route_length(fc_system_id, c.get(
                            'solar_system_id'), static_cache=True)
                        _timer.append(
                            f"8 {fc_system_id}>{c.get('solar_system_id')} - {rl}: {time.perf_counter()-_1}")
                    except NetworkXNoPath:
                        rl = -1
                    system_distances[c.get('solar_system_id')] = rl

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
                                   solar_system_id=c.get('solar_system_id'),
                                   distance_from_fc=system_distances.get(
                                       c.get('solar_system_id'), -2)
                                   )

                new_events.append(_evnt)
            except:
                pass
        _timer.append(f"9: {time.perf_counter()-_timer[0]}")

        logger.info(f"Creating {len(new_events)} DB Entries for {fleet_id}")
        FleetEvent.objects.bulk_create(new_events)
        _timer.append(f"9: {time.perf_counter()-_timer[0]}")

        fleet.events += 1
        fleet.save()
    except HTTPNotFound as e:
        logger.info(
            f"HTTPNotFound, {token.character_name} {fleet_id}. Closing Fleet!")
        # TODO do we want to retry this a few times?
        # are we not the boss any more? did we DC? i cant think of more ATM...
        fleet.end_time = timezone.now()
        fleet.save()
        return
    except (HTTPBadGateway, HTTPGatewayTimeout, HTTPServiceUnavailable, OSError) as e:
        logger.error(
            f"{e.__class__.__name__} {token.character_name} {fleet_id} ")
        logger.error(e)
        # TODO check for retry amount and close fleet on errors?

    except Exception as e:
        logger.error(f"{e.__class__.__name__} {character_id} {fleet_id} ")
        logger.error(e, stack_info=True)
        # TODO check for retry amount and close fleet on hard errors?
    _timer.append(f"10: {time.perf_counter()-_timer[0]}")
    bootstrap_snapshot_fleet.apply_async(args=[character_id,
                                               fleet_id],
                                         # highly threaded we need a small delay to finish this task...
                                         countdown=0.5,
                                         priority=1)
    logger.info(f"Completed, snap-shotting fleet {fleet_id}, {character_id}")
    logger.info(f"Timing Data: {json.dumps(_timer, indent=4)}")


@shared_task(bind=True, base=QueueOnce)
def bootstrap_stale_fleets(self):
    look_back = timezone.now() - timedelta(seconds=60)  # 1 min staleness

    fleets = Fleet.objects.filter(
        end_time__isnull=True, last_update__lte=look_back)
    for f in fleets:
        snapshot_fleet.apply_async(args=[f.boss.character_id,
                                         f.eve_fleet_id],
                                   countdown=9,
                                   priority=1)
        logger.info(
            f"Bootstrapping Stale fleet Task for {f.eve_fleet_id} fleet {f.boss.character_name}")
