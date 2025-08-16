from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics
from django.urls import path
from django.http import FileResponse, HttpResponseForbidden
from django.conf import settings
import os
from django.utils.html import format_html
from django.contrib.admin import AdminSite
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.crypto import get_random_string


class CustomUserAdmin(UserAdmin):
    list_display = ('name', 'email', 'roll_no', 'role', 'is_verified', 'balance', 'created_at')
    list_filter = ('role', 'is_verified', 'created_at')
    search_fields = ('name', 'email', 'roll_no')
    ordering = ('-created_at',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('REC Kiosk Info', {'fields': ('name', 'roll_no', 'role', 'shop', 'is_verified', 'otp', 'password_reset_otp', 'password_reset_token', 'balance')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('REC Kiosk Info', {'fields': ('name', 'roll_no', 'role', 'shop', 'is_verified', 'otp', 'password_reset_otp', 'password_reset_token', 'balance')}),
    )


class ShopAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'shop_admin', 'shop_admin_email', 'is_active', 'is_open', 'created_at')
    list_filter = ('is_active', 'is_open', 'created_at')
    search_fields = ('name', 'location', 'shop_admin__name', 'shop_admin__email')
    ordering = ('-created_at',)
    
    actions = ['change_shop_admin_password']
    
    def shop_admin_email(self, obj):
        """Display shop admin email for easy reference"""
        if obj.shop_admin:
            return obj.shop_admin.email
        return "No admin"
    shop_admin_email.short_description = "Admin Email"
    shop_admin_email.admin_order_field = 'shop_admin__email'
    
    def change_shop_admin_password(self, request, queryset):
        """Change password for selected shops' admin users"""
        if len(queryset) != 1:
            self.message_user(request, 'Please select exactly one shop to change password.', messages.ERROR)
            return
        
        shop = queryset.first()
        if not shop.shop_admin:
            self.message_user(request, f'Shop "{shop.name}" has no admin user.', messages.ERROR)
            return
        
        # Get the new password from the request
        new_password = request.POST.get('new_password')
        if not new_password:
            self.message_user(request, 'New password is required.', messages.ERROR)
            return
        
        if len(new_password) < 6:
            self.message_user(request, 'Password must be at least 6 characters long.', messages.ERROR)
            return
        
        # Change the password
        shop.shop_admin.set_password(new_password)
        shop.shop_admin.save()
        
        # Log the action
        ShopLog.objects.create(
            shop=shop,
            action='admin_password_changed',
            performed_by=request.user,
            details={
                'admin_user': shop.shop_admin.email,
                'changed_by': request.user.email
            }
        )
        
        self.message_user(
            request, 
            f'Password changed successfully for shop "{shop.name}" admin ({shop.shop_admin.email})',
            messages.SUCCESS
        )
    
    change_shop_admin_password.short_description = "Change shop admin password"
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                '<path:object_id>/change-password/',
                self.admin_site.admin_view(self.change_password_view),
                name='shop_change_password',
            ),
        ]
        return custom_urls + urls
    
    def change_password_view(self, request, object_id):
        """Custom view for changing shop admin password"""
        if request.method == 'POST':
            try:
                shop = Shop.objects.get(id=object_id)
                if not shop.shop_admin:
                    messages.error(request, f'Shop "{shop.name}" has no admin user.')
                    return redirect(reverse('admin:api_shop_change', args=[object_id]))
                
                new_password = request.POST.get('new_password')
                if not new_password:
                    messages.error(request, 'New password is required.')
                    return redirect(reverse('admin:api_shop_change', args=[object_id]))
                
                if len(new_password) < 6:
                    messages.error(request, 'Password must be at least 6 characters long.')
                    return redirect(reverse('admin:api_shop_change', args=[object_id]))
                
                # Change the password
                shop.shop_admin.set_password(new_password)
                shop.shop_admin.save()
                
                # Log the action
                ShopLog.objects.create(
                    shop=shop,
                    action='admin_password_changed',
                    performed_by=request.user,
                    details={
                        'admin_user': shop.shop_admin.email,
                        'changed_by': request.user.email
                    }
                )
                
                messages.success(
                    request, 
                    f'Password changed successfully for shop "{shop.name}" admin ({shop.shop_admin.email})'
                )
                
            except Shop.DoesNotExist:
                messages.error(request, 'Shop not found.')
            except Exception as e:
                messages.error(request, f'Error changing password: {str(e)}')
            
            return redirect(reverse('admin:api_shop_change', args=[object_id]))
        
        # GET request - show password change form
        try:
            shop = Shop.objects.get(id=object_id)
            if not shop.shop_admin:
                messages.error(request, f'Shop "{shop.name}" has no admin user.')
                return redirect(reverse('admin:api_shop_change', args=[object_id]))
            
            # Return a simple HTML form for password input
            from django.http import HttpResponse
            html = f'''
            <!DOCTYPE html>
            <html>
            <head>
                <title>Change Password - {shop.name}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; }}
                    .form-group {{ margin-bottom: 20px; }}
                    label {{ display: block; margin-bottom: 5px; font-weight: bold; }}
                    input[type="password"] {{ width: 300px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }}
                    button {{ background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }}
                    button:hover {{ background: #005a87; }}
                    .info {{ background: #f0f0f0; padding: 15px; border-radius: 4px; margin-bottom: 20px; }}
                </style>
            </head>
            <body>
                <h1>Change Admin Password</h1>
                <div class="info">
                    <strong>Shop:</strong> {shop.name}<br>
                    <strong>Admin:</strong> {shop.shop_admin.email}
                </div>
                <form method="POST">
                    <div class="form-group">
                        <label for="new_password">New Password:</label>
                        <input type="password" id="new_password" name="new_password" required minlength="6" placeholder="Enter new password (min 6 characters)">
                    </div>
                    <button type="submit">Change Password</button>
                    <a href="{reverse('admin:api_shop_change', args=[object_id])}" style="margin-left: 10px; color: #007cba;">Cancel</a>
                </form>
            </body>
            </html>
            '''
            return HttpResponse(html)
            
        except Shop.DoesNotExist:
            messages.error(request, 'Shop not found.')
            return redirect(reverse('admin:api_shop_change', args=[object_id]))


