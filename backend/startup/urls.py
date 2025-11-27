from django.urls import path
from .views import SiteConfigurationView

app_name = 'startup'

urlpatterns = [
    path('config/', SiteConfigurationView.as_view(), name='site-configuration'),
]
