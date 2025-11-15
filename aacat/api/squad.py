import logging

from esi.models import Token

from .. import models, providers

logger = logging.getLogger(__name__)


class SquadEndpoints():
    def __init__(self, api) -> None:
        @api.post(
            "/fleets/{fleet_id}/wing/{wing_id}/squad",
            # response={200: any, 403: str},
            tags=["Structure"]
        )
        def create_squad(request, fleet_id: int, wing_id: int):
            """
                Create a wing in a fleet
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            token = Token.get_token(fleet.boss.character_id, [
                                    'esi-fleets.write_fleet.v1'])
            fleet = providers.esi.client.Fleets.PostFleetsFleetIdWingsWingIdSquads(
                fleet_id=fleet_id,
                wing_id=wing_id,
                token=token
            ).result()
            return fleet

        @api.delete(
            "/fleets/{fleet_id}/squad/{squad_id}",
            # response={200: any, 403: str},
            tags=["Structure"]
        )
        def delete_squad(request, fleet_id: int, squad_id: int):
            """
                Delete a Squad in a fleet
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            token = Token.get_token(fleet.boss.character_id, [
                                    'esi-fleets.write_fleet.v1'])
            wing_deleted = providers.esi.client.Fleets.DeleteFleetsFleetIdSquadsSquadId(
                fleet_id=fleet_id,
                squad_id=squad_id,
                token=token
            ).result()
            return wing_deleted

        @api.put(
            "/fleets/{fleet_id}/squad/{squad_id}",
            # response={200: any, 403: str},
            tags=["Structure"]
        )
        def rename_squad(request, fleet_id: int, squad_id: int, name: str):
            """
                Rename a Wing in a fleet
            """
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            fleet = models.Fleet.objects.get(eve_fleet_id=fleet_id)
            token = Token.get_token(fleet.boss.character_id, [
                                    'esi-fleets.write_fleet.v1'])
            wing_renamed = providers.esi.client.Fleets.PutFleetsFleetIdSquadsSquadId(
                fleet_id=fleet_id,
                squad_id=squad_id,
                body={
                    "name": name
                },
                token=token
            ).result()
            return wing_renamed
