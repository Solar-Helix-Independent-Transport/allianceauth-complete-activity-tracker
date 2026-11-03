from django.contrib import admin
from solo.admin import SingletonModelAdmin

from . import models

admin.site.register(models.Fleet)
admin.site.register(models.FleetType)


@admin.register(models.CATConfiguration)
class CATConfigurationAdmin(SingletonModelAdmin):
    filter_horizontal = ("monitor_groups",)
