from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from allianceauth.authentication.models import CharacterOwnership
from allianceauth.tests.auth_utils import AuthUtils
from allianceauth.utils.testing import NoSocketsTestCase
from django.contrib.auth.models import Group, Permission
from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from esi.exceptions import (
    ESIErrorLimitException, HTTPClientError, HTTPNotModified, HTTPServerError,
)
from esi.models import Scope, Token

from aacat.models import CATConfiguration, Fleet
from aacat.tasks import fleet_tasks

TASKS = "aacat.tasks.fleet_tasks"
BOSS_ID = 1001
ALT_ID = 1002
OUTSIDER_ID = 2001
NO_TOKEN_ID = 1003
FLEET_ID = 5000


def _add_character(user, name, character_id, token=True):
    """A character owned by the user, optionally with the tokens monitoring needs."""
    character = AuthUtils.add_main_character_2(
        user, name, character_id, disconnect_signals=True)
    CharacterOwnership.objects.create(
        user=user, character=character, owner_hash=f"hash{character_id}")
    if token:
        created = Token.objects.create(
            user=user,
            character_id=character_id,
            character_name=name,
            character_owner_hash=f"hash{character_id}",
            access_token="a",
            refresh_token="r",
        )
        created.scopes.set(Scope.objects.filter(name__in=fleet_tasks.MONITORING_SCOPES))
    return character


def _esi_returns(mock_esi, online=None, fleet=None):
    client = mock_esi.client
    if online is not None:
        client.Location.GetCharactersCharacterIdOnline.return_value.result.return_value = (
            SimpleNamespace(online=online))
    if fleet is not None:
        client.Fleets.GetCharactersCharacterIdFleet.return_value.result.return_value = (
            SimpleNamespace(fleet_id=FLEET_ID, fleet_boss_id=fleet))


def _esi_fleet_raises(mock_esi, error):
    mock_esi.client.Fleets.GetCharactersCharacterIdFleet.return_value.result.side_effect = error


# Keeps the cache.clear() below away from whatever redis the test settings point to.
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class FleetTaskTestCase(NoSocketsTestCase):
    def setUp(self):
        cache.clear()
        for name in fleet_tasks.MONITORING_SCOPES:
            Scope.objects.create(name=name, help_text=name)

        self.group = Group.objects.create(name="Monitored")
        self.config = CATConfiguration.get_solo()
        self.config.enable_monitoring_mode = True
        self.config.save()
        self.config.monitor_groups.add(self.group)

        self.member = AuthUtils.create_user("member", disconnect_signals=True)
        self.member.groups.add(self.group)
        self.boss = _add_character(self.member, "Boss", BOSS_ID)
        self.alt = _add_character(self.member, "Alt", ALT_ID)
        _add_character(self.member, "No Token", NO_TOKEN_ID, token=False)

        self.outsider = AuthUtils.create_user("outsider", disconnect_signals=True)
        _add_character(self.outsider, "Outsider", OUTSIDER_ID)

    def _fleet(self, boss=None, ended=False):
        return Fleet.objects.create(
            eve_fleet_id=FLEET_ID,
            boss=boss or self.boss,
            start_time=timezone.now(),
            end_time=timezone.now() if ended else None,
            name="Fleet",
        )


class TestMonitoredCharacters(FleetTaskTestCase):
    def test_includes_all_tokened_characters_of_group_members_only(self):
        self.assertEqual(fleet_tasks.get_monitored_character_ids(), [BOSS_ID, ALT_ID])

    def test_empty_when_monitoring_disabled(self):
        self.config.enable_monitoring_mode = False
        self.config.save()
        self.assertEqual(fleet_tasks.get_monitored_character_ids(), [])

    def test_empty_when_no_groups_selected(self):
        self.config.monitor_groups.clear()
        self.assertEqual(fleet_tasks.get_monitored_character_ids(), [])

    def test_needs_all_scopes(self):
        token = Token.objects.get(character_id=ALT_ID)
        token.scopes.remove(Scope.objects.get(name='esi-fleets.read_fleet.v1'))
        self.assertEqual(fleet_tasks.get_monitored_character_ids(), [BOSS_ID])

    def test_member_in_two_monitored_groups_is_not_duplicated(self):
        second = Group.objects.create(name="Second")
        self.config.monitor_groups.add(second)
        self.member.groups.add(second)
        self.assertEqual(fleet_tasks.get_monitored_character_ids(), [BOSS_ID, ALT_ID])


