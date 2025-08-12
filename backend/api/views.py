import qrcode
import uuid
import io
import base64
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction
from django.core.files.storage import default_storage
from django.core.serializers.json import DjangoJSONEncoder
import json
from .models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserLoginSerializer,
    ShopSerializer, ProductSerializer, OrderSerializer, TransactionSerializer,
    ShopLogSerializer, StudentAnalyticsSerializer
)
from .utils import convert_uuids_to_str_recursive
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .authentication import ParentSessionAuthentication  # use dedicated module


class UUIDEncoder(DjangoJSONEncoder):
    def default(self, obj):
        if isinstance(obj, uuid.UUID):
            return str(obj)
        return super().default(obj)


class FileUploadViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def single(self, request):
        if 'image' not in request.FILES:
            return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        file = request.FILES['image']
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type. Only JPEG, PNG, and GIF are allowed'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (10MB limit)
        if file.size > 10 * 1024 * 1024:
            return Response({'error': 'File size too large. Maximum size is 10MB'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Generate unique filename
            filename = f"{uuid.uuid4().hex}_{file.name}"
            
            # Save file
            file_path = default_storage.save(f'uploads/{filename}', file)
            
            return Response({
                'filePath': f'/media/{file_path}',
                'filename': filename
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Upload failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, 'role', None) == 'admin' and getattr(self.request.user, 'is_authenticated', False):
            return User.objects.all()
        elif getattr(self.request.user, 'role', None) == 'shopAdmin' and getattr(self.request.user, 'is_authenticated', False):
            return User.objects.filter(shop=self.request.user.shop)
        else:
            if getattr(self.request.user, 'is_authenticated', False):
                return User.objects.filter(id=self.request.user.id)
            return User.objects.none()

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response({
                '_id': str(user.id),
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'shop': user.shop.id if user.shop else None,
                'balance': float(user.balance),
                'is_sub_admin': False,
                'parent_admin': None,
                'token': str(refresh.access_token),
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def profile(self, request):
        # If regular authenticated user, return real profile
        if getattr(request.user, 'is_authenticated', False):
            serializer = UserSerializer(request.user)
            data = serializer.data
            data['id'] = str(request.user.id)
            if getattr(request.user, 'shop', None):
                data['shop'] = str(request.user.shop.id)
            return Response(data)

        # Parent session (anonymous user with auth set to session_id)
        session_id = getattr(request, 'auth', None)
        if session_id:
            return Response({
                'id': None,
                'name': 'Parent User',
                'email': None,
                'role': 'parent',
                'balance': 0,
                'shop': None,
            })

        # Otherwise unauthorized
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            data = serializer.data
            # Ensure UUIDs are converted to strings
            data['id'] = str(request.user.id)
            if request.user.shop:
                data['shop'] = str(request.user.shop.id)
            return Response(data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def sub_shop_admins(self, request):
        """Get all sub-shop admins for the current user's shop"""
        if request.user.role != 'shopAdmin':
            return Response({'error': 'Only shop admins can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        if not request.user.shop:
            return Response({'error': 'No shop associated with this user'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all users associated with this shop
        sub_admins = User.objects.filter(shop=request.user.shop, role='shopAdmin', is_sub_admin=True)
        serializer = UserSerializer(sub_admins, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def sub_shop_admin(self, request):
        """Create a sub-shop admin for the current user's shop"""
        if request.user.role != 'shopAdmin':
            return Response({'error': 'Only shop admins can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        if not request.user.shop:
            return Response({'error': 'No shop associated with this user'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract data from request
        name = request.data.get('name')
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Validate required fields
        if not all([name, email, password]):
            return Response({'error': 'Name, email, and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            return Response({'error': 'A user with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create sub-shop admin user
        user_data = {
            'name': name,
            'email': email,
            'password': password,
            'confirm_password': password,
            'role': 'shopAdmin',
            'roll_no': f'SUB_ADMIN_{email.split("@")[0]}'
        }
        
        user_serializer = UserRegistrationSerializer(data=user_data)
        if not user_serializer.is_valid():
            return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = user_serializer.save()
        # Set sub-admin flags and link to shop and parent admin
        user.is_verified = True
        user.is_sub_admin = True
        user.parent_admin = request.user
        user.shop = request.user.shop
        user.save()
        return Response({
            'message': 'Sub-shop admin created successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def forgot_password(self, request):
        """Send password reset OTP to user's email"""
        try:
            email = request.data.get('email')
            if not email:
                return Response({'message': 'Order created successfully',
                    'order': convert_uuids_to_str_recursive(order_data)
                }, status=status.HTTP_201_CREATED)
            elif payment_method == 'razorpay':
                import razorpay
                from django.conf import settings
                
                client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                
                razorpay_order = client.order.create({
                    'amount': int(total_price * 100),
                    'currency': 'INR',
                    'receipt': f'order_{uuid.uuid4().hex[:8]}',
                    'payment_capture': 1
                })

                
                order_data = self.get_serializer(order).data
                order_data['_id'] = str(order_data['id'])
                
                return Response({
                    'message': 'Order created successfully',
                    'order': convert_uuids_to_str_recursive(order_data),
                    'razorpay_order_id': razorpay_order['id'],
                    'razorpayKeyId': settings.RAZORPAY_KEY_ID
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': 'Invalid payment method'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verify_reset_otp(self, request):
        """Verify password reset OTP"""
        try:
            user_id = request.data.get('userId')
            otp = request.data.get('otp')
            
            if not user_id or not otp:
                return Response({'error': 'User ID and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            if not user.password_reset_otp:
                return Response({'error': 'No OTP found for this user'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if OTP is expired
            otp_data = user.password_reset_otp
            expires_at = timezone.datetime.fromisoformat(otp_data['expires_at'].replace('Z', '+00:00'))
            if timezone.now() > expires_at:
                return Response({'error': 'OTP has expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify OTP
            if otp_data['otp'] != otp:
                return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate reset token
            import secrets
            reset_token = secrets.token_urlsafe(32)
            user.password_reset_token = {
                'token': reset_token,
                'created_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(minutes=30)).isoformat()
            }
            user.save()
            
            return Response({
                'message': 'OTP verified successfully',
                'resetToken': reset_token
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reset_password(self, request):
        """Reset password using reset token"""
        try:
            reset_token = request.data.get('resetToken')
            new_password = request.data.get('newPassword')
            
            if not reset_token or not new_password:
                return Response({'error': 'Reset token and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Find user with this reset token
            users = User.objects.all()
            user = None
            for u in users:
                if u.password_reset_token and u.password_reset_token.get('token') == reset_token:
                    user = u
                    break
            
            if not user:
                return Response({'error': 'Invalid reset token'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if token is expired
            token_data = user.password_reset_token
            expires_at = timezone.datetime.fromisoformat(token_data['expires_at'].replace('Z', '+00:00'))
            if timezone.now() > expires_at:
                return Response({'error': 'Reset token has expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update password
            user.set_password(new_password)
            user.password_reset_token = None
            user.password_reset_otp = None
            user.save()
            
            return Response({
                'message': 'Password reset successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def resend_reset_otp(self, request):
        """Resend password reset OTP"""
        try:
            user_id = request.data.get('userId')
            
            if not user_id:
                return Response({'error': 'User ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Generate new OTP
            import random
            otp = str(random.randint(100000, 999999))
            otp_data = {
                'otp': otp,
                'created_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(minutes=10)).isoformat()
            }
            
            user.password_reset_otp = otp_data
            user.save()
            
            return Response({
                'message': 'New password reset OTP sent to your email'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def shop_admin(self, request):
        """Create a shop admin user and shop"""
        try:
            # Only the main admin can create shop admins
            if request.user.role != 'admin':
                return Response({'error': 'Only admins can create shop admins'}, status=status.HTTP_403_FORBIDDEN)
            # Extract data from request
            shop_name = request.data.get('shopName')
            shop_description = request.data.get('shopDescription')
            shop_location = request.data.get('shopLocation')
            shop_image = request.data.get('shopImage', '')
            admin_name = request.data.get('name')
            admin_email = request.data.get('email')
            admin_password = request.data.get('password')
            final_validity_time = request.data.get('final_validity_time')
            qr_validity_minutes = request.data.get('qrValidityMinutes', 20)

            # Validate required fields
            if not all([shop_name, shop_description, shop_location, admin_name, admin_email, admin_password]):
                missing_fields = []
                if not shop_name: missing_fields.append('shopName')
                if not shop_description: missing_fields.append('shopDescription')
                if not shop_location: missing_fields.append('shopLocation')
                if not admin_name: missing_fields.append('name')
                if not admin_email: missing_fields.append('email')
                if not admin_password: missing_fields.append('password')
                error_msg = f'Missing required fields: {", ".join(missing_fields)}'
                return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)

            # Create shop admin user
            user_data = {
                'name': admin_name,
                'email': admin_email,
                'password': admin_password,
                'confirm_password': admin_password,
                'role': 'shopAdmin',
                'roll_no': f'SHOP_ADMIN_{admin_email.split("@")[0]}'
            }
            
            user_serializer = UserRegistrationSerializer(data=user_data)
            if not user_serializer.is_valid():
                if 'email' in user_serializer.errors and 'unique' in str(user_serializer.errors['email']):
                    return Response({'error': 'A user with this email already exists. Please use a different email address.'}, status=status.HTTP_400_BAD_REQUEST)
                return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Create user
            user = user_serializer.save()
            user.is_verified = True  # Auto-verify shop admin
            user.save()
            
            # Create shop
            shop_data = {
                'name': shop_name,
                'description': shop_description,
                'location': shop_location,
                'shop_admin_id': user.id,
                'final_validity_time': final_validity_time,
                'next_opening_time': final_validity_time,
                'qr_validity_minutes': qr_validity_minutes
            }
            
            # Only add image if it's not empty
            if shop_image and shop_image.strip():
                shop_data['image'] = shop_image
            
            shop_serializer = ShopSerializer(data=shop_data)
            if not shop_serializer.is_valid():
                # Delete the user if shop creation fails
                user.delete()
                return Response(shop_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            shop = shop_serializer.save()
            
            # Update user with shop reference
            user.shop = shop
            user.save()
            
            return Response({
                'message': 'Shop and admin created successfully',
                'shop': ShopSerializer(shop).data,
                'admin': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': f'Failed to create shop admin: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShopViewSet(viewsets.ModelViewSet):
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = getattr(self.request, 'user', None)
        if getattr(user, 'is_authenticated', False):
            if getattr(user, 'role', None) == 'admin':
                return Shop.objects.all()
            elif getattr(user, 'role', None) == 'shopAdmin' and getattr(user, 'shop', None):
                return Shop.objects.filter(id=user.shop.id)
        # For unauthenticated/parent sessions (homepage), show all shops
        return Shop.objects.all()

    def perform_create(self, serializer):
        shop = serializer.save()
        
        # Log the shop creation
        ShopLog.objects.create(
            shop=shop,
            action='shop_created',
            performed_by=self.request.user,
            details={
                'shop_name': shop.name,
                'shop_admin': shop.shop_admin.name,
                'location': shop.location
            }
        )
        
        return shop

    def perform_update(self, serializer):
        old_shop = self.get_object()
        shop = serializer.save()
        
        # Log the shop update
        ShopLog.objects.create(
            shop=shop,
            action='settings_updated',
            performed_by=self.request.user,
            details={
                'updated_fields': list(serializer.validated_data.keys()),
                'shop_name': shop.name
            }
        )
        
        return shop

    @action(detail=True, methods=['put', 'post'])
    def toggle(self, request, pk=None):
        shop = self.get_object()
        shop.is_open = not shop.is_open
        shop.save()
        
        # Log the action
        ShopLog.objects.create(
            shop=shop,
            action='toggle_open',
            performed_by=request.user,
            details={'is_open': shop.is_open}
        )
        
        return Response(ShopSerializer(shop).data)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get shop analytics data"""
        try:
            shop = self.get_object()
            
            # Get products count
            total_products = Product.objects.filter(shop=shop).count()
            out_of_stock = Product.objects.filter(shop=shop, stock=0).count()
            
            # Get order statistics
            orders = Order.objects.filter(shop=shop)
            total_orders = orders.count()
            total_paid_orders = orders.filter(is_paid=True).count()
            total_verified_orders = orders.filter(is_verified=True).count()
            total_expired_orders = orders.filter(status='expired').count()
            total_revenue = sum(order.total_price for order in orders.filter(is_paid=True))
            
            # Get daily stats for the last 30 days
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
            
            daily_stats = []
            current_date = start_date
            while current_date <= end_date:
                day_orders = orders.filter(created_at__date=current_date.date())
                daily_stats.append({
                    '_id': {'date': current_date.strftime('%Y-%m-%d')},
                    'totalOrders': day_orders.count(),
                    'paidOrders': day_orders.filter(is_paid=True).count(),
                    'verifiedOrders': day_orders.filter(is_verified=True).count(),
                    'expiredOrders': day_orders.filter(status='expired').count(),
                    'revenue': sum(order.total_price for order in day_orders.filter(is_paid=True))
                })
                current_date += timedelta(days=1)
            
            # Get monthly sales for the last 12 months
            monthly_sales = []
            for i in range(12):
                month_date = end_date - timedelta(days=30*i)
                month_orders = orders.filter(
                    created_at__year=month_date.year,
                    created_at__month=month_date.month
                )
                monthly_sales.append({
                    '_id': {'month': month_date.month, 'year': month_date.year},
                    'count': month_orders.count(),
                    'total': sum(order.total_price for order in month_orders.filter(is_paid=True))
                })
            
            # Get top products from order_items JSON
            from collections import defaultdict
            top_products_map = defaultdict(lambda: {'totalSold': 0, 'totalRevenue': Decimal('0')})
            paid_orders = orders.filter(is_paid=True)
            for order in paid_orders:
                items = order.order_items or []
                for item in items:
                    name = item.get('name') or 'Unknown'
                    try:
                        quantity = int(item.get('quantity') or 0)
                    except (TypeError, ValueError):
                        quantity = 0
                    price_val = item.get('price')
                    try:
                        price = Decimal(str(price_val)) if price_val is not None else Decimal('0')
                    except Exception:
                        price = Decimal('0')
                    top_products_map[name]['totalSold'] += quantity
                    top_products_map[name]['totalRevenue'] += (price * quantity)
            
            top_products = [
                {
                    'name': name,
                    'totalSold': data['totalSold'],
                    'totalRevenue': data['totalRevenue']
                }
                for name, data in top_products_map.items()
            ]
            # Sort by revenue desc and limit 10
            top_products.sort(key=lambda x: x['totalRevenue'], reverse=True)
            top_products = top_products[:10]
            
            analytics_data = {
                'totalProducts': total_products,
                'outOfStock': out_of_stock,
                'orderStats': {
                    'totalOrders': total_orders,
                    'totalPaidOrders': total_paid_orders,
                    'totalVerifiedOrders': total_verified_orders,
                    'totalExpiredOrders': total_expired_orders,
                    'totalRevenue': total_revenue
                },
                'dailyStats': daily_stats,
                'monthlySales': monthly_sales,
                'topProducts': top_products
            }
            
            return Response(analytics_data)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['get'])
    def transaction_stats(self, request, pk=None):
        """Get shop transaction statistics"""
        try:
            shop = self.get_object()
            
            # Get transaction statistics by type
            from django.db.models import Count, Avg, Sum
            stats = Transaction.objects.filter(
                order__shop=shop
            ).values('type').annotate(
                count=Count('id'),
                total_amount=Sum('amount'),
                avg_amount=Avg('amount')
            )
            
            # Get daily transaction stats
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30)
            
            daily_stats = []
            current_date = start_date
            while current_date <= end_date:
                day_transactions = Transaction.objects.filter(
                    order__shop=shop,
                    created_at__date=current_date.date()
                )
                
                for transaction_type in ['payment', 'refund']:
                    type_transactions = day_transactions.filter(type=transaction_type)
                    daily_stats.append({
                        '_id': {
                            'date': current_date.strftime('%Y-%m-%d'),
                            'type': transaction_type
                        },
                        'count': type_transactions.count(),
                        'amount': sum(t.amount for t in type_transactions)
                    })
                
                current_date += timedelta(days=1)
            
            transaction_stats = {
                'stats': [
                    {
                        '_id': stat['type'],
                        'count': stat['count'],
                        'totalAmount': stat['total_amount'],
                        'avgAmount': stat['avg_amount']
                    }
                    for stat in stats
                ],
                'dailyStats': daily_stats
            }
            
            return Response(transaction_stats)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def debug(self, request):
        """Debug endpoint to check shops data"""
        try:
            all_shops = Shop.objects.all()
            active_shops = Shop.objects.filter(is_active=True)
            open_shops = Shop.objects.filter(is_open=True)

            is_auth = getattr(request, 'user', None)
            is_auth_flag = getattr(is_auth, 'is_authenticated', False)
            role = getattr(is_auth, 'role', 'anonymous') if is_auth_flag else 'anonymous'

            debug_data = {
                'total_shops': all_shops.count(),
                'active_shops': active_shops.count(),
                'open_shops': open_shops.count(),
                'all_shops_data': [
                    {
                        'id': str(shop.id),
                        'name': shop.name,
                        'is_active': shop.is_active,
                        'is_open': shop.is_open,
                        'location': shop.location
                    } for shop in all_shops
                ],
                'user_authenticated': is_auth_flag,
                'user_role': role
            }

            return Response(debug_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        shop_id = self.request.query_params.get('shop_id') or self.request.query_params.get('shop')
        if shop_id:
            return Product.objects.filter(shop=shop_id, is_available=True)
        return Product.objects.filter(is_available=True)

    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        """Custom create method to validate shop_id for shop admins"""
        try:
            # Get the data
            data = request.data.copy()
            shop_id = data.get('shop_id')
            
            # Validate shop_id for shop admins
            if request.user.role == 'shopAdmin':
                if not shop_id:
                    return Response({'error': 'Shop ID is required for shop admins'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Ensure shop admin can only create products for their own shop
                if str(request.user.shop.id) != str(shop_id):
                    return Response({'error': 'You can only create products for your own shop'}, status=status.HTTP_403_FORBIDDEN)
                
                # Verify shop exists
                try:
                    shop = Shop.objects.get(id=shop_id)
                except Shop.DoesNotExist:
                    return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Create the product
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Remove the perform_create method override since OrderSerializer handles it
    # def perform_create(self, serializer):
    #     # This is handled by the OrderSerializer's create method
    #     pass


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        # Allow parent sessions to access these without JWT
        if self.action in ['create', 'myorders', 'verify_payment']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    def get_queryset(self):
        if getattr(self.request.user, 'role', None) in ['admin', 'shopAdmin'] and getattr(self.request.user, 'is_authenticated', False):
            return Order.objects.all()
        if getattr(self.request.user, 'is_authenticated', False):
            return Order.objects.filter(user=self.request.user)
        # For parent session, no listing here (use myorders which returns [])
        return Order.objects.none()

    def _get_or_create_parent_guest_user(self) -> User:
        # A shared guest user for parent sessions
        email = 'parent-guest@kiosk.local'
        roll_no = 'PARENT_GUEST'
        defaults = {
            'username': 'parent_guest',
            'name': 'Parent Guest',
            'role': 'student',
            'is_verified': True,
        }
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = User.objects.create_user(email=email, password=None, roll_no=roll_no, **defaults)
        return user

    def perform_create(self, serializer):
        # Determine acting user: real authenticated user or parent guest
        if getattr(self.request.user, 'is_authenticated', False):
            acting_user = self.request.user
        else:
            # Require parent session id to proceed
            if not getattr(self.request, 'auth', None):
                raise PermissionError('Unauthorized')
            acting_user = self._get_or_create_parent_guest_user()
        # Ensure order saved with acting_user
        order = serializer.save(user=acting_user)
        return order

    def create(self, request, *args, **kwargs):
        """Create a single shop order"""
        try:
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            try:
                # Use perform_create to ensure QR code and related fields are generated
                order = self.perform_create(serializer)
            except PermissionError:
                return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Handle payment based on method
            payment_method = request.data.get('paymentMethod', 'balance')
            total_price = order.total_price

            # If this is a parent session (anonymous), disallow balance payments
            is_parent_session = not getattr(request.user, 'is_authenticated', False) and bool(getattr(request, 'auth', None))
            if is_parent_session and payment_method == 'balance':
                return Response({'error': 'Parent session cannot pay with balance. Use razorpay.'}, status=status.HTTP_400_BAD_REQUEST)

            if payment_method == 'balance':
                if request.user.balance < total_price:
                    return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
                request.user.balance -= total_price
                request.user.save()
                order.is_paid = True
                order.paid_at = timezone.now()
                order.payment_result = {'method': 'balance', 'status': 'success'}
                order.save()
                Transaction.objects.create(
                    user=order.user,
                    shop=order.shop,
                    order=order,
                    amount=order.total_price,
                    type='payment',
                    payment_method='balance',
                    description=f'Payment for order {order.order_id}'
                )
                order_data = self.get_serializer(order).data
                order_data['_id'] = str(order_data['id'])
                return Response({'message': 'Order created successfully', 'order': order_data}, status=status.HTTP_201_CREATED)

            elif payment_method == 'razorpay':
                import razorpay
                from django.conf import settings
                client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                razorpay_order = client.order.create({
                    'amount': int(total_price * 100),
                    'currency': 'INR',
                    'receipt': f'order_{uuid.uuid4().hex[:8]}',
                    'payment_capture': 1
                })
                order.payment_result = {
                    'method': 'razorpay',
                    'status': 'pending',
                    'razorpay_order_id': razorpay_order['id']
                }
                order.save()
                order_data = self.get_serializer(order).data
                order_data['_id'] = str(order_data['id'])
                return Response({
                    'message': 'Order created successfully',
                    'order': order_data,
                    'razorpay_order_id': razorpay_order['id'],
                    'razorpayKeyId': settings.RAZORPAY_KEY_ID
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': 'Invalid payment method'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def myorders(self, request):
        """Get orders for the current user or return empty for parent session"""
        try:
            # Parent session (anonymous) should get empty list
            if not getattr(request.user, 'is_authenticated', False):
                return Response([])

            orders = Order.objects.filter(user=request.user).order_by('-created_at')

            # Auto-expire any paid, unverified, pending orders whose validity has passed
            now = timezone.now()
            for order in orders:
                try:
                    if (
                        order.is_paid
                        and not order.is_verified
                        and order.status == 'pending'
                        and order.expires_at
                        and order.expires_at < now
                    ):
                        with transaction.atomic():
                            order.status = 'expired'
                            order.save()
                            # Return amount to wallet
                            user = order.user
                            user.balance += order.total_price
                            user.save()
                            # Log refund transaction
                            Transaction.objects.create(
                                user=user,
                                shop=order.shop,
                                order=order,
                                amount=order.total_price,
                                type='credit',
                                status='success',
                                payment_method='balance',
                                description=f'Order {order.order_id} expired, amount returned to wallet.'
                            )
                except Exception:
                    pass

            # Group multi-shop sibling orders by their combined QR string (identical across siblings)
            grouped = {}
            for order in orders:
                qr_key = None
                try:
                    payload = json.loads(order.qr_code or '{}')
                    if isinstance(payload, dict) and payload.get('type') == 'multi_order':
                        qr_key = order.qr_code
                except Exception:
                    pass

                if qr_key is None:
                    # Treat as standalone entry (single shop order)
                    grouped_key = f"single::{order.id}"
                    grouped[grouped_key] = {
                        '_id': str(order.id),
                        'order_id': order.order_id,
                        'total_price': float(order.total_price),
                        'is_paid': order.is_paid,
                        'is_verified': order.is_verified,
                        'status': order.status,
                        'order_items': order.order_items,
                        'qr_code': order.qr_code,
                        'qr_valid_until': order.qr_valid_until.isoformat() if order.qr_valid_until else None,
                        'balance_amount': float(order.balance_amount),
                        'final_validity': order.final_validity.isoformat() if order.final_validity else None,
                        'createdAt': order.created_at.isoformat() if order.created_at else None,
                        'payment_result': order.payment_result,
                    }
                    continue

                # Initialize group entry if first time seen
                if qr_key not in grouped:
                    grouped[qr_key] = {
                        '_id': str(order.id),  # representative id for details routing
                        'order_id': order.order_id,
                        'total_price': 0.0,
                        'is_paid': True,      # will be ANDed across siblings
                        'is_verified': True,  # will be ANDed across siblings
                        'status': 'pending',
                        'order_items': [],
                        'qr_code': order.qr_code,
                        'qr_valid_until': order.qr_valid_until.isoformat() if order.qr_valid_until else None,
                        'balance_amount': 0.0,
                        'final_validity': order.final_validity.isoformat() if order.final_validity else None,
                        'createdAt': order.created_at.isoformat() if order.created_at else None,
                        'payment_result': order.payment_result,
                        '_order_statuses': [],  # internal helper
                    }

                entry = grouped[qr_key]
                entry['total_price'] += float(order.total_price)
                entry['is_paid'] = entry['is_paid'] and order.is_paid
                entry['is_verified'] = entry['is_verified'] and order.is_verified
                entry['order_items'].extend(order.order_items or [])
                entry['balance_amount'] += float(order.balance_amount or 0)
                entry['_order_statuses'].append(order.status)

                # Keep earliest qr_valid_until within the group
                if order.qr_valid_until:
                    if not entry['qr_valid_until']:
                        entry['qr_valid_until'] = order.qr_valid_until.isoformat()
                    else:
                        try:
                            from datetime import datetime
                            current = datetime.fromisoformat(entry['qr_valid_until'].replace('Z', '+00:00'))
                            if order.qr_valid_until < current:
                                entry['qr_valid_until'] = order.qr_valid_until.isoformat()
                        except Exception:
                            entry['qr_valid_until'] = order.qr_valid_until.isoformat()

            # Finalize statuses for grouped entries
            orders_data = []
            for key, entry in grouped.items():
                if '_order_statuses' in entry:
                    statuses = entry.pop('_order_statuses')
                    if any(s == 'expired' for s in statuses):
                        entry['status'] = 'expired'
                    elif all(s == 'completed' for s in statuses):
                        entry['status'] = 'completed'
                    else:
                        entry['status'] = 'pending'
                orders_data.append(entry)

            # Maintain reverse chronological order by createdAt
            orders_data.sort(key=lambda x: x.get('createdAt') or '', reverse=True)
            return Response(orders_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def shop(self, request):
        """Get orders for a specific shop"""
        shop_id = request.query_params.get('shop_id') or request.query_params.get('id')
        if not shop_id:
            return Response({'error': 'Shop ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            orders = Order.objects.filter(shop=shop_id)
            # Convert orders to dictionaries with proper UUID handling
            orders_data = []
            for order in orders:
                order_dict = {
                    '_id': str(order.id),
                    'order_id': order.order_id,
                    'user': {
                        'name': order.user.name,
                        'email': order.user.email,
                        'rollNo': order.user.roll_no,
                    },
                    'total_price': float(order.total_price),
                    'is_paid': order.is_paid,
                    'is_verified': order.is_verified,
                    'status': order.status,
                    'order_items': order.order_items,
                    'createdAt': order.created_at.isoformat() if order.created_at else None,
                }
                orders_data.append(order_dict)
            return Response(orders_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    @action(detail=False, methods=['post'])
    def multi_shop(self, request):
        """Create orders for multiple shops in a single request.

        Generates a single combined QR payload (containing per-shop order ids, shop names, and item
        summaries) and stores that same QR on each created order.
        """
        try:
            # Extract data from request
            order_items = request.data.get('order_items', [])
            payment_method = request.data.get('paymentMethod', 'balance')
            
            if not order_items:
                return Response({'error': 'Order items are required'}, status=status.HTTP_400_BAD_REQUEST)

            from decimal import Decimal

            # Group items by shop
            items_by_shop = {}
            for item in order_items:
                shop_id = item.get('shop_id')
                if not shop_id:
                    return Response({'error': 'Shop ID is required for each item'}, status=status.HTTP_400_BAD_REQUEST)
                
                if shop_id not in items_by_shop:
                    items_by_shop[shop_id] = []
                
                items_by_shop[shop_id].append(item)
            
            # Create an order for each shop
            orders = []
            total_price = Decimal('0.0')
            
            with transaction.atomic():
                for shop_id, items in items_by_shop.items():
                    # Validate that all items in this shop group belong to the same shop
                    for item in items:
                        product_id = item.get('product_id')
                        if product_id:
                            try:
                                product = Product.objects.get(id=product_id)
                                if str(product.shop.id) != str(shop_id):
                                    raise Exception(f"Product {product.name} (ID: {product_id}) does not belong to the target shop (ID: {shop_id}).")
                            except Product.DoesNotExist:
                                raise Exception(f"Product with ID {product_id} does not exist.")
                    
                    # Create order data with only the items for this specific shop
                    order_data = {
                        'shop_id': shop_id,
                        'order_items': items
                    }
                    
                    # Create serializer with context - use MultiShopOrderSerializer for multi-shop orders
                    from .serializers import MultiShopOrderSerializer
                    serializer = MultiShopOrderSerializer(data=order_data, context={'request': request, 'order_items': items})
                    serializer.is_valid(raise_exception=True)
                    
                    # Create order using the serializer's create method
                    order = serializer.save()

                    orders.append(order)
                    total_price += order.total_price
                    print(f"[multi_shop] created order for shop {shop_id} total={order.total_price}")

                # Generate one combined QR after creating all orders and attach to each order
                try:
                    combined_qr_orders = []
                    for o in orders:
                        # Prepare item summaries for QR
                        try:
                            item_summary = [
                                {
                                    'name': it.get('name'),
                                    'quantity': it.get('quantity'),
                                }
                                for it in (o.order_items or [])
                            ]
                        except Exception:
                            item_summary = []

                        combined_qr_orders.append({
                            'order_id': o.order_id,
                            'shop_id': str(o.shop.id),
                            'shop_name': o.shop.name,
                            'items': item_summary,
                        })

                    combined_qr_payload = {
                        'type': 'multi_order',
                        'user_id': str(request.user.id),
                        'total_price': str(total_price),
                        'orders': combined_qr_orders,
                    }

                    combined_qr_str = json.dumps(combined_qr_payload)
                    for o in orders:
                        o.qr_code = combined_qr_str
                        o.qr_valid_until = o.expires_at
                        o.save()
                except Exception:
                    # Non-fatal if QR generation fails
                    pass
                
                # Process payment if using balance
                if payment_method == 'balance':
                    if request.user.balance < total_price:
                        raise Exception('Insufficient balance')
                    
                    # Deduct from balance
                    request.user.balance -= total_price
                    request.user.save()
                    
                    # Mark orders as paid
                    for order in orders:
                        order.is_paid = True
                        order.paid_at = timezone.now()
                        order.payment_result = {'method': 'balance', 'status': 'success'}
                        order.save()
                        
                        # Create transaction
                        Transaction.objects.create(
                            user=order.user,
                            shop=order.shop,
                            order=order,
                            amount=order.total_price,
                            type='payment',
                            payment_method='balance',
                            description=f'Payment for order {order.order_id}'
                        )
                elif payment_method == 'razorpay':
                    # For Razorpay, we'll create the orders but not mark them as paid yet
                    # The frontend will handle the payment process and call the pay endpoint
                    import razorpay
                    from django.conf import settings
                    
                    # Initialize Razorpay client
                    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                    
                    # Create Razorpay order
                    print(f"[multi_shop] total_price all orders={total_price}, paise={int(total_price * 100)}")
                    razorpay_order = client.order.create({
                        'amount': int(total_price * 100),  # Amount in paise
                        'currency': 'INR',
                        'receipt': f'order_{uuid.uuid4().hex[:8]}',
                        'payment_capture': 1  # Auto-capture
                    })
                    
                    # Tag each order with the shared Razorpay order id (pending status)
                    for o in orders:
                        o.payment_result = {
                            'method': 'razorpay',
                            'status': 'pending',
                            'razorpay_order_id': razorpay_order['id']
                        }
                        o.save()
                    
                    # Prepare response orders data with `_id`
                    from .serializers import MultiShopOrderSerializer as _MS
                    orders_data = _MS(orders, many=True).data
                    for od in orders_data:
                        od['_id'] = str(od['id'])
                    
                    # Return response with Razorpay order details
                    return Response({
                        'message': 'Orders created successfully',
                        'orders': orders_data,
                        'razorpay_order_id': razorpay_order['id'],
                        'razorpayKeyId': settings.RAZORPAY_KEY_ID
                    }, status=status.HTTP_201_CREATED)
            
            # Prepare response orders data with `_id` for balance flow
            from .serializers import MultiShopOrderSerializer as _MS2
            orders_data = _MS2(orders, many=True).data
            for od in orders_data:
                od['_id'] = str(od['id'])
            
            # Return response for balance payment
            return Response({
                'message': 'Orders created successfully',
                'orders': orders_data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def scan_qr_code(self, request):
        """Scan a QR code and return the associated order details."""
        qr_code_data = request.data.get('qr_code_data')
        if not qr_code_data:
            return Response({'error': 'QR code data is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # QR code data is a JSON string, so parse it
            qr_payload = json.loads(qr_code_data)
            order_id = qr_payload.get('order_id')

            if not order_id:
                return Response({'error': 'Order ID not found in QR code data'}, status=status.HTTP_400_BAD_REQUEST)

            order = Order.objects.get(order_id=order_id)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid QR code data format'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        # The serializer already handles order creation, so we just need to handle post-creation tasks
        order = serializer.save()
        
        # Generate QR payload as JSON string for frontend to render and scanners to parse
        # Enrich payload with shop name and item summaries
        try:
            items_for_qr = [
                {
                    'name': item.get('name'),
                    'quantity': item.get('quantity'),
                }
                for item in (order.order_items or [])
            ]
        except Exception:
            items_for_qr = []

        qr_data = {
            'type': 'single_order',
            'order_id': order.order_id,
            'user_id': str(order.user.id),
            'shop_id': str(order.shop.id),
            'shop_name': order.shop.name,
            'total_price': str(order.total_price),
            'items': items_for_qr,
        }

        # Store JSON string so the frontend can render a QR from this payload directly
        order.qr_code = json.dumps(qr_data)
        order.qr_valid_until = order.expires_at
        order.save()
        
        return order

    @action(detail=True, methods=['patch'])
    def mark_item_bought(self, request, pk=None):
        """Mark specific items within an order as bought."""
        try:
            # Try to get order by UUID first, then by order_id
            try:
                order = self.get_object()
            except:
                # If that fails, try to get by order_id
                try:
                    order = Order.objects.get(order_id=pk)
                except Order.DoesNotExist:
                    return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
            
            item_ids_to_mark = request.data.get('item_ids', [])

            if not item_ids_to_mark:
                return Response({'error': 'No item IDs provided to mark as bought'}, status=status.HTTP_400_BAD_REQUEST)

            updated_items = []
            for item_id in item_ids_to_mark:
                found = False
                for item in order.order_items:
                    if str(item.get('product_id')) == str(item_id):
                        # Check if item is already bought
                        if item.get('is_bought', False):
                            return Response({'error': f'Item {item.get("name", "Unknown")} is already marked as bought'}, status=status.HTTP_400_BAD_REQUEST)
                        
                        item['is_bought'] = True
                        updated_items.append(item)
                        found = True
                        break
                if not found:
                    return Response({'error': f'Item with ID {item_id} not found in order'}, status=status.HTTP_404_NOT_FOUND)

            order.save()  # Save the updated order_items
            serializer = self.get_serializer(order)
            return Response(serializer.data)

        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def scan_qr(self, request, pk=None):
        """Scan a QR code and return order details without marking as verified."""
        try:
            # Try to get order by UUID first, then by order_id
            try:
                order = self.get_object()
            except:
                # If that fails, try to get by order_id
                try:
                    order = Order.objects.get(order_id=pk)
                except Order.DoesNotExist:
                    return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Return order details without marking as verified
            serializer = self.get_serializer(order)
            return Response(serializer.data)
            
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def group_details(self, request, pk=None):
        """Return combined details for a multi-shop order group using the combined QR payload.

        If the order has a combined QR (type == 'multi_order'), this returns:
        {
          combined_qr: str,
          total_price: str,
          shops: [{ order_id, shop_id, shop_name, is_paid, is_verified, total_price, items: [...] }]
        }
        Otherwise, returns a single-shop structure with the current order only.
        """
        try:
            # Try to get order by UUID first, then by order_id
            try:
                order = self.get_object()
            except Exception:
                order = Order.objects.get(order_id=pk)

            # Parse QR payload
            try:
                qr_payload = json.loads(order.qr_code or '{}')
            except Exception:
                qr_payload = {}

            # If not a multi-order QR, just return current order wrapped in shops list
            if not isinstance(qr_payload, dict) or qr_payload.get('type') != 'multi_order':
                shop_entry = {
                    'order_id': order.order_id,
                    'shop_id': str(order.shop.id),
                    'shop_name': order.shop.name,
                    'is_paid': order.is_paid,
                    'is_verified': order.is_verified,
                    'total_price': str(order.total_price),
                    'items': order.order_items or [],
                }
                return Response({
                    'combined_qr': order.qr_code,
                    'total_price': str(order.total_price),
                    'shops': [shop_entry],
                })

            # Resolve sibling orders from the payload's orders[] list for authoritative mapping
            shops = []
            total = Decimal('0.0')
            orders_list = qr_payload.get('orders') or []
            for entry in orders_list:
                oid = entry.get('order_id')
                if not oid:
                    continue
                try:
                    o = Order.objects.get(order_id=oid)
                except Order.DoesNotExist:
                    # Skip missing orders
                    continue
                shops.append({
                    'order_id': o.order_id,
                    'shop_id': str(o.shop.id),
                    'shop_name': o.shop.name,
                    'is_paid': o.is_paid,
                    'is_verified': o.is_verified,
                    'total_price': str(o.total_price),
                    'items': o.order_items or [],
                })
                total += o.total_price

            return Response({
                'combined_qr': order.qr_code,
                'total_price': str(total),
                'shops': shops,
            })
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['put'])
    def verify(self, request, pk=None):
        # Try to get order by UUID first, then by order_id
        try:
            # First try to get by UUID (primary key)
            order = self.get_object()
        except:
            # If that fails, try to get by order_id
            try:
                order = Order.objects.get(order_id=pk)
            except Order.DoesNotExist:
                return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if order.is_verified:
            return Response({'error': 'Order already verified'}, status=status.HTTP_400_BAD_REQUEST)
        
        if order.status == 'expired':
            return Response({'error': 'Order has expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as verified
        order.is_verified = True
        order.verified_at = timezone.now()
        order.status = 'completed'
        order.save()
        
        # Create transaction for verification
        Transaction.objects.create(
            user=order.user,
            shop=order.shop,
            order=order,
            amount=order.total_price,
            type='verification',
            description=f'Order verification for {order.order_id}'
        )
        
        return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['put'])
    def pay(self, request, pk=None):
        print(f"[DEBUG] Pay method called for order ID: {pk}")
        print(f"[DEBUG] Request data: {request.data}")
        print(f"[DEBUG] Request headers: {request.headers}")
        print(f"[DEBUG] User authenticated: {request.user.is_authenticated}")
        print(f"[DEBUG] User: {request.user}")
        
        # Check authentication
        if not request.user.is_authenticated:
            print("[DEBUG] User not authenticated!")
            return Response({'error': 'Authentication credentials were not provided'}, status=status.HTTP_401_UNAUTHORIZED)
        
        order = self.get_object()
        print(f"[DEBUG] Found order: {order.order_id}, is_paid: {order.is_paid}")
        
        if order.is_paid:
            return Response({'error': 'Order already paid'}, status=status.HTTP_400_BAD_REQUEST)
        
        payment_method = request.data.get('payment_method', 'balance')
        # If Razorpay identifiers are present, force razorpay flow regardless of provided/default method
        if request.data.get('razorpay_payment_id') or request.data.get('razorpay_order_id'):
            payment_method = 'razorpay'
        
        with transaction.atomic():
            if payment_method == 'balance':
                if order.user.balance < order.total_price:
                    return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Deduct from balance
                order.user.balance -= order.total_price
                order.user.save()
                
                # Mark as paid
                order.is_paid = True
                order.paid_at = timezone.now()
                order.payment_result = {'method': 'balance', 'status': 'success'}
                order.save()
                
                # Create transaction
                Transaction.objects.create(
                    user=order.user,
                    shop=order.shop,
                    order=order,
                    amount=order.total_price,
                    type='payment',
                    payment_method='balance',
                    description=f'Payment for order {order.order_id}'
                )
            elif payment_method == 'razorpay' or request.data.get('razorpay_payment_id'):
                # Verify Razorpay payment
                razorpay_payment_id = request.data.get('razorpay_payment_id')
                razorpay_order_id = request.data.get('razorpay_order_id')
                razorpay_signature = request.data.get('razorpay_signature')
                
                print(f"[DEBUG] Razorpay payment verification - Payment ID: {razorpay_payment_id}, Order ID: {razorpay_order_id}")
                print(f"[DEBUG] Signature length: {len(razorpay_signature) if razorpay_signature else 0}")
                
                if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
                    missing_fields = []
                    if not razorpay_payment_id:
                        missing_fields.append('razorpay_payment_id')
                    if not razorpay_order_id:
                        missing_fields.append('razorpay_order_id')
                    if not razorpay_signature:
                        missing_fields.append('razorpay_signature')
                    
                    print(f"[DEBUG] Missing fields: {missing_fields}")
                    return Response({'error': f'Missing Razorpay payment details: {missing_fields}'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Import Razorpay if needed
                import razorpay
                from django.conf import settings
                
                # Initialize Razorpay client
                client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                
                # Verify signature
                try:
                    params_dict = {
                        'razorpay_order_id': razorpay_order_id,
                        'razorpay_payment_id': razorpay_payment_id,
                        'razorpay_signature': razorpay_signature
                    }
                    
                    print(f"[DEBUG] Verifying signature with params: {params_dict}")
                    print(f"[DEBUG] Using Razorpay keys - Key ID: {settings.RAZORPAY_KEY_ID}")
                    
                    client.utility.verify_payment_signature(params_dict)
                    print(f"[DEBUG] Signature verification successful")
                    
                    # Mark as paid
                    order.is_paid = True
                    order.paid_at = timezone.now()
                    order.payment_result = {
                        'method': 'razorpay',
                        'status': 'success',
                        'razorpay_payment_id': razorpay_payment_id,
                        'razorpay_order_id': razorpay_order_id,
                        'razorpay_signature': razorpay_signature
                    }
                    order.save()
                    
                    # Also mark sibling orders (multi-shop) with same razorpay_order_id as paid
                    siblings = Order.objects.filter(payment_result__razorpay_order_id=razorpay_order_id, is_paid=False)
                    for s in siblings:
                        s.is_paid = True
                        s.paid_at = timezone.now()
                        s.payment_result = {
                            'method': 'razorpay',
                            'status': 'success',
                            'razorpay_payment_id': razorpay_payment_id,
                            'razorpay_order_id': razorpay_order_id,
                            'razorpay_signature': razorpay_signature
                        }
                        s.save()
                        Transaction.objects.create(
                            user=s.user,
                            shop=s.shop,
                            order=s,
                            amount=s.total_price,
                            type='payment',
                            payment_method='razorpay',
                            description=f'Razorpay payment for order {s.order_id}'
                        )
                    
                    # Create transaction
                    Transaction.objects.create(
                        user=order.user,
                        shop=order.shop,
                        order=order,
                        amount=order.total_price,
                        type='payment',
                        payment_method='razorpay',
                        description=f'Razorpay payment for order {order.order_id}'
                    )
                    
                    print(f"[DEBUG] Payment processed successfully for order {order.order_id}")
                    
                    return Response({
                        'message': 'Payment successful',
                        'order': convert_uuids_to_str_recursive(self.get_serializer(order).data)
                    }, status=status.HTTP_200_OK)
                    
                except razorpay.errors.SignatureVerificationError as e:
                    print(f"[DEBUG] Signature verification failed: {str(e)}")
                    return Response({'error': f'Payment signature verification failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
                except razorpay.errors.BadRequestError as e:
                    print(f"[DEBUG] Razorpay bad request error: {str(e)}")
                    return Response({'error': f'Invalid payment data: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
                except razorpay.errors.ServerError as e:
                    print(f"[DEBUG] Razorpay server error: {str(e)}")
                    return Response({'error': f'Razorpay server error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                except Exception as e:
                    print(f"[DEBUG] Unexpected error during payment verification: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    return Response({'error': f'Payment verification failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(OrderSerializer(order).data)

    @action(detail=True, methods=['put'])
    def cancel(self, request, pk=None):
        """Cancel an order"""
        order = self.get_object()
        
        if order.is_paid:
            return Response({'error': 'Cannot cancel a paid order'}, status=status.HTTP_400_BAD_REQUEST)
        
        if order.status == 'cancelled':
            return Response({'error': 'Order is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = 'cancelled'
        order.save()
        
        return Response({'message': 'Order cancelled successfully'})

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verify_payment(self, request):
        """Verify Razorpay payment and mark order as paid.
        Accepts: razorpay_order_id, razorpay_payment_id, razorpay_signature
        """
        try:
            razorpay_order_id = request.data.get('razorpay_order_id')
            razorpay_payment_id = request.data.get('razorpay_payment_id')
            razorpay_signature = request.data.get('razorpay_signature')
            if not (razorpay_order_id and razorpay_payment_id and razorpay_signature):
                return Response({'error': 'Missing payment verification fields'}, status=status.HTTP_400_BAD_REQUEST)

            # Find order with matching stored razorpay_order_id
            order = Order.objects.filter(payment_result__razorpay_order_id=razorpay_order_id).order_by('-created_at').first()
            if not order:
                return Response({'error': 'Order not found for given razorpay_order_id'}, status=status.HTTP_404_NOT_FOUND)

            # Verify signature with Razorpay
            import razorpay
            from django.conf import settings
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            try:
                client.utility.verify_payment_signature({
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_signature': razorpay_signature,
                })
            except Exception as e:
                return Response({'error': 'Payment signature verification failed', 'details': str(e)}, status=status.HTTP_400_BAD_REQUEST)

            # Mark order as paid
            order.is_paid = True
            order.paid_at = timezone.now()
            pr = order.payment_result or {}
            pr.update({
                'status': 'success',
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
            })
            order.payment_result = pr
            order.save()

            # Create transaction record
            Transaction.objects.create(
                user=order.user,
                shop=order.shop,
                order=order,
                amount=order.total_price,
                type='payment',
                payment_method='razorpay',
                description=f'Razorpay payment verified for order {order.order_id}'
            )

            data = self.get_serializer(order).data
            data['_id'] = str(order.id)
            return Response({'message': 'Payment verified', 'order': data}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['admin', 'shopAdmin']:
            return Transaction.objects.all()
        return Transaction.objects.filter(user=self.request.user)


class ShopLogViewSet(viewsets.ModelViewSet):
    queryset = ShopLog.objects.all()
    serializer_class = ShopLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return ShopLog.objects.all()
        elif self.request.user.role == 'shopAdmin':
            return ShopLog.objects.filter(shop__shop_admin=self.request.user)
        return ShopLog.objects.none()


class StudentAnalyticsViewSet(viewsets.ModelViewSet):
    queryset = StudentAnalytics.objects.all()
    serializer_class = StudentAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['admin', 'shopAdmin']:
            return StudentAnalytics.objects.all()
        return StudentAnalytics.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_analytics(self, request):
        analytics, created = StudentAnalytics.objects.get_or_create(
            user=request.user,
            defaults={
                'total_spent': 0,
                'total_orders': 0,
                'favorite_products': [],
                'spending_pattern': {}
            }
        )
        return Response(StudentAnalyticsSerializer(analytics).data)

class CreateSessionView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [ParentSessionAuthentication]

    def options(self, request, *args, **kwargs):
        """Handle CORS preflight OPTIONS request"""
        response = Response()
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, X-Parent-Session-ID, x-parent-session-id"
        response["Access-Control-Max-Age"] = "86400"
        return response

    def post(self, request):
        """Create a temporary session for parent users"""
        try:
            session_id = str(uuid.uuid4())
            return Response({
                'session_id': session_id,
                'message': 'Session created successfully',
                'expires_in': '24 hours'
            })
        except Exception as e:
            return Response({
                'error': 'Failed to create session',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
