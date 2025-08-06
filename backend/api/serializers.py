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

    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'stock', 'image', 'category', 'shop', 'shop_id', 
                 'is_available', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


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

class OrderSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    shop = ShopSerializer(read_only=True)
    user_id = serializers.UUIDField(write_only=True, required=False)
    shop_id = serializers.UUIDField(write_only=True, required=False)
    order_items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ['id', 'order_id', 'user', 'user_id', 'shop', 'shop_id', 'order_items', 
                 'total_price', 'payment_result', 'is_paid', 'paid_at', 'qr_code', 'qr_valid_until',
                 'balance_amount', 'held_amount', 'final_validity', 'is_verified', 'verified_at',
                 'status', 'expires_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'order_id', 'created_at', 'updated_at', 'qr_code', 'qr_valid_until', 'balance_amount', 'held_amount', 'final_validity', 'is_verified', 'verified_at', 'status', 'expires_at']

    def create(self, validated_data):
        print(f"OrderSerializer create - validated_data: {validated_data}")
        order_items_data = validated_data.pop('order_items')
        user = self.context['request'].user
        print(f"OrderSerializer create - user: {user}")
        shop_id = validated_data.get('shop_id')
        print(f"OrderSerializer create - shop_id: {shop_id}")

        if not shop_id:
            # If shop_id is not provided at the top level, try to infer it from the first order item
            if order_items_data and isinstance(order_items_data, list) and len(order_items_data) > 0:
                inferred_shop_id = order_items_data[0].get('shop_id')
                if inferred_shop_id:
                    validated_data['shop_id'] = inferred_shop_id
                else:
                    raise serializers.ValidationError("Shop ID is required either at top level or within order_items.")
            else:
                raise serializers.ValidationError("Shop ID is required either at top level or within order_items.")
        
        # Ensure total_price is a Decimal
        total_price = validated_data.get('totalPrice', 0.0) # Use totalPrice from frontend
        print(f"OrderSerializer create - raw totalPrice from frontend: {total_price}")
        validated_data['total_price'] = Decimal(str(total_price))
        print(f"OrderSerializer create - converted total_price: {validated_data['total_price']}")
        
        # Set user and shop
        validated_data['user'] = user
        try:
            shop = Shop.objects.get(id=validated_data['shop_id'])
            validated_data['shop'] = shop
            print(f"OrderSerializer create - shop object: {shop}")
        except Shop.DoesNotExist:
            raise serializers.ValidationError(f"Shop with ID {validated_data['shop_id']} does not exist.")

        # Generate order_id and expires_at
        validated_data['order_id'] = f"ORD-{uuid.uuid4().hex[:10].upper()}"
        validated_data['expires_at'] = timezone.now() + timedelta(minutes=10) # Example: order expires in 10 minutes

        # Create the order
        order = Order.objects.create(**validated_data)
        print(f"OrderSerializer create - order created: {order}")

        # Process order items and calculate total price
        processed_order_items = []
        for item_data in order_items_data:
            print(f"OrderSerializer create - processing item_data: {item_data}")
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity')
            
            if not product_id or not quantity:
                raise serializers.ValidationError("Product ID and quantity are required for each order item.")
            
            try:
                product = Product.objects.get(id=product_id)
                print(f"OrderSerializer create - product found: {product.name}")
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with ID {product_id} does not exist.")
            
            if product.stock < quantity:
                raise serializers.ValidationError(f"Not enough stock for product {product.name}. Available: {product.stock}, Requested: {quantity}")
            
            # Deduct stock
            product.stock -= quantity
            product.save()
            print(f"OrderSerializer create - product stock updated for {product.name}. New stock: {product.stock}")

            # Add product details to the order item for storage in JSONField
            processed_order_items.append({
                'product_id': str(product.id),
                'name': product.name,
                'image': product.image,
                'price': str(product.price),
                'quantity': quantity,
                'shop_id': str(product.shop.id),
                'shop_name': product.shop.name,
            })
        
        order.order_items = processed_order_items
        order.save()
        print(f"OrderSerializer create - order_items saved to order: {order.order_items}")

        return order


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