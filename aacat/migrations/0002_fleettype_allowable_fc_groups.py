# Generated by Django 4.0.10 on 2023-04-30 09:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('aacat', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='fleettype',
            name='allowable_fc_groups',
            field=models.ManyToManyField(blank=True, to='auth.group'),
        ),
    ]
