from django.contrib import admin
from .models import SiteConfiguration


@admin.register(SiteConfiguration)
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
        ('Access Restrictions', {
            'fields': ('login_enabled', 'registration_enabled', 'ordering_enabled'),
            'description': 'Control site-wide access to login, registration, and ordering functionality.'
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


# Explicitly register the model (fallback in case decorator doesn't work)
admin.site.register(SiteConfiguration, SiteConfigurationAdmin)
