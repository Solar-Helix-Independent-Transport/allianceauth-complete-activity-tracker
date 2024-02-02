from __future__ import division

from datetime import datetime
from typing import List, Optional, Union

from ninja import Schema

error_responses = {
    400: str,
    401: str,
    403: str,
    500: str,
    504: str
}


class Character(Schema):
    character_name: str
    character_id: int
    corporation_id: int
    corporation_name: str
    alliance_id: Optional[int] = None
    alliance_name: Optional[str] = None


class Corporation(Schema):
    corporation_id: int
    corporation_name: str
    alliance_id: Optional[int] = None
    alliance_name: Optional[str] = None


class EveName(Schema):
    id: int
    name: str
    cat: Optional[str] = None
    cat_id: Optional[int] = None


class ValueLabel(Schema):
    value: Union[str, int, float, bool]
    label: str


class FleetDetails(Schema):
    name: str
    boss: Character
    eve_fleet_id: int
    start_time: datetime
    last_update: datetime
    end_time: Optional[datetime] = None


class SnapshotCharacter(Schema):
    character: Character
    main: Optional[Character] = None
    system: EveName
    ship: EveName
    role: str
    join_time: datetime
    distance: Optional[int] = -2


class Snapshot(Schema):
    time: datetime
    snapshot: List[SnapshotCharacter]


class FleetSquad(Schema):
    squad_id: int
    name: Optional[str] = ""
    characters: Optional[list[SnapshotCharacter]] = []
    commander: Optional[SnapshotCharacter] = None


class FleetWing(Schema):
    wing_id: int
    name: Optional[str] = ""
    squads: Optional[list[FleetSquad]] = []
    commander: Optional[SnapshotCharacter] = None


class FleetStructure(Schema):
    fleet_boss: Character
    commander: Optional[SnapshotCharacter] = None
    wings: Optional[list[FleetWing]] = []
