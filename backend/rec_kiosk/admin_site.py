from django.contrib.admin import AdminSite
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import Group
from api.models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics

class RECKioskAdminSite(AdminSite):
    # Text to put at the end of each page's <title>.
    site_title = _("REC Kiosk Admin")

    # Text to put in each page's <h1> (and above login form).
    site_header = _("REC Kiosk Administration")

    # Text to put at the top of the admin index page.
    index_title = _("Welcome to REC Kiosk Administration")

    # URL for the "View site" link at the top of each admin page.
    site_url = "/"

    # Enable the new admin interface
    enable_nav_sidebar = True

    def get_app_list(self, request):
        """
        Return a sorted list of all the installed apps that have been
        registered in this site.
        """
        app_list = super().get_app_list(request)

        # Add custom statistics to the context
        for app in app_list:
            if app['app_label'] == 'api':
                # Get counts for dashboard statistics
                app['user_count'] = User.objects.count()
                app['product_count'] = Product.objects.count()
                app['order_count'] = Order.objects.count()
                app['shop_count'] = Shop.objects.count()
                break

        return app_list

    def index(self, request, extra_context=None):
        """
        Display the main admin index page, which lists all of the installed
        apps that have been registered in this site.
        """
        extra_context = extra_context or {}
        
        # Add dashboard statistics
        extra_context.update({
            'user_count': User.objects.count(),
            'product_count': Product.objects.count(),
            'order_count': Order.objects.count(),
            'shop_count': Shop.objects.count(),
        })
        
        return super().index(request, extra_context)

# Create the custom admin site instance
admin_site = RECKioskAdminSite(name='reckiosk_admin')

# Only register Group model here - other models are registered in api/admin.py
admin_site.register(Group)
