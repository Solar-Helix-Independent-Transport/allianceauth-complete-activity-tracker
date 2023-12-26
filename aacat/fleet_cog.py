# Cog Stuff
import logging

# AA-Discordbot
from aadiscordbot.cogs.utils.decorators import has_any_perm
from allianceauth.eveonline.models import EveCharacter
from corptools.providers import esi
from discord import AutocompleteContext, SlashCommandGroup, option
from discord.ext import commands
# AA Contexts
from django.conf import settings

from aacat.models import Fleet
from aacat.tasks.fleet_tasks import check_character_online

logger = logging.getLogger(__name__)


class AACatFleets(commands.Cog):
    """
    All about Fleets!
    """

    def __init__(self, bot):
        self.bot = bot

    async def search_characters(ctx: AutocompleteContext):
        """Returns a list of colors that begin with the characters entered so far."""
        return list(EveCharacter.objects.filter(character_name__icontains=ctx.value).values_list('character_name', flat=True)[:10])

    fleet_commands = SlashCommandGroup("fleets", "Fleet Tracking Commands", guild_ids=[
                                       int(settings.DISCORD_GUILD_ID)])

    @fleet_commands.command(name='track', guild_ids=[int(settings.DISCORD_GUILD_ID)])
    @option("character", description="Search for a Character!", autocomplete=search_characters)
    async def slash_track_fleet(
        self,
        ctx,
        character: str,
    ):
        """
            Start Tracking the fleet of the selected character. The Character must be the Fleet Boss.
        """
        try:
            has_any_perm(ctx.author.id, ['aacat.create_fleets'])
            try:
                char = EveCharacter.objects.get(character_name=character)
                check_character_online.apply_async(
                    args=[char.character_id], priority=1)
                return await ctx.respond(f"Requested Tracking of `{character}`'s Fleet.")
            except EveCharacter.DoesNotExist:
                return await ctx.respond(f"Character **{character}** does not exist in our Auth system")
        except commands.MissingPermissions as e:
            return await ctx.respond(f"Missing Permissions `{e.missing_permissions[0]}`", ephemeral=True)

    @fleet_commands.command(name='active', guild_ids=[int(settings.DISCORD_GUILD_ID)])
    async def slash_active_fleets(
        self,
        ctx,
    ):
        """
            List Active Fleets and update times
        """
        try:
            has_any_perm(ctx.author.id, ['aacat.create_fleets'])
            try:
                fleets = Fleet.objects.filter(end_time__isnull=True).values(
                    "name",
                    "eve_fleet_id",
                    "boss__character_name",
                    "fc__character_name",
                    "last_update")
                msgs = []
                for f in fleets:
                    msgs.append(
                        f"`{f['name']}` - `{f['eve_fleet_id']}` - Boss: `{f['boss__character_name']}`- FC: `{f['fc__character_name']}` - updated:{f['last_update'].strftime('%Y-%m-%d %H:%M:%S')}")
                return await ctx.respond("\n".join(msgs))
            except Exception as e:
                logger.error(e)
                return await ctx.respond(f"Error Getting Fleets `{e}`")
        except commands.MissingPermissions as e:
            return await ctx.respond(f"Missing Permissions `{e.missing_permissions[0]}`", ephemeral=True)


def setup(bot):
    bot.add_cog(AACatFleets(bot))
