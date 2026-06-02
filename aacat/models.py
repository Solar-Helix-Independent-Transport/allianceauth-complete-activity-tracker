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
    fc = models.ForeignKey(EveCharacter, on_delete=models.SET_NULL,
                           default=None, null=True, related_name="fleet_boss")

    start_time = models.DateTimeField()
    end_time = models.DateTimeField(blank=True, null=True)

    refresh_time = models.IntegerField(default=30)
    snapshots = models.JSONField(default=list)
    fleet_type = models.ForeignKey(
        FleetType, on_delete=models.SET_NULL, default=None, null=True, blank=True)

    name = models.CharField(max_length=200)
    after_action_report = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    motd = models.TextField(blank=True, null=True)

    last_update = models.DateTimeField(auto_now=True)

    class Meta:
        default_permissions = ()


