from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    UserViewSet, ShopViewSet, ProductViewSet, OrderViewSet,
    TransactionViewSet, ShopLogViewSet, StudentAnalyticsViewSet, FileUploadViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'shops', ShopViewSet)
router.register(r'products', ProductViewSet)
router.register(r'orders', OrderViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'shop-logs', ShopLogViewSet)
router.register(r'student-analytics', StudentAnalyticsViewSet)
router.register(r'upload', FileUploadViewSet, basename='upload')

class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .models import User
            from .serializers import UserRegistrationSerializer
            import random
            
            serializer = UserRegistrationSerializer(data=request.data)
            if serializer.is_valid():
                # Create user but don't save yet
                user_data = serializer.validated_data.copy()
                user_data.pop('confirm_password')
                user_data['username'] = user_data['email']
                user_data['is_verified'] = False  # User needs OTP verification
                
                # Generate OTP
                otp = str(random.randint(100000, 999999))
                otp_data = {
                    'otp': otp,
                    'created_at': timezone.now().isoformat(),
                    'expires_at': (timezone.now() + timedelta(minutes=6)).isoformat()
                }
                
                # Create user with OTP
                user = User.objects.create_user(**user_data)
                user.otp = otp_data
                user.save()
                
                # Send OTP email
                from .utils import send_otp_email
                email_sent = send_otp_email(user.email, otp, user.name)
                
                if email_sent:
                    return Response({
                        'message': 'User registered. Please verify with OTP sent to your email',
                        'userId': str(user.id)
                    }, status=status.HTTP_201_CREATED)
                else:
                    return Response({'error': 'Failed to send OTP email. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .models import User
            from rest_framework_simplejwt.tokens import RefreshToken
            
            user_id = request.data.get('userId')
            otp = request.data.get('otp')
            
            if not user_id or not otp:
                return Response({'error': 'User ID and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            if not user.otp:
                return Response({'error': 'No OTP found for this user'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if OTP is expired
            otp_data = user.otp
            expires_at = timezone.datetime.fromisoformat(otp_data['expires_at'].replace('Z', '+00:00'))
            if timezone.now() > expires_at:
                return Response({'error': 'OTP has expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify OTP
            if otp_data['otp'] != otp:
                return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Mark user as verified and clear OTP
            user.is_verified = True
            user.otp = None
            user.save()
            
            # Generate token
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'OTP verified successfully',
                'user': {
                    'id': str(user.id),
                    'name': user.name,
                    'email': user.email,
                    'role': user.role,
                    'balance': float(user.balance),
                },
                'token': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResendOTPView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .models import User
            import random
            
            user_id = request.data.get('userId')
            
            if not user_id:
                return Response({'error': 'User ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Generate new OTP
            otp = str(random.randint(100000, 999999))
            otp_data = {
                'otp': otp,
                'created_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(minutes=6)).isoformat()
            }
            
            user.otp = otp_data
            user.save()
            
            # Send new OTP email
            from .utils import send_resend_otp_email
            email_sent = send_resend_otp_email(user.email, otp, user.name)
            
            if email_sent:
                return Response({
                    'message': 'New OTP sent to your email'
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Failed to send OTP email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResendOTPByEmailView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .models import User
            import random
            
            email = request.data.get('email')
            if not email:
                return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Avoid user enumeration; pretend success
                return Response({'message': 'If the email exists, an OTP has been sent'}, status=status.HTTP_200_OK)
            
            if getattr(user, 'is_verified', False):
                return Response({'message': 'Account already verified'}, status=status.HTTP_200_OK)
            
            # Generate new OTP
            otp = str(random.randint(100000, 999999))
            otp_data = {
                'otp': otp,
                'created_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(minutes=6)).isoformat()
            }
            user.otp = otp_data
            user.save()
            
            # Send OTP email
            from .utils import send_resend_otp_email
            email_sent = send_resend_otp_email(user.email, otp, user.name)
            if not email_sent:
                return Response({'error': 'Failed to send OTP email. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({'message': 'New OTP sent to your email', 'userId': str(user.id)}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Forgot Password Flow
class ForgotPasswordRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            from .models import User
            import random

            email = request.data.get('email')
            if not email:
                return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Avoid user enumeration; pretend success
                return Response({'message': 'If the email exists, an OTP has been sent', 'userId': None}, status=status.HTTP_200_OK)

            otp = str(random.randint(100000, 999999))
            otp_data = {
                'otp': otp,
                'created_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(minutes=6)).isoformat()
            }
            user.password_reset_otp = otp_data
            user.save()

            from .utils import send_resend_otp_email
            email_sent = send_resend_otp_email(user.email, otp, user.name)
            if not email_sent:
                return Response({'error': 'Failed to send OTP email. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({'message': 'OTP sent', 'userId': str(user.id)}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class VerifyResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            from .models import User
            import uuid

            user_id = request.data.get('userId')
            otp = request.data.get('otp')
            if not user_id or not otp:
                return Response({'error': 'User ID and OTP are required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            if not user.password_reset_otp:
                return Response({'error': 'No OTP requested'}, status=status.HTTP_400_BAD_REQUEST)
            otp_data = user.password_reset_otp
            expires_at = timezone.datetime.fromisoformat(otp_data['expires_at'].replace('Z', '+00:00'))
            if timezone.now() > expires_at:
                return Response({'error': 'OTP has expired'}, status=status.HTTP_400_BAD_REQUEST)
            if otp_data['otp'] != otp:
                return Response({'error': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

            token = uuid.uuid4().hex
            token_data = {
                'token': token,
                'created_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(minutes=30)).isoformat(),
            }
            user.password_reset_token = token_data
            user.save()
            return Response({'resetToken': token}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            from .models import User
            user_id = request.data.get('userId')
            token = request.data.get('resetToken')
            new_password = request.data.get('newPassword')
            if not user_id or not token or not new_password:
                return Response({'error': 'Missing fields'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            if not user.password_reset_token:
                return Response({'error': 'No reset token'}, status=status.HTTP_400_BAD_REQUEST)
            token_data = user.password_reset_token
            expires_at = timezone.datetime.fromisoformat(token_data['expires_at'].replace('Z', '+00:00'))
            if timezone.now() > expires_at:
                return Response({'error': 'Reset token expired'}, status=status.HTTP_400_BAD_REQUEST)
            if token_data['token'] != token:
                return Response({'error': 'Invalid reset token'}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(new_password)
            user.password_reset_token = None
            user.password_reset_otp = None
            user.save()
            return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResendResetOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            from .models import User
            import random
            user_id = request.data.get('userId')
            if not user_id:
                return Response({'error': 'User ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

            otp = str(random.randint(100000, 999999))
            otp_data = {
                'otp': otp,
                'created_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(minutes=6)).isoformat()
            }
            user.password_reset_otp = otp_data
            user.save()

            from .utils import send_resend_otp_email
            email_sent = send_resend_otp_email(user.email, otp, user.name)
            if not email_sent:
                return Response({'error': 'Failed to send OTP email. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            return Response({'message': 'New OTP sent'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        try:
            from .serializers import UserLoginSerializer
            from rest_framework_simplejwt.tokens import RefreshToken
            
            serializer = UserLoginSerializer(data=request.data)
            if serializer.is_valid():
                user = serializer.validated_data['user']
                
                # Check if user is verified
                if not user.is_verified:
                    return Response({'error': 'Please verify your email first'}, status=status.HTTP_400_BAD_REQUEST)
                
                refresh = RefreshToken.for_user(user)
                return Response({
                    '_id': str(user.id),
                    'name': user.name,
                    'email': user.email,
                    'role': user.role,
                    'shop': str(user.shop.id) if user.shop else None,
                    'balance': float(user.balance),
                    'is_sub_admin': bool(getattr(user, 'is_sub_admin', False)),
                    'parent_admin': str(user.parent_admin.id) if getattr(user, 'parent_admin', None) else None,
                    'token': str(refresh.access_token),
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

urlpatterns = [
    path('users/register/', RegisterView.as_view(), name='register'),
    path('users/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('users/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('users/resend-otp-by-email/', ResendOTPByEmailView.as_view(), name='resend-otp-by-email'),
    path('users/login/', LoginView.as_view(), name='login'),
    # Forgot password endpoints
    path('users/forgot-password/', ForgotPasswordRequestView.as_view(), name='forgot-password'),
    path('users/verify-reset-otp', VerifyResetOTPView.as_view(), name='verify-reset-otp'),
    path('users/reset-password', ResetPasswordView.as_view(), name='reset-password'),
    path('users/resend-reset-otp', ResendResetOTPView.as_view(), name='resend-reset-otp'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('orders/<uuid:pk>/pay/', OrderViewSet.as_view({'put': 'pay'}), name='order-pay'),
    path('orders/scan-qr-code/', OrderViewSet.as_view({'get': 'scan_qr_code'}), name='order-scan-qr-code'),
    path('orders/<uuid:pk>/mark-item-bought/', OrderViewSet.as_view({'patch': 'mark_item_bought'}), name='order-mark-item-bought'),
    # Manual registration for multi_shop action
    path('orders/multi_shop/', OrderViewSet.as_view({'post': 'multi_shop'}), name='order-multi-shop'),
    # Manual registration for shop orders action
    path('orders/shop/', OrderViewSet.as_view({'get': 'shop'}), name='order-shop'),
    # Manual registration for shop transactions action
    path('transactions/shop/', TransactionViewSet.as_view({'get': 'shop'}), name='transaction-shop'),
]

urlpatterns += [
    path('', include(router.urls)),
]