class TestMonitorUsRemoved(FleetTaskTestCase):
    def test_permission_is_gone(self):
        self.assertFalse(Permission.objects.filter(
            content_type__app_label="aacat", codename="monitor_us").exists())

    def test_superuser_outside_group_is_not_monitored(self):
        admin = AuthUtils.create_user("admin", disconnect_signals=True)
        admin.is_superuser = True
        admin.save()
        _add_character(admin, "Admin", 3001)
        self.assertNotIn(3001, fleet_tasks.get_monitored_character_ids())


class TestSlowTick(FleetTaskTestCase):
    @patch(f"{TASKS}.check_character_online.apply_async")
    def test_queues_online_check_spread_over_interval(self, mock_online):
        fleet_tasks.check_all_watched_characters()

        calls = {c.kwargs["args"][0]: c.kwargs["countdown"] for c in mock_online.call_args_list}
        self.assertEqual(calls, {BOSS_ID: BOSS_ID % 300, ALT_ID: ALT_ID % 300})


@patch(f"{TASKS}.check_character_fleet.delay")
@patch(f"{TASKS}.providers.esi")
class TestOnlineCheck(FleetTaskTestCase):
    def test_online_escalates_and_checks_fleet_straight_away(self, mock_esi, mock_fleet):
        _esi_returns(mock_esi, online=True)

        fleet_tasks.check_character_online(BOSS_ID)

        self.assertTrue(cache.get(fleet_tasks._online_cache_key(BOSS_ID)))
        mock_fleet.assert_called_once_with(BOSS_ID)

    def test_offline_clears_escalation(self, mock_esi, mock_fleet):
        cache.set(fleet_tasks._online_cache_key(BOSS_ID), True)
        _esi_returns(mock_esi, online=False)

        fleet_tasks.check_character_online(BOSS_ID)

        self.assertIsNone(cache.get(fleet_tasks._online_cache_key(BOSS_ID)))
        mock_fleet.assert_not_called()

    def test_escalation_outlives_check_interval(self, mock_esi, mock_fleet):
        _esi_returns(mock_esi, online=True)

        with patch(f"{TASKS}.cache.set") as mock_set:
            fleet_tasks.check_character_online(BOSS_ID)

        self.assertGreater(mock_set.call_args.kwargs["timeout"], 300)

    def test_missing_token_makes_no_call(self, mock_esi, mock_fleet):
        fleet_tasks.check_character_online(NO_TOKEN_ID)

        mock_esi.client.Location.GetCharactersCharacterIdOnline.assert_not_called()
        mock_fleet.assert_not_called()

    def test_esi_failure_keeps_existing_escalation(self, mock_esi, mock_fleet):
        cache.set(fleet_tasks._online_cache_key(BOSS_ID), True)
        mock_esi.client.Location.GetCharactersCharacterIdOnline.return_value.result.side_effect = (
            HTTPServerError(502, {}, None))

        fleet_tasks.check_character_online(BOSS_ID)

        self.assertTrue(cache.get(fleet_tasks._online_cache_key(BOSS_ID)))
        mock_fleet.assert_not_called()


