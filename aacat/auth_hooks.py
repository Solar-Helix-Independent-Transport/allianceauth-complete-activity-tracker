from allianceauth import hooks
from allianceauth.services.hooks import MenuItemHook, UrlHook

from . import app_settings, models, urls

"""
class FleetTracking(MenuItemHook):
    def __init__(self):
        MenuItemHook.__init__(self,
                              ('Fleet Tracking'),
                              'far fa-eye fa-fw',
                              'aacat:view',
                              navactive=['aacat:'])

    def render(self, request):
        if request.user.has_perm('aacat.aacat'):
            return MenuItemHook.render(self, request)
        return ''

@hooks.register('menu_item_hook')
def register_menu():
    return FleetTracking()


@hooks.register("secure_group_filters")
def filters():
    return [ ]

@hooks.register('discord_cogs_hook')
def register_cogs():
    return "cog.file.name"


"""


@hooks.register('url_hook')
def register_url():
    return UrlHook(urls, 'aacat', r'^cat/')
