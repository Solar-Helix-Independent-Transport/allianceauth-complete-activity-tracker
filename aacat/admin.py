from django.contrib import admin

from . import models

admin.site.register(models.Fleet)


@admin.register(models.FleetEvent)
class FleetEventAdmin(admin.ModelAdmin):
    list_display = ['time', 'get_fleet',
                    'character_name', 'get_ship', 'get_system']

    def get_ship(self, obj):
        return obj.ship.name

    def get_fleet(self, obj):
        return obj.fleet.name

    def get_system(self, obj):
        if obj.solar_system:
            return obj.solar_system.name
        else:
            return "Unknown"

    def get_queryset(self, request):
        return super(FleetEventAdmin, self).get_queryset(request).select_related('ship', 'fleet', 'character_name')


admin.site.register(models.FleetType)
