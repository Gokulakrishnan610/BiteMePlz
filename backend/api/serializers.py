from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics


class UserSerializer(serializers.ModelSerializer):
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
    shop_admin = UserSerializer(read_only=True)
    shop_admin_id = serializers.UUIDField(write_only=True)
    image = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Shop
        fields = ['id', 'name', 'description', 'location', 'image', 'shop_admin', 'shop_admin_id', 
                 'is_active', 'is_open', 'final_validity_time', 'next_opening_time', 'qr_validity_minutes',
                 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductSerializer(serializers.ModelSerializer):
    shop = ShopSerializer(read_only=True)
    shop_id = serializers.UUIDField(write_only=True)
    image = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'stock', 'image', 'shop', 'shop_id', 
                 'is_available', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class OrderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    shop = ShopSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)
    shop_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Order
        fields = ['id', 'order_id', 'user', 'user_id', 'shop', 'shop_id', 'order_items', 
                 'total_price', 'payment_result', 'is_paid', 'paid_at', 'qr_code', 'qr_valid_until',
                 'balance_amount', 'held_amount', 'final_validity', 'is_verified', 'verified_at',
                 'status', 'expires_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'order_id', 'created_at', 'updated_at']


class TransactionSerializer(serializers.ModelSerializer):
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
    user = UserSerializer(read_only=True)
    shop = ShopSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True)
    shop_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = StudentAnalytics
        fields = ['id', 'user', 'user_id', 'shop', 'shop_id', 'total_spent', 'total_orders',
                 'favorite_products', 'spending_pattern', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at'] 