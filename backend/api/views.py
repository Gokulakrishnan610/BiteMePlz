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
from .models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserLoginSerializer,
    ShopSerializer, ProductSerializer, OrderSerializer, TransactionSerializer,
    ShopLogSerializer, StudentAnalyticsSerializer
)


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
        if self.request.user.role == 'admin':
            return User.objects.all()
        elif self.request.user.role == 'shopAdmin':
            return User.objects.filter(shop=self.request.user.shop)
        else:
            return User.objects.filter(id=self.request.user.id)

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

    @action(detail=False, methods=['get'])
    def profile(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def sub_shop_admins(self, request):
        """Get all sub-shop admins for the current user's shop"""
        if request.user.role != 'shopAdmin':
            return Response({'error': 'Only shop admins can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)
        
        if not request.user.shop:
            return Response({'error': 'No shop associated with this user'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all users associated with this shop
        sub_admins = User.objects.filter(shop=request.user.shop, role='shopAdmin')
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
            'roll_no': f'SUB_ADMIN_{email.split("@")[0]}',
            'shop': request.user.shop,
            'is_verified': True  # Sub-admins are pre-verified
        }
        
        user_serializer = UserRegistrationSerializer(data=user_data)
        if not user_serializer.is_valid():
            return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = user_serializer.save()
        
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
                return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({'error': 'No user found with this email address'}, status=status.HTTP_404_NOT_FOUND)
            
            # Generate OTP
            import random
            otp = str(random.randint(100000, 999999))
            otp_data = {
                'otp': otp,
                'created_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(minutes=10)).isoformat()
            }
            
            user.password_reset_otp = otp_data
            user.save()
            
            # Send OTP email (you can implement this later)
            # For now, just return success
            return Response({
                'message': 'Password reset OTP sent to your email',
                'userId': str(user.id)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
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
        if self.request.user.is_authenticated:
            if self.request.user.role == 'admin':
                return Shop.objects.all()
            elif self.request.user.role == 'shop_admin':
                return Shop.objects.filter(id=self.request.user.shop.id)
        return Shop.objects.filter(is_active=True)

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

    @action(detail=True, methods=['post'])
    def toggle_open(self, request, pk=None):
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
            total_paid_orders = orders.filter(status='paid').count()
            total_verified_orders = orders.filter(status='verified').count()
            total_expired_orders = orders.filter(status='expired').count()
            total_revenue = sum(order.total_price for order in orders.filter(status='paid'))
            
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
                    'paidOrders': day_orders.filter(status='paid').count(),
                    'verifiedOrders': day_orders.filter(status='verified').count(),
                    'expiredOrders': day_orders.filter(status='expired').count(),
                    'revenue': sum(order.total_price for order in day_orders.filter(status='paid'))
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
                    'total': sum(order.total_price for order in month_orders.filter(status='paid'))
                })
            
            # Get top products
            from django.db.models import Sum
            top_products = []
            product_sales = Order.objects.filter(shop=shop, status='paid').values(
                'items__product__name'
            ).annotate(
                total_sold=Sum('items__quantity'),
                total_revenue=Sum('items__price')
            ).order_by('-total_revenue')[:10]
            
            for product in product_sales:
                top_products.append({
                    'name': product['items__product__name'],
                    'totalSold': product['total_sold'],
                    'totalRevenue': product['total_revenue']
                })
            
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

    def perform_create(self, serializer):
        serializer.save()


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['admin', 'shopAdmin']:
            return Order.objects.all()
        return Order.objects.filter(user=self.request.user)
        
    def create(self, request, *args, **kwargs):
        """Create a single shop order"""
        try:



            from decimal import Decimal

            print(f"Incoming request data: {request.data}")
            serializer = self.get_serializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            try:
                order = serializer.save()
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Handle payment based on method
            payment_method = request.data.get('paymentMethod', 'balance')
            total_price = order.total_price # Use the total_price calculated by the serializer

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
                print(f"OrderViewSet create - razorpay - order_data before response: {order_data}")
                print(f"OrderViewSet create - balance - order_data before response: {order_data}")
                
                return Response({
                    'message': 'Order created successfully',
                    'order': order_data
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
                    'order': order_data,
                    'razorpay_order_id': razorpay_order['id'],
                    'razorpayKeyId': settings.RAZORPAY_KEY_ID
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({'error': 'Invalid payment method'}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def myorders(self, request):
        """Get orders for the current user"""
        try:
            orders = Order.objects.filter(user=request.user).order_by('-created_at')
            serializer = self.get_serializer(orders, many=True)
            return Response(serializer.data)
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
            serializer = self.get_serializer(orders, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    @action(detail=False, methods=['post'])
    def multi_shop(self, request):
        """Create orders for multiple shops in a single request"""
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
                    # Create order data
                    order_data = {
                        'shop_id': shop_id,
                        'order_items': items,
                        'user': request.user
                    }
                    
                    # Create serializer
                    serializer = self.get_serializer(data=order_data)
                    serializer.is_valid(raise_exception=True)
                    
                    # Save order
                    order = self.perform_create(serializer)
                    orders.append(order)
                    total_price += order.total_price
                
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
                    # Import Razorpay if needed
                    import razorpay
                    from django.conf import settings
                    
                    # Initialize Razorpay client
                    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                    
                    # Create Razorpay order
                    razorpay_order = client.order.create({
                        'amount': int(total_price * 100),  # Amount in paise
                        'currency': 'INR',
                        'receipt': f'order_{uuid.uuid4().hex[:8]}',
                        'payment_capture': 1  # Auto-capture
                    })
                    
                    # Return response with Razorpay order details
                    return Response({
                        'message': 'Orders created successfully',
                        'orders': self.get_serializer(orders, many=True).data,
                        'razorpay_order_id': razorpay_order['id'],
                        'razorpayKeyId': settings.RAZORPAY_KEY_ID
                    }, status=status.HTTP_201_CREATED)
            
            # Return response for balance payment
            return Response({
                'message': 'Orders created successfully',
                'orders': self.get_serializer(orders, many=True).data
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):


        from decimal import Decimal

        # Generate order ID
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        
        # Calculate total price
        order_items = serializer.validated_data['order_items']
        total_price = Decimal('0.0')
        for item in order_items:
            product = Product.objects.get(id=item['product_id'])
            total_price += product.price * item['quantity']
        
        # Set expiration time
        shop = Shop.objects.get(id=serializer.validated_data['shop_id'])
        expires_at = timezone.now() + timedelta(minutes=shop.qr_validity_minutes)
        
        # Create order
        order = serializer.save(
            order_id=order_id,
            total_price=total_price,
            expires_at=expires_at
        )
        
        # Generate QR code
        qr_data = {
            'order_id': order.order_id,
            'user_id': str(order.user.id),
            'shop_id': str(order.shop.id),
            'total_price': str(order.total_price)
        }
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(str(qr_data))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_code = base64.b64encode(buffer.getvalue()).decode()
        
        order.qr_code = qr_code
        order.qr_valid_until = expires_at
        order.save()
        
        return order

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        order = self.get_object()
        
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

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        order = self.get_object()
        
        if order.is_paid:
            return Response({'error': 'Order already paid'}, status=status.HTTP_400_BAD_REQUEST)
        
        payment_method = request.data.get('payment_method', 'balance')
        
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
                
                if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
                    return Response({'error': 'Missing Razorpay payment details'}, status=status.HTTP_400_BAD_REQUEST)
                
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
                    client.utility.verify_payment_signature(params_dict)
                    
                    # Mark as paid
                    order.is_paid = True
                    order.paid_at = timezone.now()
                    order.payment_result = {
                        'method': 'razorpay',
                        'status': 'success',
                        'razorpay_payment_id': razorpay_payment_id,
                        'razorpay_order_id': razorpay_order_id
                    }
                    order.save()
                    
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
                except Exception as e:
                    return Response({'error': f'Payment verification failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response(OrderSerializer(order).data)


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['admin', 'shopAdmin']:
            return Transaction.objects.all()
        return Transaction.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def shop(self, request):
        """Get transactions for a specific shop"""
        shop_id = request.query_params.get('shop_id') or request.query_params.get('id')
        if not shop_id:
            return Response({'error': 'Shop ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            transactions = Transaction.objects.filter(shop=shop_id)
            serializer = self.get_serializer(transactions, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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