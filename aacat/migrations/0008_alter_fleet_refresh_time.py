from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('aacat', '0007_use_eve_sde'),
    ]

    operations = [
        migrations.AlterField(
            model_name='fleet',
            name='refresh_time',
            field=models.IntegerField(default=30),
        ),
    ]