@patch(f"{TASKS}.check_character_fleet.apply_async")
class TestFastTick(FleetTaskTestCase):
    def _queued(self, mock_fleet):
        return [c.kwargs["args"][0] for c in mock_fleet.call_args_list]

    def _set_online(self, *character_ids):
        for character_id in character_ids:
            cache.set(fleet_tasks._online_cache_key(character_id), True)

    def test_only_checks_online_characters(self, mock_fleet):
        self._set_online(ALT_ID)

        fleet_tasks.check_online_watched_fleets()

        self.assertEqual(self._queued(mock_fleet), [ALT_ID])

    def test_nobody_online_queues_nothing(self, mock_fleet):
        fleet_tasks.check_online_watched_fleets()

        mock_fleet.assert_not_called()

    def test_spreads_checks_over_the_minute(self, mock_fleet):
        self._set_online(BOSS_ID)

        fleet_tasks.check_online_watched_fleets()

        self.assertEqual(mock_fleet.call_args.kwargs["countdown"], BOSS_ID % 60)

    def test_skips_boss_of_active_tracked_fleet(self, mock_fleet):
        self._set_online(BOSS_ID, ALT_ID)
        self._fleet()

        fleet_tasks.check_online_watched_fleets()

        self.assertEqual(self._queued(mock_fleet), [ALT_ID])

    def test_checks_boss_of_closed_fleet_so_it_can_reopen(self, mock_fleet):
        self._set_online(BOSS_ID)
        self._fleet(ended=True)

        fleet_tasks.check_online_watched_fleets()

        self.assertEqual(self._queued(mock_fleet), [BOSS_ID])

    def test_removed_from_group_stops_even_with_live_escalation(self, mock_fleet):
        self._set_online(BOSS_ID)
        self.member.groups.remove(self.group)

        fleet_tasks.check_online_watched_fleets()

        mock_fleet.assert_not_called()

    def test_monitoring_disabled_stops_even_with_live_escalation(self, mock_fleet):
        self._set_online(BOSS_ID)
        self.config.enable_monitoring_mode = False
        self.config.save()

        fleet_tasks.check_online_watched_fleets()

        mock_fleet.assert_not_called()


@patch(f"{TASKS}.snapshot_fleet.apply_async")
@patch(f"{TASKS}.providers.esi")
class TestFleetCheck(FleetTaskTestCase):
    def test_not_in_fleet_is_a_quiet_exit(self, mock_esi, mock_snapshot):
        _esi_fleet_raises(mock_esi, HTTPClientError(404, {}, None))

        fleet_tasks.check_character_fleet(BOSS_ID)

        self.assertFalse(Fleet.objects.exists())
        mock_snapshot.assert_not_called()

    def test_other_client_errors_do_not_crash(self, mock_esi, mock_snapshot):
        _esi_fleet_raises(mock_esi, HTTPClientError(403, {}, None))

        fleet_tasks.check_character_fleet(BOSS_ID)

        self.assertFalse(Fleet.objects.exists())

    def test_error_limit_does_not_crash(self, mock_esi, mock_snapshot):
        _esi_fleet_raises(mock_esi, ESIErrorLimitException(reset=30))

        fleet_tasks.check_character_fleet(BOSS_ID)

        self.assertFalse(Fleet.objects.exists())

    def test_missing_token_makes_no_call(self, mock_esi, mock_snapshot):
        fleet_tasks.check_character_fleet(NO_TOKEN_ID)

        mock_esi.client.Fleets.GetCharactersCharacterIdFleet.assert_not_called()

    def test_ordinary_member_is_not_tracked(self, mock_esi, mock_snapshot):
        _esi_returns(mock_esi, fleet=OUTSIDER_ID)

        fleet_tasks.check_character_fleet(BOSS_ID)

        self.assertFalse(Fleet.objects.exists())
        mock_snapshot.assert_not_called()
        mock_esi.client.Fleets.GetFleetsFleetIdMembers.assert_not_called()

    def test_boss_creates_fleet_and_starts_snapshots(self, mock_esi, mock_snapshot):
        _esi_returns(mock_esi, fleet=BOSS_ID)

        fleet_tasks.check_character_fleet(BOSS_ID)

        fleet = Fleet.objects.get(eve_fleet_id=FLEET_ID)
        self.assertEqual(fleet.boss, self.boss)
        self.assertEqual(fleet.fc, self.boss)
        self.assertIsNone(fleet.end_time)
        self.assertEqual(mock_snapshot.call_args.kwargs["args"], [BOSS_ID, FLEET_ID])

    def test_already_tracked_fleet_does_not_start_a_second_loop(self, mock_esi, mock_snapshot):
        self._fleet()
        _esi_returns(mock_esi, fleet=BOSS_ID)

        fleet_tasks.check_character_fleet(BOSS_ID)

        self.assertEqual(Fleet.objects.count(), 1)
        mock_snapshot.assert_not_called()

    def test_closed_fleet_is_reopened_for_the_boss(self, mock_esi, mock_snapshot):
        fleet = self._fleet(ended=True)
        _esi_returns(mock_esi, fleet=BOSS_ID)

        fleet_tasks.check_character_fleet(BOSS_ID)

        fleet.refresh_from_db()
        self.assertIsNone(fleet.end_time)
        mock_snapshot.assert_called_once()

    def test_closed_fleet_stays_closed_for_a_non_boss(self, mock_esi, mock_snapshot):
        fleet = self._fleet(boss=self.alt, ended=True)
        _esi_returns(mock_esi, fleet=ALT_ID)

        fleet_tasks.check_character_fleet(BOSS_ID)

        fleet.refresh_from_db()
        self.assertIsNotNone(fleet.end_time)
        mock_snapshot.assert_not_called()

    def test_reopen_keeps_existing_snapshots(self, mock_esi, mock_snapshot):
        fleet = self._fleet(ended=True)
        fleet.snapshots = [{"time": "t", "members": []}]
        fleet.save()
        _esi_returns(mock_esi, fleet=BOSS_ID)

        fleet_tasks.check_character_fleet(BOSS_ID)

        fleet.refresh_from_db()
        self.assertEqual(len(fleet.snapshots), 1)

    def test_boss_handoff_moves_the_existing_row(self, mock_esi, mock_snapshot):
        fleet = self._fleet()
        _esi_returns(mock_esi, fleet=ALT_ID)

        fleet_tasks.check_character_fleet(ALT_ID)

        self.assertEqual(Fleet.objects.filter(eve_fleet_id=FLEET_ID).count(), 1)
        fleet.refresh_from_db()
        self.assertEqual(fleet.boss, self.alt)
        self.assertEqual(mock_snapshot.call_args.kwargs["args"], [ALT_ID, FLEET_ID])


