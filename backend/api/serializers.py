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
        fields = ['id', 'name', 'roll_no', 'email', 'role', 'shop', 'is_verified', 'balance', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['name', 'roll_no', 'email', 'password', 'confirm_password', 'role']

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
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

        # Generate order_id and expires_at
        validated_data['order_id'] = f"ORD-{uuid.uuid4().hex[:10].upper()}"
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
                    channel_layer = get_channel_layer()
                    for item in processed_order_items:
                        async_to_sync(channel_layer.group_send)(
                            'stock_updates',
                            {
                                'type': 'stock_update',
                                'product_id': item['product_id'],
                                'shop_id': str(order.shop.id),
                                'stock': int(Product.objects.get(id=item['product_id']).stock),
                            },
                        )
                except Exception:
                    pass

            return order


class MultiShopOrderSerializer(serializers.ModelSerializer):
    """Serializer for creating orders in multi-shop scenarios"""
    user = UserSerializer(read_only=True)
    shop = ShopSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)
    shop_id = serializers.UUIDField(write_only=True, required=False)
    order_items = serializers.SerializerMethodField()

    def get_order_items(self, obj):
        # Ensure that 'is_bought' is included when serializing order_items
        if hasattr(obj, 'order_items') and obj.order_items:
            return obj.order_items
        return []

    class Meta:
        model = Order
        fields = ['id', 'order_id', 'user', 'user_id', 'shop', 'shop_id', 'order_items', 
                 'total_price', 'payment_result', 'is_paid', 'paid_at', 'qr_code', 'qr_valid_until',
                 'balance_amount', 'held_amount', 'final_validity', 'is_verified', 'verified_at',
                 'status', 'expires_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'order_id', 'created_at', 'updated_at', 'qr_code', 'qr_valid_until', 'balance_amount', 'held_amount', 'final_validity', 'is_verified', 'verified_at', 'status', 'expires_at']

    def create(self, validated_data):
        # Handle order_items passed specifically for this shop via context
        order_items_data = self.context.get('order_items', [])
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

        # For multi-shop orders, we trust that the items have been pre-validated
        # and all belong to the same shop. Just calculate total price.
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

            # Skip shop validation for multi-shop orders - it's handled upstream
            # Use incoming item price if provided; fall back to product price
            incoming_price = item_data.get('price')
            try:
                unit_price = Decimal(str(incoming_price)) if incoming_price is not None else product.price
            except Exception:
                unit_price = product.price
            print(f"[MultiShopOrderSerializer] calc: product={product.name}, qty={quantity}, unit_price={unit_price}")
            calculated_total_price += unit_price * quantity

        validated_data['total_price'] = calculated_total_price

        # Set user and shop
        validated_data['user'] = user
        try:
            shop = Shop.objects.get(id=target_shop_id)
            validated_data['shop'] = shop
        except Shop.DoesNotExist:
            raise serializers.ValidationError(f"Shop with ID {target_shop_id} does not exist.")

        # Generate order_id and expires_at
        validated_data['order_id'] = f"ORD-{uuid.uuid4().hex[:10].upper()}"
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
            print(f"MultiShopOrderSerializer create - order created: {order}")

            processed_order_items = []
            for item_data in validated_order_items:
                print(f"MultiShopOrderSerializer create - processing item_data: {item_data}")
                product_id = item_data.get('product_id')
                quantity = item_data.get('quantity')

                if not product_id or not quantity:
                    raise serializers.ValidationError("Product ID and quantity are required for each order item.")

                try:
                    # Lock the row to prevent concurrent modifications
                    product = Product.objects.select_for_update().get(id=product_id)
                    print(f"MultiShopOrderSerializer create - product found: {product.name}")
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
                    print(f"MultiShopOrderSerializer create - product stock updated for {product.name}. New stock: {product.stock - quantity}")
                else:
                    # For live stock products, no stock deduction needed
                    print(f"MultiShopOrderSerializer create - live stock product {product.name}, no stock deduction needed")

                # Add product details to the order item for storage in JSONField
                incoming_price = item_data.get('price')
                try:
                    unit_price = Decimal(str(incoming_price)) if incoming_price is not None else product.price
                except Exception:
                    unit_price = product.price
                print(f"[MultiShopOrderSerializer] item save: product={product.name}, qty={quantity}, unit_price={unit_price}")
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
            print(f"MultiShopOrderSerializer create - order_items saved to order: {order.order_items}")

            # Broadcast stock changes if channels present
            if _channels_available:
                try:
                    channel_layer = get_channel_layer()
                    for item in processed_order_items:
                        async_to_sync(channel_layer.group_send)(
                            'stock_updates',
                            {
                                'type': 'stock_update',
                                'product_id': item['product_id'],
                                'shop_id': str(order.shop.id),
                                'stock': int(Product.objects.get(id=item['product_id']).stock),
                            },
                        )
                except Exception:
                    pass

            return order


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