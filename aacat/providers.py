from esi import openapi_clients


class EVEClient(openapi_clients.ESIClientProvider):

    def get_fleet_wings(self, fleet_id, token):
        return self.client.Fleets.GetFleetsFleetIdWings(
            fleet_id=fleet_id,
            token=token
        ).result(use_etag=False)

    @staticmethod
    def chunk_ids(l, n=750):
        for i in range(0, len(l), n):
            yield l[i:i + n]


esi = EVEClient(
    compatibility_date="2026-05-19",
    ua_appname="aa-cat",
    ua_version="0.0.1a1",
    ua_url="http://stuff.stuff",
    operations=[
        "DeleteFleetsFleetIdMembersMemberId",
        "DeleteFleetsFleetIdSquadsSquadId",
        "DeleteFleetsFleetIdWingsWingId",
        "GetCharactersCharacterIdFleet",
        "GetCharactersCharacterIdOnline",
        "GetFleetsFleetId",
        "GetFleetsFleetIdMembers",
        "GetFleetsFleetIdWings",
        "PostFleetsFleetIdMembers",
        "PostFleetsFleetIdWings",
        "PostFleetsFleetIdWingsWingIdSquads",
        "PutFleetsFleetId",
        "PutFleetsFleetIdMembersMemberId",
        "PutFleetsFleetIdSquadsSquadId",
        "PutFleetsFleetIdWingsWingId",
    ]
)
