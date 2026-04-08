import uuid
import json
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from .managers import CustomUserManager


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    roll_no = models.CharField(max_length=255, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=50,
        choices=[
            ('admin', 'Admin'),
            ('shopAdmin', 'Shop Admin'),
            ('student', 'Student'),
            ('staff', 'Staff'),
        ],
        default='student'
    )
    year = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        help_text='Academic year code (for students)'
    )
    department = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='Department code (for students)'
    )
    staff_code = models.CharField(max_length=255, unique=True, null=True, blank=True)
    shop = models.ForeignKey('Shop', on_delete=models.SET_NULL, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    otp = models.JSONField(null=True, blank=True)
    otp_email_sent = models.BooleanField(default=False)  # Track if OTP email was sent
    password_reset_otp = models.JSONField(null=True, blank=True)
    password_reset_token = models.JSONField(null=True, blank=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_sub_admin = models.BooleanField(default=False)
    parent_admin = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_admins')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'name']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.name} ({self.email})"
    
    def to_dict(self):
        """Convert model instance to dictionary with string UUIDs"""
        return {
            'id': str(self.id),
            'name': self.name,
            'roll_no': self.roll_no,
            'staff_code': self.staff_code,
            'email': self.email,
            'role': self.role,
            'year': self.year,
            'department': self.department,
            'shop': str(self.shop.id) if self.shop else None,
            'is_verified': self.is_verified,
            'balance': float(self.balance),
            'is_sub_admin': self.is_sub_admin,
            'parent_admin': str(self.parent_admin.id) if self.parent_admin else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Shop(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255)
    image = models.CharField(max_length=500, blank=True, null=True)  # stores URL or path
    shop_admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='administered_shops')
    is_active = models.BooleanField(default=True)
    is_open = models.BooleanField(default=True)
    final_validity_time = models.DateTimeField()
    next_opening_time = models.DateTimeField()
    disabled_categories = models.JSONField(default=list)
    qr_validity_minutes = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(60)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'shops'

    def __str__(self):
        return self.name
    
    def to_dict(self):
        """Convert model instance to dictionary with string UUIDs"""
        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'location': self.location,
            'image': self.image.url if self.image else None,
            'shop_admin': str(self.shop_admin.id),
            'is_active': self.is_active,
            'is_open': self.is_open,
            'disabled_categories': self.disabled_categories,
            'final_validity_time': self.final_validity_time.isoformat() if self.final_validity_time else None,
            'next_opening_time': self.next_opening_time.isoformat() if self.next_opening_time else None,
            'qr_validity_minutes': self.qr_validity_minutes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Product(models.Model):
    CATEGORY_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('food', 'Food'),
        ('beverages', 'Beverages'),
        ('snacks', 'Snacks'),
        ('stationery', 'Stationery'),
        ('electronics', 'Electronics'),
        ('others', 'Others'),
    ]
    
    STOCK_MODE_CHOICES = [
        ('stock', 'Stock'),
        ('live_stock', 'Live Stock'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    stock_mode = models.CharField(max_length=20, choices=STOCK_MODE_CHOICES, default='stock')
    image = models.CharField(max_length=500, blank=True, null=True)  # Changed to CharField to store image path
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='others')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='products')
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'

    def __str__(self):
        return f"{self.name} - {self.shop.name}"
    
    def to_dict(self):
        """Convert model instance to dictionary with string UUIDs"""
        return {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'price': float(self.price),
            'stock': self.stock,
            'stock_mode': self.stock_mode,
            'image': self.image,
            'category': self.category,
            'shop': str(self.shop.id),
            'is_available': self.is_available,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_id = models.CharField(max_length=255, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='orders')
    order_items = models.JSONField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    payment_result = models.JSONField(null=True, blank=True)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    qr_code = models.TextField(blank=True, null=True)
    qr_valid_until = models.DateTimeField(null=True, blank=True)
    balance_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    held_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_validity = models.DateTimeField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'orders'

    def __str__(self):
        return f"Order {self.order_id} - {self.user.name}"
    
    def to_dict(self):
        """Convert model instance to dictionary with string UUIDs"""
        return {
            'id': str(self.id),
            'order_id': self.order_id,
            'user': str(self.user.id),
            'shop': str(self.shop.id),
            'order_items': self.order_items,
            'total_price': float(self.total_price),
            'payment_result': self.payment_result,
            'is_paid': self.is_paid,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'qr_code': self.qr_code,
            'qr_valid_until': self.qr_valid_until.isoformat() if self.qr_valid_until else None,
            'balance_amount': float(self.balance_amount),
            'held_amount': float(self.held_amount),
            'final_validity': self.final_validity.isoformat() if self.final_validity else None,
            'is_verified': self.is_verified,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'status': self.status,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Transaction(models.Model):
    TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
        ('payment', 'Payment'),
        ('refund', 'Refund'),
        ('verification', 'Verification'),
        ('expiry', 'Expiry'),
        ('cancellation', 'Cancellation'),
        ('forfeiture', 'Forfeiture'),
    ]
    
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('balance', 'Balance'),
        ('razorpay', 'Razorpay'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, null=True, blank=True, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='success')
    payment_method = models.CharField(max_length=50, choices=PAYMENT_METHOD_CHOICES, null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transactions'

    def __str__(self):
        return f"{self.type} - {self.user.name} - {self.amount}"


class ShopLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=100)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    details = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'shop_logs'

    def __str__(self):
        return f"{self.action} - {self.shop.name}"


class StudentAnalytics(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='analytics')
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, null=True, blank=True, related_name='student_analytics')
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_orders = models.IntegerField(default=0)
    favorite_products = models.JSONField(default=list)
    spending_pattern = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'student_analytics'
        verbose_name_plural = 'Student Analytics'

    def __str__(self):
        return f"Analytics - {self.user.name}"


class StudentLog(models.Model):
    ACTION_CHOICES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('view_shops', 'View Shops'),
        ('view_products', 'View Products'),
        ('add_to_cart', 'Add to Cart'),
        ('remove_from_cart', 'Remove from Cart'),
        ('place_order', 'Place Order'),
        ('view_order', 'View Order'),
        ('cancel_order', 'Cancel Order'),
        ('add_balance', 'Add Balance'),
        ('view_profile', 'View Profile'),
        ('update_profile', 'Update Profile'),
        ('view_transactions', 'View Transactions'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_logs')
    action = models.CharField(max_length=100, choices=ACTION_CHOICES)
    description = models.TextField(blank=True, null=True)
    shop = models.ForeignKey(Shop, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_logs')
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_logs')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_logs')
    metadata = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.action} - {self.created_at}" 