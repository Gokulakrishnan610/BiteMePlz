from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics
from django.urls import path
from django.http import FileResponse, HttpResponseForbidden
from django.conf import settings
import os
from django.utils.html import format_html
from django.contrib.admin import AdminSite


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
    list_display = ('name', 'location', 'shop_admin', 'is_active', 'is_open', 'created_at')
    list_filter = ('is_active', 'is_open', 'created_at')
    search_fields = ('name', 'location', 'shop_admin__name')
    ordering = ('-created_at',)


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