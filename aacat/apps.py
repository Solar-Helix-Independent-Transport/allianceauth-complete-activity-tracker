from django.apps import AppConfig

from . import __version__


class CATConfig(AppConfig):
    name = 'aacat'
    label = 'aacat'

    verbose_name = f"Complete Activity Tracking v{__version__}"
