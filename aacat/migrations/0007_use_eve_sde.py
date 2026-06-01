from collections import defaultdict
from datetime import datetime

from django.db import migrations, models


def migrate_fleet_events_to_snapshots(apps, _schema_editor):
    Fleet = apps.get_model('aacat', 'Fleet')
    FleetEvent = apps.get_model('aacat', 'FleetEvent')

    for fleet in Fleet.objects.all():
        time_groups = defaultdict(list)

        for event in FleetEvent.objects.filter(fleet=fleet).order_by('time'):
            time_groups[event.time.isoformat()].append({
                "character_id": event.character_id,
                "character_name_id": event.character_name_id,
                "join_time": event.join_time.isoformat() if event.join_time else None,
                "ship_type_id": event.ship_type_id,
                "role": event.role,
                "squad_id": event.squad_id,
                "wing_id": event.wing_id,
                "takes_fleet_warp": event.takes_fleet_warp,
                "solar_system_id": event.solar_system_id,
                "distance_from_fc": event.distance_from_fc,
            })

        fleet.snapshots = [
            {"time": time_str, "members": members}
            for time_str, members in sorted(time_groups.items())
        ]
        fleet.save()


def reverse_migrate_snapshots_to_fleet_events(apps, _schema_editor):
    Fleet = apps.get_model('aacat', 'Fleet')
    FleetEvent = apps.get_model('aacat', 'FleetEvent')
    ShipType = apps.get_model('aacat', 'ShipType')

    ItemType = apps.get_model('eve_sde', 'ItemType')

    # The old ship FK was non-nullable — recreate aacat.ShipType records from
    # eve_sde.ItemType so FK constraints are satisfied with real names.
    all_type_ids = {
        m['ship_type_id']
        for fleet in Fleet.objects.all()
        for snap in fleet.snapshots
        for m in snap['members']
        if m.get('ship_type_id')
    }
    sde_names = {
        t.id: t.name
        for t in ItemType.objects.filter(id__in=all_type_ids)
    }
    ShipType.objects.bulk_create(
        [ShipType(id=tid, name=sde_names.get(tid, f'Unknown ({tid})')) for tid in all_type_ids],
        ignore_conflicts=True,
        batch_size=1000,
    )

    # Rebuild FleetEvent rows and restore the events counter.
    new_events = []
    fleets_to_update = []

    for fleet in Fleet.objects.all():
        for snap in fleet.snapshots:
            try:
                snap_time = datetime.fromisoformat(snap['time'])
            except (ValueError, TypeError):
                continue

            for m in snap['members']:
                try:
                    join_time = datetime.fromisoformat(m['join_time']) if m.get('join_time') else snap_time
                except (ValueError, TypeError):
                    join_time = snap_time

                new_events.append(FleetEvent(
                    fleet=fleet,
                    time=snap_time,
                    character_id=m['character_id'],
                    character_name_id=m.get('character_name_id'),
                    join_time=join_time,
                    ship_type_id=m.get('ship_type_id', 0),
                    ship_id=m.get('ship_type_id'),
                    role=m.get('role', ''),
                    squad_id=m.get('squad_id', 0),
                    wing_id=m.get('wing_id'),
                    takes_fleet_warp=m.get('takes_fleet_warp', False),
                    solar_system_id=None,  # System table is empty after reversal
                    distance_from_fc=m.get('distance_from_fc', -2),
                ))

        fleet.events = len(fleet.snapshots)
        fleets_to_update.append(fleet)

    FleetEvent.objects.bulk_create(new_events, batch_size=1000)
    Fleet.objects.bulk_update(fleets_to_update, ['events'], batch_size=100)


class Migration(migrations.Migration):

    dependencies = [
        ('aacat', '0006_alter_fleetevent_distance_from_fc'),
        ('eve_sde', '0001_initial'),
    ]

    operations = [
        # Add the new snapshots field to Fleet
        migrations.AddField(
            model_name='fleet',
            name='snapshots',
            field=models.JSONField(default=list),
        ),
        # Copy FleetEvent rows → Fleet.snapshots grouped by time
        migrations.RunPython(
            migrate_fleet_events_to_snapshots,
            reverse_code=reverse_migrate_snapshots_to_fleet_events,
        ),
        # Remove the old per-event count field
        migrations.RemoveField(
            model_name='fleet',
            name='events',
        ),
        # Drop FleetEvent — data is now in Fleet.snapshots
        migrations.DeleteModel(name='FleetEvent'),
        # Drop internal SDE models replaced by django-eve-sde
        migrations.DeleteModel(name='System'),
        migrations.DeleteModel(name='Constellation'),
        migrations.DeleteModel(name='Region'),
        migrations.DeleteModel(name='ShipType'),
        migrations.DeleteModel(name='ShipCategory'),
    ]
