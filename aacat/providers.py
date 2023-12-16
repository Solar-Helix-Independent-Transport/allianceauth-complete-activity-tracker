import csv
import re

import requests
from esi.clients import EsiClientProvider

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


class EVEClient(EsiClientProvider):

    @staticmethod
    def chunk_ids(l, n=750):
        for i in range(0, len(l), n):
            yield l[i:i + n]

    def load_ships_sde(self):
        cat_id = 6
        groups = []
        group_ids = set()
        print("Loading Groups")
        group_data = CSVLoader(
            "https://www.fuzzwork.co.uk/dump/latest/invGroups.csv")

        for r in group_data.data:
            if int(r['categoryID']) == cat_id:
                group_ids.add(r['groupID'])
                groups.append(models.ShipCategory(
                    id=r['groupID'], name=r['groupName']))
        # create anything new, ignore the existing stuff
        models.ShipCategory.objects.bulk_create(
            groups, batch_size=1000, ignore_conflicts=True)
        # update anything not
        models.ShipCategory.objects.bulk_update(
            groups, batch_size=1000, fields=["name"])

        ships = []
        print("Loading Ships")
        ships_data = CSVLoader(
            "https://www.fuzzwork.co.uk/dump/latest/invTypes.csv")
        for r in ships_data.data:
            if r['groupID'] in group_ids:
                ships.append(models.ShipType(
                    id=r['typeID'], name=r['typeName'], cat_id=r['groupID']))
        # create anything new, ignore the existing stuff
        models.ShipType.objects.bulk_create(
            ships, batch_size=1000, ignore_conflicts=True)
        # update anything not
        models.ShipType.objects.bulk_update(
            ships, batch_size=1000, fields=["name", "cat"])

    def load_map_sde(self):
        regions = []
        print("Loading Regions")
        region_data = CSVLoader(
            "https://www.fuzzwork.co.uk/dump/latest/mapRegions.csv")
        for r in region_data.data:
            regions.append(models.Region(
                id=r['regionID'], name=r['regionName']))
        # create anything new
        models.Region.objects.bulk_create(
            regions, batch_size=1000, ignore_conflicts=True)
        # update anything not
        models.Region.objects.bulk_update(
            regions, batch_size=1000, fields=["name"])

        print("Loading Constellations")
        constellation_data = CSVLoader(
            "https://www.fuzzwork.co.uk/dump/latest/mapConstellations.csv")
        constellations = []
        for r in constellation_data.data:
            constellations.append(models.Constellation(
                id=r['constellationID'], name=r['constellationName'], region_id=r['regionID']))
        # create anything new
        models.Constellation.objects.bulk_create(
            constellations, batch_size=1000, ignore_conflicts=True)
        # update anything not
        models.Constellation.objects.bulk_update(
            constellations, batch_size=1000, fields=["name", "region"])

        print("Loading Systems")
        system_data = CSVLoader(
            "https://www.fuzzwork.co.uk/dump/latest/mapSolarSystems.csv")
        map_jumps_data = CSVLoader(
            "https://www.fuzzwork.co.uk/dump/latest/mapJumps.csv")
        system_jumps_data = CSVLoader(
            "https://www.fuzzwork.co.uk/dump/latest/mapSolarSystemJumps.csv")
        systems = []
        for r in system_data.data:
            systems.append(models.System(id=r['solarSystemID'], name=r['solarSystemName'],
                           region_id=r['regionID'], constellation_id=r['constellationID']))
        # create anything new
        models.System.objects.bulk_create(
            systems, batch_size=1000, ignore_conflicts=True)
        # update anything not
        models.System.objects.bulk_update(systems, batch_size=1000, fields=[
                                          "name", "region", "constellation"])

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


esi = EVEClient()
