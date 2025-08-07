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

# Ensure the multi-shop endpoint is properly registered
# The DefaultRouter will automatically register the multi_shop action as /api/orders/multi-shop/

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
                    'expires_at': (timezone.now() + timedelta(minutes=10)).isoformat()
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
                        'userId': str(user.id),
                        'message': 'OTP sent to your email'
                    }, status=status.HTTP_201_CREATED)
                else:
                    # If email fails, delete the user and return error
                    user.delete()
                    return Response({
                        'error': 'Failed to send OTP email. Please try again.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
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
                '_id': str(user.id),
                'name': user.name,
                'email': user.email,
                'role': user.role,
                'shop': user.shop.id if user.shop else None,
                'balance': float(user.balance),
                'is_sub_admin': False,
                'parent_admin': None,
                'token': str(refresh.access_token),
                'message': 'Registration successful!'
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
                'expires_at': (timezone.now() + timedelta(minutes=10)).isoformat()
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
                    'shop': user.shop.id if user.shop else None,
                    'balance': float(user.balance),
                    'is_sub_admin': False,
                    'parent_admin': None,
                    'token': str(refresh.access_token),
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

urlpatterns = [
    path('users/register/', RegisterView.as_view(), name='register'),
    path('users/verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('users/resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('users/login/', LoginView.as_view(), name='login'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('', include(router.urls)),
]