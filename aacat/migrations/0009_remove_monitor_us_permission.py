from django.db import migrations


def delete_monitor_us_permission(apps, schema_editor):
    # Django never removes the Permission row itself, so it would stay assignable but do nothing.
    Permission = apps.get_model("auth", "Permission")
    Permission.objects.filter(
        content_type__app_label="aacat",
        codename="monitor_us",
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("aacat", "0008_alter_fleet_refresh_time"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="catconfiguration",
            options={
                "default_permissions": (),
                "permissions": (
                    ("create_fleets", "Can Create new CAT Fleets"),
                    ("view_fleets", "Can View all active CAT Fleets"),
                    ("edit_fleets", "Can Edit all active CAT Fleets"),
                    ("view_self", "Can view own statistics"),
                    ("view_corp", "Can view own corp member statistics"),
                    ("view_alli", "Can view own alliance member statistics"),
                    ("view_global", "Can view all statistics"),
                ),
                "verbose_name": "aaCAT Configuration",
            },
        ),
        migrations.RunPython(delete_monitor_us_permission, migrations.RunPython.noop),
    ]
