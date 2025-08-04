from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics


@admin.register(User)
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


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'shop_admin', 'is_active', 'is_open', 'created_at')
    list_filter = ('is_active', 'is_open', 'created_at')
    search_fields = ('name', 'location', 'shop_admin__name')
    ordering = ('-created_at',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'shop', 'price', 'is_available', 'created_at')
    list_filter = ('is_available', 'shop', 'created_at')
    search_fields = ('name', 'shop__name')
    ordering = ('-created_at',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'user', 'shop', 'total_price', 'is_paid', 'is_verified', 'status', 'created_at')
    list_filter = ('is_paid', 'is_verified', 'status', 'created_at')
    search_fields = ('order_id', 'user__name', 'shop__name')
    ordering = ('-created_at',)
    readonly_fields = ('order_id', 'qr_code', 'qr_valid_until')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'amount', 'status', 'payment_method', 'created_at')
    list_filter = ('type', 'status', 'payment_method', 'created_at')
    search_fields = ('user__name', 'shop__name', 'order__order_id')
    ordering = ('-created_at',)


@admin.register(ShopLog)
class ShopLogAdmin(admin.ModelAdmin):
    list_display = ('shop', 'action', 'performed_by', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('shop__name', 'performed_by__name', 'action')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)


@admin.register(StudentAnalytics)
class StudentAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_spent', 'total_orders', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__name', 'shop__name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at') 