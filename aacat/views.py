
from django.contrib.auth.decorators import login_required, permission_required
from django.shortcuts import redirect, render
from django.utils.translation import gettext_lazy as _
from esi.decorators import token_required

from . import __version__


@token_required(
    scopes=[
        'esi-location.read_online.v1',
        'esi-fleets.read_fleet.v1',
        'esi-fleets.write_fleet.v1'
    ]
)
def add_char(request, token):
    return redirect('authentication:dashboard')


@login_required
@permission_required("aacat.edit_fleets")
def react_main(request):
    return render(
        request,
        'aacat/index.html',
        context={
            "version": __version__,
            "app_name": "aacat",
            "page_title": "Fleet Tool"
        }
    )
