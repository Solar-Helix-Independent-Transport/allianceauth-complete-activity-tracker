
from allianceauth.eveonline.models import EveCharacter
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.utils.translation import gettext_lazy as _
from esi.decorators import token_required

from . import __version__


@token_required(scopes=['esi-location.read_online.v1', 'esi-fleets.read_fleet.v1', 'esi-fleets.write_fleet.v1'])
def add_char(request, token):
    return redirect('authentication:dashboard')
