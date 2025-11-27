from django.contrib import admin
from .models import SiteConfiguration, AcademicYear, Department


class AcademicYearAdmin(admin.ModelAdmin):
    """Admin interface for Academic Years"""
    list_display = ('code', 'name', 'is_active', 'order')
    list_editable = ('is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('code', 'name')
    ordering = ('order', 'code')


class DepartmentAdmin(admin.ModelAdmin):
    """Admin interface for Departments"""
    list_display = ('code', 'name', 'is_active', 'order')
    list_editable = ('is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('code', 'name')
    ordering = ('order', 'code')


class SiteConfigurationAdmin(admin.ModelAdmin):
    """
    Admin interface for SiteConfiguration model.
    Customized for singleton pattern - only one instance should exist.
    """
    list_display = ('__str__', 'login_enabled', 'registration_enabled', 'ordering_enabled', 'updated_at')
    list_display_links = ('__str__',)
    list_editable = ('login_enabled', 'registration_enabled', 'ordering_enabled')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Global Access Restrictions', {
            'fields': ('login_enabled', 'registration_enabled', 'ordering_enabled'),
            'description': 'Control site-wide access to login, registration, and ordering functionality.'
        }),
        ('Year-wise Restrictions', {
            'fields': ('restricted_years_login', 'restricted_years_registration', 'restricted_years_ordering'),
            'description': 'Restrict specific academic years from login, registration, or ordering. Enter year codes as a JSON list (e.g., ["1", "2"]).'
        }),
        ('Department-wise Restrictions', {
            'fields': ('restricted_departments_login', 'restricted_departments_registration', 'restricted_departments_ordering'),
            'description': 'Restrict specific departments from login, registration, or ordering. Enter department codes as a JSON list (e.g., ["CSE", "ECE"]).'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        """
        Prevent adding new instances since this is a singleton.
        Only one configuration instance should exist.
        """
        return not SiteConfiguration.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """
        Prevent deletion of the configuration instance.
        """
        return False


# Explicitly register all models
admin.site.register(AcademicYear, AcademicYearAdmin)
admin.site.register(Department, DepartmentAdmin)
admin.site.register(SiteConfiguration, SiteConfigurationAdmin)
