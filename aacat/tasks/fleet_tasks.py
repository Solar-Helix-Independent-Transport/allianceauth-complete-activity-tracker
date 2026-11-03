import json
import logging
import time
from datetime import timedelta

from allianceauth.authentication.models import CharacterOwnership
from allianceauth.eveonline.models import EveCharacter
from allianceauth.services.tasks import QueueOnce
from celery import shared_task
from celery_once import AlreadyQueued
from django.core.cache import cache
from django.utils import timezone
from esi.exceptions import (
    ESIBucketLimitException, ESIErrorLimitException, HTTPClientError,
    HTTPNotModified, HTTPServerError,
)
from esi.models import Token
from networkx import NetworkXNoPath
from routing.edges import include_corptools_jumpbridges
from routing.routing import route_length

from .. import app_settings, providers
from ..models import CATConfiguration, Fleet

logger = logging.getLogger(__name__)

MONITORING_SCOPES = ['esi-location.read_online.v1', 'esi-fleets.read_fleet.v1']

# Fleet lookups are cached by ESI for 60s, so spread each tick across that window.
FLEET_CHECK_SPREAD_SECONDS = 60

# Failures a polling task can safely ignore, as the next tick tries again.
ESI_POLLING_ERRORS = (
    HTTPServerError,
    OSError,
    ESIBucketLimitException,
    ESIErrorLimitException,
)


def _online_cache_key(character_id):
    return f"aacat:online:{character_id}"


def get_monitored_character_ids():
    """
        Every known character of every user in a monitored group, that has the tokens we need.
    """
    config = CATConfiguration.get_solo()
    if not config.enable_monitoring_mode:
        return []

    character_ids = CharacterOwnership.objects.filter(
        user__groups__in=config.monitor_groups.all()
    ).values_list("character__character_id", flat=True)

    return sorted(set(
        Token.objects.filter(
            character_id__in=character_ids
        ).require_scopes(MONITORING_SCOPES).values_list("character_id", flat=True)
    ))


@shared_task(bind=True, base=QueueOnce, max_retries=3)
def check_all_watched_characters(self):
    """
        Slow tick: find out who is online, spread evenly over the check interval.
    """
    interval = app_settings.AACAT_ONLINE_CHECK_SECONDS
    for character_id in get_monitored_character_ids():
        check_character_online.apply_async(
            args=[character_id],
            countdown=character_id % interval,
        )


@shared_task(bind=True, base=QueueOnce, max_retries=3)
def check_online_watched_fleets(self):
    """
        Fast tick: check for new fleets, only on characters last seen online.
    """
    character_ids = get_monitored_character_ids()
    online = cache.get_many([_online_cache_key(c) for c in character_ids])
    tracked_bosses = set(
        Fleet.objects.filter(
            end_time__isnull=True,
            boss__character_id__in=character_ids,
        ).values_list("boss__character_id", flat=True)
    )
    for character_id in character_ids:
        if _online_cache_key(character_id) in online and character_id not in tracked_bosses:
            check_character_fleet.apply_async(
                args=[character_id],
                countdown=character_id % FLEET_CHECK_SPREAD_SECONDS,
            )


@shared_task(bind=True, base=QueueOnce, max_retries=3)
def check_character_online(self, character_id):
    token = Token.get_token(character_id, ['esi-location.read_online.v1'])
    if not token:
        logger.warning(f"No online token for {character_id}, skipping")
        cache.delete(_online_cache_key(character_id))
        return

    try:
        online_status = providers.esi.client.Location.GetCharactersCharacterIdOnline(
            character_id=character_id,
            token=token
        ).result(use_etag=False)
    except (HTTPClientError, *ESI_POLLING_ERRORS) as e:
        logger.warning(f"Online check failed for {token.character_name}: {e.__class__.__name__} {e}")
        return

    if online_status.online:
        logger.debug(f"{token.character_name} is online")
        cache.set(
            _online_cache_key(character_id),
            True,
            # Must outlive the gap between checks, or the character drops out of the fast tick.
            timeout=app_settings.AACAT_ONLINE_CHECK_SECONDS + 120,
        )
        check_character_fleet.delay(character_id)
    else:
        logger.debug(f"{token.character_name} is offline")
        cache.delete(_online_cache_key(character_id))


