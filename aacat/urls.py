from django.urls import include, re_path

from . import views
from .api import api

app_name = 'aacat'

urlpatterns = [
    re_path(r'^api/', api.urls),
    re_path(r'^char/add/$', views.add_char, name='add_char'),
    re_path(r'^', views.react_main, name="index"),
]
