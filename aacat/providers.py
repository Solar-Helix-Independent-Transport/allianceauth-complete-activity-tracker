import csv
import re

import requests
from esi import openapi_clients

from . import models, providers


class CSVLoader:
    def __init__(self, url):
        self.url = url
        self.data = []
        self.load_data()

    def load_data(self):
        with requests.get(self.url) as r:
            import re
            pattern = re.compile(r'".*?"', re.DOTALL)
            out = pattern.sub(lambda x: x.group().replace('\n', ''), r.text)

            self.data = csv.DictReader(out.split("\r\n"))
            # if len(row) > 0:
            #     _data = row.split(",")
            #     print(self.keys)
            #     print(_data)
            #     self.data.append(
            #         {
            #             self.keys[i]: d for i, d in enumerate(_data)
            #         }
            #    )


class EVEClient(openapi_clients.ESIClientProvider):

    def get_fleet_wings(self, fleet_id, token):
        try:
            return providers.esi.client.Fleets.GetFleetsFleetIdWings(
                fleet_id=fleet_id,
                token=token
            ).result()
        except Exception as e:
            print(e)

    @staticmethod
    def chunk_ids(l, n=750):
        for i in range(0, len(l), n):
            yield l[i:i + n]

    def load_map_esi(self):
        region_ids = self.client.Universe.get_universe_regions().result()
        for r in region_ids:
            systems = {}
            _r = self.client.Universe.get_universe_regions_region_id(
                region_id=r).result()
            region, reg_created = models.Region.objects.update_or_create(
                id=r, name=_r['name'])
            for c in _r['constellations']:
                _c = self.client.Universe.get_universe_constellations_constellation_id(
                    constellation_id=c).result()
                constellation, con_created = models.Constellation.objects.update_or_create(
                    id=c, name=_c['name'], region=region)
                for s in _c['systems']:
                    systems[s] = models.System(
                        id=s, name=f"SystemID:{s}", region=region, constellation=constellation)

            system_ids = list(systems.keys())

            for _s in self.chunk_ids(system_ids):
                names = self.client.Universe.post_universe_names(
                    ids=_s).result()
                for n in names:
                    systems[n['id']].name = n['name']

            # create anything new
            models.System.objects.bulk_create(
                list(systems.values()), batch_size=1000, ignore_conflicts=True)
            # update anything not
            models.System.objects.bulk_update(list(systems.values()), batch_size=1000, fields=[
                                              "name", "region", "constellation"])


esi = EVEClient(
    compatibility_date="2025-08-26",
    ua_appname="aa-cat",
    ua_version="0.0.1a1"
)
