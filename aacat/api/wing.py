import logging

from esi.models import Token

from .. import models, providers

logger = logging.getLogger(__name__)


class WingEndpoints():
    def __init__(self, api) -> None:
        @api.post(
            "/fleets/{fleet_id}/wing",
            # response={200: any, 403: str},
            tags=["Structure"]
        )
        def create_wing(request, fleet_id: int):
            """
                Create a wing in a fleet
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            token = Token.get_token(fleet.boss.character_id, [
                                    'esi-fleets.write_fleet.v1'])
            fleet = providers.esi.client.Fleets.post_fleets_fleet_id_wings(
                fleet_id=fleet_id,
                token=token.valid_access_token()
            ).result()
            return fleet

        @api.delete(
            "/fleets/{fleet_id}/wing/{wing_id}",
            # response={200: any, 403: str},
            tags=["Structure"]
        )
        def delete_wing(request, fleet_id: int, wing_id: int):
            """
                Delete a Wing in a fleet
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            token = Token.get_token(fleet.boss.character_id, [
                                    'esi-fleets.write_fleet.v1'])
            wing_deleted = providers.esi.client.Fleets.delete_fleets_fleet_id_wings_wing_id(
                fleet_id=fleet_id,
                wing_id=wing_id,
                token=token.valid_access_token()
            ).result()
            return wing_deleted

        @api.put(
            "/fleets/{fleet_id}/wing/{wing_id}",
            # response={200: any, 403: str},
            tags=["Structure"]
        )
        def rename_wing(request, fleet_id: int, wing_id: int, name: str):
            """
                Rename a Wing in a fleet
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            token = Token.get_token(fleet.boss.character_id, [
                                    'esi-fleets.write_fleet.v1'])
            wing_renamed = providers.esi.client.Fleets.put_fleets_fleet_id_wings_wing_id(
                fleet_id=fleet_id,
                wing_id=wing_id,
                naming={
                    "name": name
                },
                token=token.valid_access_token()
            ).result()
            return wing_renamed
