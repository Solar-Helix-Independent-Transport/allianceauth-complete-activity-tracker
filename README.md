# Complete Activity Tracker

FATs and PAPs are sooooo 2020, yes i can do memes too! CATs are here to stay.

Plugin for Fleet Stuffs for [Alliance Auth](https://gitlab.com/allianceauth/allianceauth).

Full tracking of fleets, and aggregation of statistics from that data.

## Features

- Auto Fleet tracking for members of selected groups
- Manual fleet tracking via _track my fleet_ option in UI
- Fleet UI
  - Show all fleets in space and their comp
  - Edit Fleet details
  - move fleet members
  - kick people from fleet

## Auto Fleet Tracking

Any fleet bossed by a character owned by a member of a monitored group is tracked automatically. All of a member's known characters are checked, not just their main.

### Setup

1. Add the schedule to your `local.py` and restart Celery beat. Without these nothing is checked automatically.

   ```python
   CELERYBEAT_SCHEDULE['aacat_check_watched'] = {
       'task': 'aacat.tasks.fleet_tasks.check_all_watched_characters',
       'schedule': crontab(minute='*/5'),
   }
   CELERYBEAT_SCHEDULE['aacat_check_online_fleets'] = {
       'task': 'aacat.tasks.fleet_tasks.check_online_watched_fleets',
       'schedule': crontab(minute='*'),
   }
   CELERYBEAT_SCHEDULE['aacat_stale_fleets'] = {
       'task': 'aacat.tasks.fleet_tasks.bootstrap_stale_fleets',
       'schedule': crontab(minute='*'),
   }
   ```

2. In the admin site open **aaCAT Configuration**, select the **monitor groups** and tick **enable monitoring mode**.
3. Have each member add a token for every character they may boss a fleet on, using the `+` button in the Fleets menu (`/cat/char/add`). Characters without a token are skipped.

### How it works

- Every 5 minutes each monitored character is checked to see if they are online.
- Every minute the characters seen online are checked for a fleet they are the boss of. Characters already bossing a tracked fleet are skipped.
- Closing a fleet in the UI **does not stick** while a monitored character is still its boss. It is reopened within about a minute.

### Settings

| Setting                      | Default | Description                                                                                 |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `AACAT_ONLINE_CHECK_SECONDS` | `300`   | Time between online checks. If you change the crontab of `aacat_check_watched`, match it here. |

### ESI Errors

ESI answers a fleet check with a 404 when a character is not in a fleet, and these count towards the ESI error limit. Large groups with many characters online but out of fleet will use up more of that limit, which is shared with everything else on your Auth. If checks are skipped with error limit warnings in the logs, reduce the size of the monitored groups.

### Upgrading

The `monitor_us` permission has been removed in favour of monitored groups. Anyone relying on it needs to add the groups in **aaCAT Configuration** and tick **enable monitoring mode**, or monitoring stops.
