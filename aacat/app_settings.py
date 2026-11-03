from django.conf import settings

# How often check_all_watched_characters is scheduled to run, keep this the same as its crontab.
AACAT_ONLINE_CHECK_SECONDS = getattr(settings, "AACAT_ONLINE_CHECK_SECONDS", 300)
