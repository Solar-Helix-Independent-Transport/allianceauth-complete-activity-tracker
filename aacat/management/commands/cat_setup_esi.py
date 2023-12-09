from django.core.management.base import BaseCommand
from django_celery_beat.models import CrontabSchedule, PeriodicTask

from ...providers import esi


class Command(BaseCommand):
    help = 'Bootstrap the aaCAT Module from ESI (SLOW! Use if SDE out of date)'

    def handle(self, *args, **options):
        self.stdout.write("Loading models!")
        esi.load_map_sde()