@patch(f"{TASKS}.bootstrap_snapshot_fleet.apply_async")
@patch(f"{TASKS}.providers.esi")
class TestSnapshot(FleetTaskTestCase):
    @patch(f"{TASKS}.include_corptools_jumpbridges", return_value=[])
    @patch(f"{TASKS}.EveCharacter.objects.create_character")
    def test_members_link_to_their_character_rows(
        self, mock_create, _mock_bridges, mock_esi, mock_bootstrap
    ):
        new_character_id = 9001
        new_character_pk = 987654
        mock_create.return_value = SimpleNamespace(
            pk=new_character_pk, character_id=new_character_id)
        fleet = self._fleet()
        mock_esi.client.Fleets.GetFleetsFleetIdMembers.return_value.result.return_value = [
            SimpleNamespace(
                character_id=character_id,
                join_time="2026-01-01T00:00:00Z",
                ship_type_id=587,
                role="squad_member",
                squad_id=1,
                wing_id=1,
                takes_fleet_warp=True,
                solar_system_id=30000142,
            )
            for character_id in (BOSS_ID, new_character_id)
        ]

        fleet_tasks.snapshot_fleet(BOSS_ID, FLEET_ID)

        fleet.refresh_from_db()
        links = {
            m["character_id"]: m["character_name_id"]
            for m in fleet.snapshots[-1]["members"]
        }
        mock_create.assert_called_once_with(new_character_id)
        self.assertEqual(links, {BOSS_ID: self.boss.pk, new_character_id: new_character_pk})

    def test_previous_boss_loop_stops_after_handoff(self, mock_esi, mock_bootstrap):
        self._fleet(boss=self.alt)

        fleet_tasks.snapshot_fleet(BOSS_ID, FLEET_ID)

        mock_esi.client.Fleets.GetFleetsFleetIdMembers.assert_not_called()
        mock_bootstrap.assert_not_called()

    def test_unchanged_fleet_does_not_look_stale(self, mock_esi, mock_bootstrap):
        fleet = self._fleet()
        old = timezone.now() - timedelta(minutes=5)
        Fleet.objects.filter(pk=fleet.pk).update(last_update=old)
        mock_esi.client.Fleets.GetFleetsFleetIdMembers.return_value.result.side_effect = (
            HTTPNotModified(304, {}))

        fleet_tasks.snapshot_fleet(BOSS_ID, FLEET_ID)

        fleet.refresh_from_db()
        self.assertGreater(fleet.last_update, old)
        mock_bootstrap.assert_called_once()
