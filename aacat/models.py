import logging

from allianceauth.eveonline.models import EveCharacter
from django.contrib.auth.models import Group
from django.db import models
from solo.models import SingletonModel

logger = logging.getLogger(__name__)


class CATConfiguration(SingletonModel):
    monitor_groups = models.ManyToManyField(Group, blank=True)
    enable_monitoring_mode = models.BooleanField(default=False)

    def __str__(self):
        return "aaCAT Configuration"

    class Meta:
        verbose_name = "aaCAT Configuration"
        default_permissions = ()
        permissions = (
            ('monitor_us', 'CAT Fleet Auto Monitoring for ALL fleets run by these users'),
            ('create_fleets', 'Can Create new CAT Fleets'),
            ('view_fleets', 'Can View all active CAT Fleets'),
            ('edit_fleets', 'Can Edit all active CAT Fleets'),
            ('view_self', 'Can view own statistics'),
            ('view_corp', 'Can view own corp member statistics'),
            ('view_alli', 'Can view own alliance member statistics'),
            ('view_global', 'Can view all statistics'),
        )


class FleetType(models.Model):
    # TODO This needs a manager with access tests

    name = models.CharField(max_length=100)
    counts_in_statistics = models.BooleanField(default=True)

    allowable_fc_groups = models.ManyToManyField(Group, blank=True)

    class Meta:
        default_permissions = ()


class Fleet(models.Model):
    """
        A tracked fleet for the CAT module
    """
    # TODO This needs a manager with access tests

    eve_fleet_id = models.BigIntegerField()

    boss = models.ForeignKey(EveCharacter, on_delete=models.CASCADE)

    start_time = models.DateTimeField()
    end_time = models.DateTimeField(blank=True, null=True)

    events = models.IntegerField(default=0)
    refresh_time = models.IntegerField(default=10)
    fleet_type = models.ForeignKey(
        FleetType, on_delete=models.SET_NULL, default=None, null=True, blank=True)

    name = models.CharField(max_length=200)
    after_action_report = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    motd = models.TextField(blank=True, null=True)

    last_update = models.DateTimeField(auto_now=True)

    class Meta:
        default_permissions = ()


class ShipCategory(models.Model):
    """
    basic ship Cats
    """
    id = models.BigIntegerField(primary_key=True)
    name = models.CharField(max_length=150)

    class Meta:
        default_permissions = ()


class ShipType(models.Model):
    """
    basic ship types
    """
    id = models.BigIntegerField(primary_key=True)
    name = models.CharField(max_length=150)
    cat = models.ForeignKey(ShipCategory, null=True, on_delete=models.SET_NULL)

    class Meta:
        default_permissions = ()


class Region(models.Model):
    """
    basic Region
    """
    id = models.BigIntegerField(primary_key=True)
    name = models.CharField(max_length=150)

    class Meta:
        default_permissions = ()


class Constellation(models.Model):
    """
    basic Constellation
    """
    id = models.BigIntegerField(primary_key=True)
    name = models.CharField(max_length=150)
    region = models.ForeignKey(Region, null=True, on_delete=models.SET_NULL)

    class Meta:
        default_permissions = ()


class System(models.Model):
    """
    basic Solar System
    """
    id = models.BigIntegerField(primary_key=True)
    name = models.CharField(max_length=150)
    constellation = models.ForeignKey(
        Constellation, null=True, on_delete=models.SET_NULL)
    region = models.ForeignKey(Region, null=True, on_delete=models.SET_NULL)

    class Meta:
        default_permissions = ()


class FleetEvent(models.Model):
    """
        Records a snapshot in time of every person on fleet.
        under normal circumstances this would be every 10s
        can be used to aggregate rough time spent in a hull type
    """
    """
        TODO
        In UI: group these to main if available, and then show a list of ships they were in and a list of toons to minimize the list a bit
        In Statistics: time in ship amalgamated across a main. note that each fleet could be updated at different rates.

    """

    time = models.DateTimeField()
    fleet = models.ForeignKey(Fleet, on_delete=models.CASCADE)

    character_id = models.BigIntegerField()
    character_name = models.ForeignKey(
        EveCharacter, null=True, on_delete=models.SET_NULL)

    join_time = models.DateTimeField()

    ship_type_id = models.IntegerField()
    station_id = models.BigIntegerField(null=True, default=None)

    role = models.CharField(max_length=25)
    squad_id = models.BigIntegerField()
    wing_id = models.BigIntegerField(null=True, default=None)
    takes_fleet_warp = models.BooleanField(default=False)

    solar_system = models.ForeignKey(
        System, null=True, on_delete=models.SET_NULL)
    ship = models.ForeignKey(ShipType, on_delete=models.CASCADE)

    class Meta:
        default_permissions = ()
