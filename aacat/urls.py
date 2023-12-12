from django.urls import include, re_path

from . import views
from .api import api

app_name = 'aacat'

urlpatterns = [
    # url(r'^$', views., name='view'),
    re_path(r'^api/', api.urls),

]
