import logging
from typing import List

from django.db.models import CharField, Value

from .. import models, schema

logger = logging.getLogger(__name__)


class SearchEndpoints():
    def __init__(self, api) -> None:
        @api.post(
            "/search/system/",
            response={200: List[schema.EveName], **schema.error_responses},
            tags=["Search"]
        )
        def system_search(request, search_text: str, limit: int = 10):
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            return models.System.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("System", output_field=CharField()))[:limit]

        @api.post(
            "/search/constellation/",
            response={200: List[schema.EveName], **schema.error_responses},
            tags=["Search"]
        )
        def constellation_search(request, search_text: str, limit: int = 10):
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            return models.Constellation.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("Constellation", output_field=CharField()))[:limit]

        @api.post(
            "/search/region/",
            response={200: List[schema.EveName], **schema.error_responses},
            tags=["Search"]
        )
        def region_search(request, search_text: str, limit: int = 10):
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            return models.Region.objects.filter(name__icontains=search_text).values("name", "id", cat=Value("Region", output_field=CharField()))[:limit]

        @api.post(
            "/search/auth/group/",
            response={200: List[schema.EveName], **schema.error_responses},
            tags=["Search"]
        )
        def group_search(request, search_text: str, limit: int = 10):
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            return models.Group.objects.filter(name__icontains=search_text).values("name", "id")[:limit]

        @api.post(
            "/search/auth/character/",
            response={200: List[schema.Character], **schema.error_responses},
            tags=["Search"]
        )
        def character_search(request, search_text: str, limit: int = 10):
            if not request.user.has_perm('aacat.edit_fleets'):
                return 403, "No Perms"

            return models.EveCharacter.objects.filter(character_name__icontains=search_text)[:limit]