@shared_task(bind=True, base=QueueOnce, max_retries=3)
def check_character_fleet(self, character_id):
    token = Token.get_token(character_id, ['esi-fleets.read_fleet.v1'])
    if not token:
        logger.warning(f"No fleet token for {character_id}, skipping")
        return

    try:
        fleet_details = providers.esi.client.Fleets.GetCharactersCharacterIdFleet(
            character_id=character_id,
            token=token
        ).result(use_etag=False)
    except HTTPClientError as e:
        if e.status_code == 404:
            logger.debug(f"{token.character_name} is not in a fleet")
        else:
            logger.error(f"HTTPClientError {e.status_code} checking fleet of {token.character_name}")
        return
    except ESI_POLLING_ERRORS as e:
        logger.warning(f"Fleet check failed for {token.character_name}: {e.__class__.__name__} {e}")
        return

    if fleet_details.fleet_boss_id != character_id:
        logger.debug(f"{token.character_name} is not the boss of fleet {fleet_details.fleet_id}")
        return

    char = EveCharacter.objects.get(character_id=character_id)
    # A fleet is one row for its whole life, even when boss is passed to someone else.
    fleet = Fleet.objects.filter(
        eve_fleet_id=fleet_details.fleet_id).order_by("-pk").first()

    if fleet is None:
        logger.info(f"Tracking new fleet {fleet_details.fleet_id} for {token.character_name}")
        Fleet.objects.create(
            boss=char,
            eve_fleet_id=fleet_details.fleet_id,
            start_time=timezone.now(),
            name=f"{char}'s Fleet",
            fc=char,
        )
    elif fleet.boss_id == char.pk and not fleet.end_time:
        # Starting another snapshot here could leave two loops on one fleet.
        # A stalled loop is recovered by bootstrap_stale_fleets.
        logger.debug(f"Fleet {fleet_details.fleet_id} is already tracked")
        return
    else:
        logger.info(f"Resuming fleet {fleet_details.fleet_id} for {token.character_name}")
        fleet.boss = char
        fleet.end_time = None
        fleet.save(update_fields=["boss", "end_time", "last_update"])

    snapshot_fleet.apply_async(
        args=[
            character_id,
            fleet_details.fleet_id
        ],
        priority=1
    )


@shared_task(bind=True)
def bootstrap_snapshot_fleet(self, character_id, fleet_id):
    try:
        snapshot_fleet.apply_async(args=[character_id,
                                         fleet_id],
                                   once={'graceful': False},
                                   countdown=4,
                                   priority=1)
        logger.info(f"Bootstrapping Task for fleet {fleet_id}, {character_id}")
    except AlreadyQueued:
        logger.info(
            f"Task already Queued, is your Queue overloaded? fleet Task for {fleet_id} fleet {character_id}")
        self.retry()


