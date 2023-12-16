from __future__ import division

from datetime import datetime
from typing import List, Optional, Union

from ninja import Schema


class Message(Schema):
    message: str


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


class ValueLabel(Schema):
    value: Union[str, int, float, bool]
    label: str


class SnapshotCharacter(Schema):
    character: Character
    main: Optional[Character] = None
    system: EveName
    ship: EveName
    role: str
    join_time: datetime


class Snapshot(Schema):
    time: datetime
    snapshot: List[SnapshotCharacter]
