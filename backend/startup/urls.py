from django.urls import path
from .views import SiteConfigurationView, AcademicYearsView, DepartmentsView

app_name = 'startup'

urlpatterns = [
    path('config/', SiteConfigurationView.as_view(), name='site-configuration'),
    path('academic-years/', AcademicYearsView.as_view(), name='academic-years'),
    path('departments/', DepartmentsView.as_view(), name='departments'),
]