@shared_task(bind=True, base=QueueOnce, max_retries=4, retry_backoff=15)
def snapshot_fleet(self, character_id, fleet_id):
    _timer = [time.perf_counter()]
    token = Token.get_token(character_id, ['esi-fleets.read_fleet.v1'])
    try:
        fleet = Fleet.objects.get(
            boss__character_id=character_id, eve_fleet_id=fleet_id)
    except Fleet.DoesNotExist:
        # Boss was handed over, the new boss has their own snapshot loop.
        logger.info(f"{character_id} is no longer boss of fleet {fleet_id}, stopping")
        return

    _timer.append(f"1: {time.perf_counter()-_timer[0]}")

    if fleet.end_time:
        logger.info(f"Stopping tracking of fleet {fleet_id}")
        return

    logger.info(f"Starting snap-shotting fleet {fleet_id}, {character_id}")

    try:
        fleet_characters = providers.esi.client.Fleets.GetFleetsFleetIdMembers(
            fleet_id=fleet_id,
            token=token
        ).result()
        _timer.append(f"2: {time.perf_counter()-_timer[0]}")

        current_time = timezone.now()

        char_ids = set()
        type_ids = set()
        fc_system_id = 0

        for f in fleet_characters:
            char_ids.add(f.character_id)
            type_ids.add(f.ship_type_id)
            if fleet.fc:
                if f.character_id == fleet.fc.character_id:
                    fc_system_id = f.solar_system_id

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
            chars[c.character_id] = c.pk
        _timer.append(f"5: {time.perf_counter()-_timer[0]}")

        extra_edges = []
        try:
            extra_edges += include_corptools_jumpbridges()
        except Exception as e:
            logger.warning(
                "Failed to pull JB's from corptools")
            logger.warning("NO JBS", exc_info=True)

        snapshot_members = []
        for c in fleet_characters:
            if fc_system_id:
                if c.solar_system_id not in system_distances:
                    try:
                        _1 = time.perf_counter()
                        rl = route_length(fc_system_id, c.solar_system_id,
                                          edges=extra_edges,
                                          static_cache=True)
                        _timer.append(
                            f"6 {fc_system_id}>{c.solar_system_id} - {rl}: {time.perf_counter()-_1}")
                    except NetworkXNoPath:
                        rl = -1
                    system_distances[c.solar_system_id] = rl

            try:
                snapshot_members.append({
                    "character_id": c.character_id,
                    "character_name_id": chars.get(c.character_id),
                    "join_time": str(c.join_time),
                    "ship_type_id": c.ship_type_id,
                    "role": c.role,
                    "squad_id": c.squad_id,
                    "wing_id": c.wing_id,
                    "takes_fleet_warp": c.takes_fleet_warp,
                    "solar_system_id": c.solar_system_id,
                    "distance_from_fc": system_distances.get(c.solar_system_id, -2),
                })
            except Exception:
                pass
        _timer.append(f"7: {time.perf_counter()-_timer[0]}")

        snapshot = {"time": current_time.isoformat(), "members": snapshot_members}
        logger.info(f"Appending snapshot of {len(snapshot_members)} members for fleet {fleet_id}")
        fleet.snapshots = list(fleet.snapshots) + [snapshot]
        fleet.save()
    except HTTPNotModified:
        logger.debug(f"No fleet changes (304) for {fleet_id}, skipping snapshot")
        # The loop is healthy, so don't let a quiet fleet look stale to bootstrap_stale_fleets.
        fleet.save(update_fields=["last_update"])
    except HTTPClientError as e:
        if e.status_code == 404:
            logger.info(f"Fleet {fleet_id} not found (404), closing.")
            fleet.end_time = timezone.now()
            fleet.save()
            return
        logger.error(f"HTTPClientError {e.status_code} {token.character_name} {fleet_id}")
        logger.error(e)
    except (HTTPServerError, OSError) as e:
        logger.error(f"{e.__class__.__name__} {token.character_name} {fleet_id}")
        logger.error(e)

    # except Exception as e:
    #     logger.error(f"{e.__class__.__name__} {character_id} {fleet_id} ")
    #     logger.error(e, stack_info=True)
    #     # TODO check for retry amount and close fleet on hard errors?
    _timer.append(f"8: {time.perf_counter()-_timer[0]}")
    bootstrap_snapshot_fleet.apply_async(
        args=[character_id,
              fleet_id],
        # highly threaded we need a small delay to finish this task...
        countdown=1,
        priority=1
    )
    logger.info(f"Completed, snap-shotting fleet {fleet_id}, {character_id}")
    logger.info(f"Timing Data: {json.dumps(_timer, indent=4)}")


@shared_task(bind=True, base=QueueOnce)
def bootstrap_stale_fleets(self):
    look_back = timezone.now() - timedelta(seconds=30)  # 30s min staleness

    fleets = Fleet.objects.filter(
        end_time__isnull=True, last_update__lte=look_back)
    for f in fleets:
        try:
            snapshot_fleet.apply_async(args=[f.boss.character_id,
                                             f.eve_fleet_id],
                                       countdown=9,
                                       once={'graceful': False},
                                       priority=1)
            logger.info(
                f"Bootstrapping Stale fleet Task for {f.eve_fleet_id} fleet {f.boss.character_name}")
        except AlreadyQueued:
            logger.info(
                f"Task already Queued, is your Queue overloaded? fleet Task for {f.eve_fleet_id} fleet {f.boss.character_name}")
