from rest_framework import serializers
from django.contrib.auth import authenticate
import uuid
from django.utils import timezone
from decimal import Decimal
from django.db import transaction
from django.db.models import F

from .utils import convert_uuids_to_str_recursive
from datetime import timedelta

from .models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics
try:
    from asgiref.sync import async_to_sync  # type: ignore
    from channels.layers import get_channel_layer  # type: ignore
    _channels_available = True
except Exception:
    _channels_available = False


class UserSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    shop = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'name', 'roll_no', 'email', 'role', 'year', 'department', 'shop', 'is_verified', 'balance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    role = serializers.CharField(required=False, default='student')
    
    # Student fields - all optional
    roll_no = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    year = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    department = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    
    # Staff field - optional
    staff_code = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = User
        fields = ['name', 'roll_no', 'staff_code', 'email', 'password', 'confirm_password', 'role', 'year', 'department']

    def validate(self, attrs):
        # Password matching validation
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        
        role = attrs.get('role', 'student')
        
        # Role-specific validation
        if role == 'student':
            # Require student-specific fields
            if not attrs.get('roll_no'):
                raise serializers.ValidationError("Roll number is required for students")
            if not attrs.get('year'):
                raise serializers.ValidationError("Year is required for students")
            if not attrs.get('department'):
                raise serializers.ValidationError("Department is required for students")
            # Clear staff fields
            attrs['staff_code'] = None
            
        elif role == 'staff':
            # Require staff-specific field
            if not attrs.get('staff_code'):
                raise serializers.ValidationError("Staff code is required for staff")
            # Clear student fields
            attrs['roll_no'] = None
            attrs['year'] = None
            attrs['department'] = None
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        # Generate username from email
        validated_data['username'] = validated_data['email']
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include email and password')
        return attrs


class ShopSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    shop_admin = UserSerializer(read_only=True)
    shop_admin_id = serializers.UUIDField(write_only=True)
    image = serializers.CharField(required=False, allow_blank=True)
    disabled_categories = serializers.ListField(child=serializers.CharField(), required=False)

    class Meta:
        model = Shop
        fields = ['id', 'name', 'description', 'location', 'image', 'shop_admin', 'shop_admin_id', 
                 'is_active', 'is_open', 'disabled_categories', 'final_validity_time', 'next_opening_time', 'qr_validity_minutes',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    shop = ShopSerializer(read_only=True)
    shop_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'stock', 'stock_mode', 'image', 'category', 'shop', 'shop_id', 
                 'is_available', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        """Custom create method to handle shop_id properly"""
        # Extract shop_id from validated_data
        shop_id = validated_data.pop('shop_id', None)
        
        if shop_id:
            try:
                shop = Shop.objects.get(id=shop_id)
                validated_data['shop'] = shop
            except Shop.DoesNotExist:
                raise serializers.ValidationError(f"Shop with ID {shop_id} does not exist.")
        else:
            raise serializers.ValidationError("shop_id is required.")
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Custom update method to handle partial updates properly"""
        # Remove shop_id from validated_data as it's not a model field
        validated_data.pop('shop_id', None)
        
        # Update only the fields that are provided
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class OrderItemSerializer(serializers.Serializer):
    product_id = serializers.UUIDField(write_only=True)
    quantity = serializers.IntegerField()
    shop_id = serializers.UUIDField(write_only=True)
    shop_name = serializers.CharField(required=False)
    # Add fields to match the incoming data from frontend for validation purposes
    name = serializers.CharField(required=False)
    image = serializers.CharField(required=False)
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    stock = serializers.IntegerField(required=False)
    is_bought = serializers.BooleanField(default=False, required=False)

class OrderSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)
    shop = ShopSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)
    shop_id = serializers.UUIDField(write_only=True, required=False)
    order_items = serializers.SerializerMethodField()

    def get_order_items(self, obj):
        # Ensure that 'is_bought' is included when serializing order_items
        items = obj.order_items
        for item in items:
            if 'is_bought' not in item:
                item['is_bought'] = False
        return items

    class Meta:
        model = Order
        fields = ['id', 'order_id', 'user', 'user_id', 'shop', 'shop_id', 'order_items', 
                 'total_price', 'payment_result', 'is_paid', 'paid_at', 'qr_code', 'qr_valid_until',
                 'balance_amount', 'held_amount', 'final_validity', 'is_verified', 'verified_at',
                 'status', 'expires_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'order_id', 'created_at', 'updated_at', 'qr_code', 'qr_valid_until', 'balance_amount', 'held_amount', 'final_validity', 'is_verified', 'verified_at', 'status', 'expires_at']

    def create(self, validated_data):
        # Handle order_items from request data
        order_items_data = self.context['request'].data.get('order_items', [])
        user = self.context['request'].user
        shop_id = validated_data.get('shop_id')

        # Validate order_items using OrderItemSerializer
        if order_items_data:
            order_item_serializer = OrderItemSerializer(data=order_items_data, many=True)
            order_item_serializer.is_valid(raise_exception=True)
            validated_order_items = order_item_serializer.validated_data
        else:
            validated_order_items = []


        # Determine the shop_id for the order
        if not shop_id:
            if validated_order_items:
                # Try to infer shop_id from the first item's product
                first_product_id = validated_order_items[0].get('product_id')
                if first_product_id:
                    try:
                        first_product = Product.objects.get(id=first_product_id)
                        validated_data['shop_id'] = first_product.shop.id
                    except Product.DoesNotExist:
                        raise serializers.ValidationError(f"Product with ID {first_product_id} does not exist.")
                else:
                    raise serializers.ValidationError("Shop ID is required either at top level or inferable from order_items.")
            else:
                raise serializers.ValidationError("Shop ID is required when no order items are provided.")

        # Ensure all products belong to the same shop
        target_shop_id = validated_data['shop_id']
        calculated_total_price = Decimal('0.0')
        for item_data in validated_order_items:
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity')

            if not product_id or not quantity:
                raise serializers.ValidationError("Product ID and quantity are required for each order item.")

            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with ID {product_id} does not exist.")

            if str(product.shop.id) != str(target_shop_id):
                raise serializers.ValidationError(f"Product {product.name} (ID: {product_id}) does not belong to the target shop (ID: {target_shop_id}).")

            # Use incoming item price if provided; fall back to product price
            incoming_price = item_data.get('price')
            try:
                unit_price = Decimal(str(incoming_price)) if incoming_price is not None else product.price
            except Exception:
                unit_price = product.price
            print(f"[OrderSerializer] calc: product={product.name}, qty={quantity}, unit_price={unit_price}")
            calculated_total_price += unit_price * quantity

        validated_data['total_price'] = calculated_total_price

        # Set user and shop
        validated_data['user'] = user
        try:
            shop = Shop.objects.get(id=target_shop_id)
            validated_data['shop'] = shop
        except Shop.DoesNotExist:
            raise serializers.ValidationError(f"Shop with ID {target_shop_id} does not exist.")

        # Generate order_id in date-token format: YYYYMMDD-XXXX (daily increment)
        try:
            today = timezone.now().date()
            # Find latest order today and increment
            last_today = Order.objects.filter(created_at__date=today).order_by('-created_at').first()
            next_token = 1
            if last_today and last_today.order_id:
                import re
                m = re.search(r"(\d{8})-(\d{3,})", str(last_today.order_id))
                if m:
                    try:
                        next_token = int(m.group(2)) + 1
                    except Exception:
                        next_token = 1
            validated_data['order_id'] = f"{today.strftime('%Y%m%d')}-{next_token:04d}"
        except Exception:
            # Fallback unique id
            validated_data['order_id'] = f"{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        # Debug: print the current QR validity minutes
        print("Shop QR Validity Minutes:", shop.qr_validity_minutes)
        # Calculate QR expiry: now + shop.qr_validity_minutes, but not after shop.final_validity_time
        qr_expiry = timezone.now() + timedelta(minutes=shop.qr_validity_minutes)
        if shop.final_validity_time and qr_expiry > shop.final_validity_time:
            validated_data['expires_at'] = shop.final_validity_time
        else:
            validated_data['expires_at'] = qr_expiry

        # Create the order and perform stock deductions atomically with row-level locks
        with transaction.atomic():
            # Ensure validated_order_items is fully JSON serializable before saving
            serializable_order_items_data = convert_uuids_to_str_recursive(validated_order_items)
            order = Order.objects.create(order_items=serializable_order_items_data, **validated_data)
            print(f"OrderSerializer create - order created: {order}")

            processed_order_items = []
            for item_data in validated_order_items:
                print(f"OrderSerializer create - processing item_data: {item_data}")
                product_id = item_data.get('product_id')
                quantity = item_data.get('quantity')

                if not product_id or not quantity:
                    raise serializers.ValidationError("Product ID and quantity are required for each order item.")

                try:
                    # Lock the row to prevent concurrent modifications
                    product = Product.objects.select_for_update().get(id=product_id)
                    print(f"OrderSerializer create - product found: {product.name}")
                except Product.DoesNotExist:
                    raise serializers.ValidationError(f"Product with ID {product_id} does not exist.")

                # Check stock only for regular stock products, not for live stock
                if product.stock_mode == 'stock':
                    if product.stock < quantity:
                        raise serializers.ValidationError(f"Not enough stock for product {product.name}. Available: {product.stock}, Requested: {quantity}")

                    # Safe in-DB decrement to avoid race conditions
                    updated = Product.objects.filter(id=product.id, stock__gte=quantity).update(stock=F('stock') - quantity)
                    if updated != 1:
                        raise serializers.ValidationError(f"Not enough stock for product {product.name}.")
                    print(f"OrderSerializer create - product stock updated for {product.name}. New stock: {product.stock - quantity}")
                else:
                    # For live stock products, no stock deduction needed
                    print(f"OrderSerializer create - live stock product {product.name}, no stock deduction needed")

                # Add product details to the order item for storage in JSONField
                incoming_price = item_data.get('price')
                try:
                    unit_price = Decimal(str(incoming_price)) if incoming_price is not None else product.price
                except Exception:
                    unit_price = product.price
                print(f"[OrderSerializer] item save: product={product.name}, qty={quantity}, unit_price={unit_price}")
                processed_order_items.append({
                    'product_id': str(product.id),
                    'name': product.name,
                    'image': product.image,
                    'is_bought': False,
                    'price': str(unit_price),
                    'quantity': quantity,
                    'shop_id': str(product.shop.id),
                    'shop_name': product.shop.name,
                })

            order.order_items = processed_order_items
            order.save()
            print(f"OrderSerializer create - order_items saved to order: {order.order_items}")

            # Broadcast stock changes if channels present
            if _channels_available:
                try:
                    from .websocket_utils import broadcast_stock_update
                    for item in processed_order_items:
                        broadcast_stock_update(
                            product_id=str(item['product_id']),
                            stock=int(Product.objects.get(id=item['product_id']).stock),
                            shop_id=str(order.shop.id)
                        )
                except Exception as e:
                    print(f"Failed to broadcast stock update: {e}")

            return order


class MultiShopOrderSerializer:  # removed
    pass


class TransactionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)
    shop = ShopSerializer(read_only=True)
    order = OrderSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)
    shop_id = serializers.UUIDField(write_only=True, required=False)
    order_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = Transaction
        fields = ['id', 'user', 'user_id', 'shop', 'shop_id', 'order', 'order_id', 'amount',
                 'type', 'status', 'payment_method', 'description', 'metadata', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ShopLogSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    shop = ShopSerializer(read_only=True)
    performed_by = UserSerializer(read_only=True)
    shop_id = serializers.UUIDField(write_only=True)
    performed_by_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = ShopLog
        fields = ['id', 'shop', 'shop_id', 'action', 'performed_by', 'performed_by_id', 
                 'details', 'created_at']
        read_only_fields = ['id', 'created_at']


class StudentAnalyticsSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    user = UserSerializer(read_only=True)
    shop = ShopSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)
    shop_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = StudentAnalytics
        fields = ['id', 'user', 'user_id', 'shop', 'shop_id', 'total_spent', 'total_orders',
                 'favorite_products', 'spending_pattern', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']