class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'shop', 'price', 'is_available', 'created_at')
    list_filter = ('is_available', 'shop', 'created_at')
    search_fields = ('name', 'shop__name')
    ordering = ('-created_at',)


class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'user', 'shop', 'total_price', 'is_paid', 'is_verified', 'status', 'created_at')
    list_filter = ('is_paid', 'is_verified', 'status', 'created_at')
    search_fields = ('order_id', 'user__name', 'shop__name')
    ordering = ('-created_at',)
    readonly_fields = ('order_id', 'qr_code', 'qr_valid_until')


class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'amount', 'status', 'payment_method', 'created_at')
    list_filter = ('type', 'status', 'payment_method', 'created_at')
    search_fields = ('user__name', 'shop__name', 'order__order_id')
    ordering = ('-created_at',)


class ShopLogAdmin(admin.ModelAdmin):
    list_display = ('shop', 'action', 'performed_by', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('shop__name', 'performed_by__name', 'action')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)


class StudentAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_spent', 'total_orders', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__name', 'shop__name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at') 


class CustomAdminSite(admin.AdminSite):
    site_header = 'REC Kiosk Admin'
    site_title = 'REC Kiosk Admin Portal'
    index_title = 'Welcome to REC Kiosk Admin'

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('download-db/', self.admin_view(self.download_db), name='download-db'),
        ]
        return custom_urls + urls

    def download_db(self, request):
        if not request.user.is_superuser:
            return HttpResponseForbidden('You are not authorized to download the database.')
        db_path = settings.DATABASES['default']['NAME']
        if not os.path.exists(db_path):
            return HttpResponseForbidden('Database file not found.')
        response = FileResponse(open(db_path, 'rb'), as_attachment=True, filename='db.sqlite3')
        return response

# Replace the default admin site with the custom one
admin.site = CustomAdminSite()

# Register all models with the custom admin site
admin.site.register(User, CustomUserAdmin)
admin.site.register(Shop, ShopAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(Transaction, TransactionAdmin)
admin.site.register(ShopLog, ShopLogAdmin)
admin.site.register(StudentAnalytics, StudentAnalyticsAdmin)

# Add a link to the download page on the admin index
def custom_index(self, request, extra_context=None):
    if extra_context is None:
        extra_context = {}
    download_button_html = ''
    if request.user.is_superuser:
        download_button_html = format_html(
            '''<div style="margin-bottom:24px;">
                <a href="/admin/download-db/" style="
                    display:inline-block;
                    padding:12px 32px;
                    background:#2563eb;
                    color:#fff;
                    font-size:1.1em;
                    font-weight:600;
                    border-radius:8px;
                    text-decoration:none;
                    box-shadow:0 2px 8px rgba(37,99,235,0.08);
                    margin-top:12px;">
                    4BE Download DB (.sqlite3)
                </a>
            </div>'''
        )
    extra_context['download_db_button'] = download_button_html
    response = AdminSite.index(self, request, extra_context=extra_context)
    if hasattr(response, 'render'):
        response.render()
        if 'download_db_button' in extra_context:
            # Insert the button just before the app_list block
            content = response.content.decode('utf-8')
            content = content.replace(
                '<div id="content-main">',
                '<div id="content-main">' + extra_context['download_db_button'],
                1
            )
            response.content = content.encode('utf-8')
    return response

CustomAdminSite.index = custom_index 