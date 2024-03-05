from allianceauth import hooks
from allianceauth.services.hooks import MenuItemHook, UrlHook

from . import app_settings, models, urls


class FleetTracking(MenuItemHook):
    def __init__(self):
        MenuItemHook.__init__(self,
                              ('Fleets'),
                              'far fa-rocket fa-fw',
                              'aacat:index',
                              navactive=['aacat:'])

    def render(self, request):
        if request.user.has_perm('aacat.view_fleets'):
            return MenuItemHook.render(self, request)
        return ''


@hooks.register('url_hook')
def register_url():
    return UrlHook(urls, 'aacat', r'^cat/')


@hooks.register('discord_cogs_hook')
def register_cogs():
    return ["aacat.fleet_cog"]
