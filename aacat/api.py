import logging
from datetime import timedelta
from typing import List

from allianceauth.eveonline.models import EveCharacter
from django.conf import settings
from django.contrib.auth.models import Group, User
from django.db.models import CharField, F, Value
from django.utils import timezone
from ninja import NinjaAPI
from ninja.security import django_auth

from . import models, providers, schema

logger = logging.getLogger(__name__)

api = NinjaAPI(title="CorpTools API", version="0.0.1",
               urls_namespace='aacat:api', auth=django_auth, csrf=True,
               openapi_url=settings.DEBUG and "/openapi.json" or "")


@api.post(
    "/search/system/",
    response={200: List[schema.EveName]},
    tags=["Search"]
)
def post_system_search(request, search_text: str, limit: int = 10):
    return models.System.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("System", output_field=CharField()))[:limit]


@api.post(
    "/search/constellation/",
    response={200: List[schema.EveName]},
    tags=["Search"]
)
def post_constellation_search(request, search_text: str, limit: int = 10):
    return models.Constellation.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("Constellation", output_field=CharField()))[:limit]


@api.post(
    "/search/region/",
    response={200: List[schema.EveName]},
    tags=["Search"]
)
def post_region_search(request, search_text: str, limit: int = 10):
    return models.Region.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("Region", output_field=CharField()))[:limit]


@api.post(
    "/search/auth/group/",
    response={200: List},
    tags=["Search"]
)
def post_group_search(request, search_text: str, limit: int = 10):
    return models.Group.objects.filter(name__icontains=search_text).values("name", "id")[:limit]


@api.post(
    "/search/auth/character/",
    response={200: List[schema.Character]},
    tags=["Search"]
)
def post_character_search(request, search_text: str, limit: int = 10):
    return models.EveCharacter.objects.filter(character_name__icontains=search_text)[:limit]


@api.get(
    "/fleets/active/",
    response={200: List},
    tags=["Fleets"]
)
def get_fleets_active(request, limit: int = 50):
    return models.Fleet.objects.filter(end_time__isnull=True).values("name", "eve_fleet_id")[:limit]


@api.get(
    "/fleets/recent/",
    response={200: List},
    tags=["Fleets"]
)
def get_fleets_recent(request, days_look_back: int = 14):
    _start = timezone.now() - timedelta(days=days_look_back)
    return models.Fleet.objects.filter(start_time__gte=_start, end_time__isnull=False).values("name", "eve_fleet_id")
