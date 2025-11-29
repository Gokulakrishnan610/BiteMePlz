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
from django.db.models import Q
from django.core.files.storage import default_storage
from django.core.serializers.json import DjangoJSONEncoder
import json
from .models import User, Shop, Product, Order, Transaction, ShopLog, StudentAnalytics, StudentLog
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserLoginSerializer,
    ShopSerializer, ProductSerializer, OrderSerializer, TransactionSerializer,
    ShopLogSerializer, StudentAnalyticsSerializer
)
from .utils import convert_uuids_to_str_recursive
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .authentication import ParentSessionAuthentication  # use dedicated module
import time
from django.db.models import Count, Avg, Sum
from rest_framework.decorators import api_view

# Check if channels is available for WebSocket support
try:
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    _channels_available = True
except ImportError:
    _channels_available = False

# Custom media serving view for production
from django.http import FileResponse, Http404, JsonResponse
from django.conf import settings
import os

def serve_media_file(request, path):
    """Custom view to serve media files in production"""
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    
    # Handle directory requests (show directory listing)
    if os.path.exists(file_path) and os.path.isdir(file_path):
        try:
            files = []
            for item in os.listdir(file_path):
                item_path = os.path.join(file_path, item)
                if os.path.isfile(item_path):
                    # Clean up path to avoid double slashes
                    clean_path = path.rstrip('/') if path else ''
                    files.append({
                        'name': item,
                        'size': os.path.getsize(item_path),
                        'url': f'/media/{clean_path}/{item}' if clean_path else f'/media/{item}'
                    })
            
            # Return JSON response for directory listing
            return JsonResponse({
                'type': 'directory',
                'path': path,
                'files': files
            })
        except Exception as e:
            raise Http404(f"Error reading directory: {e}")
    
    # Handle file requests
    elif os.path.exists(file_path) and os.path.isfile(file_path):
        # Get file extension for content type
        ext = os.path.splitext(file_path)[1].lower()
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
        }
        
        content_type = content_types.get(ext, 'application/octet-stream')
        
        try:
            # Open file without context manager to keep it open for FileResponse
            file_handle = open(file_path, 'rb')
            response = FileResponse(file_handle, content_type=content_type)
            response['Cache-Control'] = 'public, max-age=31536000'  # Cache for 1 year
            return response
        except Exception as e:
            # Close file handle if there was an error
            if 'file_handle' in locals():
                file_handle.close()
            raise Http404(f"Error reading file: {e}")
    else:
        raise Http404("File or directory not found")


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
        # Check if login is enabled
        from startup.models import SiteConfiguration
        config = SiteConfiguration.get_config()
        if not config.login_enabled:
            return Response(
                {"error": "Login is currently disabled. Please try again later."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            # Log login for ALL users (students, shop admins, sub-admins, admins)
            try:
                # For users with shops (shop admins, sub-admins)
                if user.shop:
                    ShopLog.objects.create(
                        shop=user.shop,
                        action='user_login',
                        performed_by=user,
                        details={
                            'user_name': user.name,
                            'user_email': user.email,
                            'user_role': user.role,
                            'user_id': str(user.id),
                            'is_sub_admin': getattr(user, 'is_sub_admin', False),
                            'login_time': timezone.now().isoformat(),
                            'ip_address': self._get_client_ip(request),
                            'login_type': 'shop_user'
                        }
                    )
                # For students and other users without shops
                else:
                    # Find the first shop to log to (for system-wide logging)
                    from api.models import Shop
                    default_shop = Shop.objects.first()
                    if default_shop:
                        ShopLog.objects.create(
                            shop=default_shop,
                            action='user_login',
                            performed_by=user,
                            details={
                                'user_name': user.name,
                                'user_email': user.email,
                                'user_role': user.role,
                                'user_id': str(user.id),
                                'is_sub_admin': getattr(user, 'is_sub_admin', False),
                                'login_time': timezone.now().isoformat(),
                                'ip_address': self._get_client_ip(request),
                                'login_type': 'student_user',
                                'note': 'Student login logged to default shop for system-wide tracking'
                            }
                        )
                    else:
                        print(f"[WARNING] No shops found to log user login for {user.email}")
                
                print(f"[DEBUG] User login logged successfully for {user.email} (role: {user.role})")
                
            except Exception as e:
                print(f"[ERROR] Failed to log user login for {user.email}: {str(e)}")
                # Don't fail the login if logging fails
            
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

    def _get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

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
            old_user_data = {
                'name': request.user.name,
                'email': request.user.email,
                'balance': float(request.user.balance)
            }
            
            serializer.save()
            data = serializer.data
            
            # Log profile updates for shop admins and sub-admins
            if request.user.role in ['shopAdmin', 'admin'] and request.user.shop:
                updated_fields = []
                for field, value in serializer.validated_data.items():
                    if hasattr(request.user, field) and getattr(request.user, field) != value:
                        updated_fields.append(field)
                
                if updated_fields:
                    ShopLog.objects.create(
                        shop=request.user.shop,
                        action='profile_updated',
                        performed_by=request.user,
                        details={
                            'user_name': request.user.name,
                            'user_email': request.user.email,
                            'updated_fields': updated_fields,
                            'old_values': {field: old_user_data.get(field) for field in updated_fields if field in old_user_data},
                            'new_values': {field: getattr(request.user, field) for field in updated_fields if hasattr(request.user, field)}
                        }
                    )
            
            # Ensure UUIDs are converted to strings
            data['id'] = str(request.user.id)
            if request.user.shop:
                data['shop'] = str(request.user.shop.id)
            return Response(data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def sub_shop_admins(self, request):
        """Get sub-shop admins for a shop.
        - shopAdmin: own shop
        - admin: must provide shop_id query param
        """
        if request.user.role == 'shopAdmin':
            if not request.user.shop:
                return Response({'error': 'No shop associated with this user'}, status=status.HTTP_400_BAD_REQUEST)
            target_shop = request.user.shop
        elif request.user.role == 'admin':
            shop_id = request.query_params.get('shop_id') or request.query_params.get('shop')
            if not shop_id:
                return Response({'error': 'shop_id query parameter is required for admins'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                target_shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        sub_admins = User.objects.filter(shop=target_shop, role='shopAdmin', is_sub_admin=True)
        serializer = UserSerializer(sub_admins, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def sub_shop_admin(self, request):
        """Create a sub-shop admin (shopAdmin: own shop, admin: must provide shop_id)."""
        if request.user.role == 'shopAdmin':
            if not request.user.shop:
                return Response({'error': 'No shop associated with this user'}, status=status.HTTP_400_BAD_REQUEST)
            target_shop = request.user.shop
            parent_admin = request.user
        elif request.user.role == 'admin':
            shop_id = request.data.get('shop_id') or request.data.get('shop')
            if not shop_id:
                return Response({'error': 'shop_id is required for admins'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                target_shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
            parent_admin = None
        else:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name')
        email = request.data.get('email')
        password = request.data.get('password')

        if not all([name, email, password]):
            return Response({'error': 'Name, email, and password are required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'A user with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user_data = {
            'name': name,
            'email': email,
            'password': password,
            'confirm_password': password,
            'role': 'shopAdmin',
            'roll_no': f'SUB_ADMIN_{email.split('@')[0]}_{int(time.time())}'
        }

        user_serializer = UserRegistrationSerializer(data=user_data)
        if not user_serializer.is_valid():
            return Response(user_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = user_serializer.save()
            user.shop = target_shop
            user.is_sub_admin = True
            user.parent_admin = parent_admin
            user.is_verified = True
            user.save()

            # Log the sub-admin creation
            ShopLog.objects.create(
                shop=target_shop,
                action='sub_admin_created',
                performed_by=request.user,
                details={
                    'sub_admin_name': user.name,
                    'sub_admin_email': user.email
                }
            )

            return Response({
                'message': 'Sub-shop admin created successfully',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['delete'])
    def delete_sub_admin(self, request):
        """Delete a sub-shop admin (shopAdmin: own shop, admin: must provide shop_id)."""
        if request.user.role == 'shopAdmin':
            if not request.user.shop:
                return Response({'error': 'No shop associated with this user'}, status=status.HTTP_400_BAD_REQUEST)
            target_shop = request.user.shop
            # Shop admins can only delete their own sub-admins
            if not request.user.is_sub_admin:
                return Response({'error': 'Only main shop admins can delete sub-admins'}, status=status.HTTP_403_FORBIDDEN)
        elif request.user.role == 'admin':
            shop_id = request.data.get('shop_id') or request.data.get('shop')
            if not shop_id:
                return Response({'error': 'shop_id is required for admins'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                target_shop = Shop.objects.get(id=shop_id)
            except Shop.DoesNotExist:
                return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        sub_admin_email = request.data.get('email')
        if not sub_admin_email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sub_admin = User.objects.get(
                email=sub_admin_email,
                shop=target_shop,
                role='shopAdmin',
                is_sub_admin=True
            )
            
            # Log the sub-admin deletion
            ShopLog.objects.create(
                shop=target_shop,
                action='sub_admin_deleted',
                performed_by=request.user,
                details={
                    'sub_admin_name': sub_admin.name,
                    'sub_admin_email': sub_admin.email,
                    'deleted_by_role': request.user.role,
                    'deleted_by_name': request.user.name
                }
            )
            
            # Delete the sub-admin
            sub_admin.delete()
            
            return Response({
                'message': 'Sub-shop admin deleted successfully'
            }, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response({'error': 'Sub-shop admin not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def change_shop_admin_password(self, request):
        """Change password for a shop admin user (admin only)"""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can change shop admin passwords'}, status=status.HTTP_403_FORBIDDEN)
        
        shop_id = request.data.get('shop_id')
        new_password = request.data.get('new_password')
        
        if not shop_id:
            return Response({'error': 'shop_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not new_password:
            return Response({'error': 'new_password is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(new_password) < 6:
            return Response({'error': 'Password must be at least 6 characters long'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if not shop.shop_admin:
            return Response({'error': 'Shop has no admin user'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Change the password
        shop.shop_admin.set_password(new_password)
        shop.shop_admin.save()
        
        # Log the action
        ShopLog.objects.create(
            shop=shop,
            action='admin_password_changed',
            performed_by=request.user,
            details={
                'admin_user': shop.shop_admin.email,
                'changed_by': request.user.email
            }
        )
        
        return Response({
            'message': f'Password changed successfully for shop "{shop.name}" admin',
            'admin_email': shop.shop_admin.email
        }, status=status.HTTP_200_OK)











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
        # Add CORS debugging
        if self.action == 'list':
            print(f"DEBUG: Shop list called from origin: {self.request.META.get('HTTP_ORIGIN')}")
            print(f"DEBUG: Request headers: {dict(self.request.headers)}")
        
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
        
        # Determine what fields were updated
        updated_fields = []
        for field, value in serializer.validated_data.items():
            if hasattr(old_shop, field) and getattr(old_shop, field) != value:
                updated_fields.append(field)
        
        if updated_fields:
            # Special logging for disabled categories changes
            if 'disabled_categories' in updated_fields:
                old_categories = getattr(old_shop, 'disabled_categories', [])
                new_categories = getattr(shop, 'disabled_categories', [])
                
                ShopLog.objects.create(
                    shop=shop,
                    action='categories_updated',
                    performed_by=self.request.user,
                    details={
                        'old_disabled_categories': old_categories,
                        'new_disabled_categories': new_categories,
                        'categories_added': [cat for cat in new_categories if cat not in old_categories],
                        'categories_removed': [cat for cat in old_categories if cat not in new_categories],
                        'updated_by_role': getattr(self.request.user, 'role', 'unknown')
                    }
                )
            
            # Special logging for final validity time changes
            if 'final_validity_time' in updated_fields:
                old_time = getattr(old_shop, 'final_validity_time', None)
                new_time = getattr(shop, 'final_validity_time', None)
                
                ShopLog.objects.create(
                    shop=shop,
                    action='validity_time_updated',
                    performed_by=self.request.user,
                    details={
                        'old_final_validity_time': old_time.isoformat() if old_time else None,
                        'new_final_validity_time': new_time.isoformat() if new_time else None,
                        'updated_by_role': getattr(self.request.user, 'role', 'unknown')
                    }
                )
            
            # Special logging for QR validity minutes changes
            if 'qr_validity_minutes' in updated_fields:
                old_minutes = getattr(old_shop, 'qr_validity_minutes', None)
                new_minutes = getattr(shop, 'qr_validity_minutes', None)
                
                ShopLog.objects.create(
                    shop=shop,
                    action='qr_validity_updated',
                    performed_by=self.request.user,
                    details={
                        'old_qr_validity_minutes': old_minutes,
                        'new_qr_validity_minutes': new_minutes,
                        'updated_by_role': getattr(self.request.user, 'role', 'unknown')
                    }
                )
            
            # General logging for other updates
            other_fields = [f for f in updated_fields if f not in ['disabled_categories', 'final_validity_time', 'qr_validity_minutes']]
            if other_fields:
                ShopLog.objects.create(
                    shop=shop,
                    action='settings_updated',
                    performed_by=self.request.user,
                    details={
                        'updated_fields': other_fields,
                        'shop_name': shop.name,
                        'updated_by_role': getattr(self.request.user, 'role', 'unknown')
                    }
                )
        
        return shop

    def update(self, request, *args, **kwargs):
        """Allow partial updates (including single-field updates like disabled_categories) via PUT/PATCH."""
        partial = True
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

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
            # Add CORS debugging
            print(f"DEBUG: Debug endpoint called from origin: {request.META.get('HTTP_ORIGIN')}")
            print(f"DEBUG: Request headers: {dict(request.headers)}")
            
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
                'user_role': role,
                'cors_debug': {
                    'origin': request.META.get('HTTP_ORIGIN'),
                    'headers': dict(request.headers)
                }
            }

            response = Response(debug_data)
            print(f"DEBUG: Response headers: {dict(response.headers)}")
            return response
        except Exception as e:
            print(f"DEBUG: Error in debug endpoint: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Add CORS debugging
        if self.action == 'list':
            print(f"DEBUG: Product list called from origin: {self.request.META.get('HTTP_ORIGIN')}")
            print(f"DEBUG: Request headers: {dict(self.request.headers)}")
            print(f"DEBUG: Query params: {self.request.query_params}")
            print(f"DEBUG: User role: {getattr(self.request.user, 'role', 'None')}")
            print(f"DEBUG: User authenticated: {getattr(self.request.user, 'is_authenticated', False)}")
        
        shop_id = self.request.query_params.get('shop_id') or self.request.query_params.get('shop')
        name = self.request.query_params.get('name')
        
        # For mutation/detail actions, don't filter by is_available so we can update disabled items
        if getattr(self, 'action', None) in ['retrieve', 'update', 'partial_update', 'destroy']:
            if self.request.user.role == 'shopAdmin':
                # Limit to the current shop admin's products
                try:
                    return Product.objects.filter(shop=self.request.user.shop)
                except Exception:
                    return Product.objects.none()
            return Product.objects.all()

        # For authenticated shop admins viewing their own shop's products, show ALL products
        if (getattr(self.request.user, 'role', None) == 'shopAdmin' and 
            getattr(self.request.user, 'shop', None) and 
            shop_id and 
            str(getattr(self.request.user, 'shop', None).id) == str(shop_id)):
            print(f"DEBUG: Shop admin viewing own shop products - showing all products for shop {shop_id}")
            print(f"DEBUG: User shop: {getattr(self.request.user, 'shop', None)}")
            print(f"DEBUG: User shop.id: {getattr(self.request.user, 'shop', None).id if getattr(self.request.user, 'shop', None) else 'None'}")
            print(f"DEBUG: Requested shop_id: {shop_id}")
            print(f"DEBUG: Shop IDs match: {str(getattr(self.request.user, 'shop', None).id) == str(shop_id) if getattr(self.request.user, 'shop', None) else 'False'}")
            return Product.objects.filter(shop=shop_id)
        else:
            if getattr(self.request.user, 'role', None) == 'shopAdmin':
                print(f"DEBUG: Shop admin but not viewing own shop or shop_id mismatch")
                print(f"DEBUG: User shop: {getattr(self.request.user, 'shop', None)}")
                print(f"DEBUG: User shop.id: {getattr(self.request.user, 'shop', None).id if getattr(self.request.user, 'shop', None) else 'None'}")
                print(f"DEBUG: Requested shop_id: {shop_id}")
                print(f"DEBUG: User authenticated: {getattr(self.request.user, 'is_authenticated', False)}")

        # For admin users viewing any shop's products, show ALL products
        if getattr(self.request.user, 'role', None) == 'admin' and shop_id:
            print(f"DEBUG: Admin viewing shop products - showing all products for shop {shop_id}")
            return Product.objects.filter(shop=shop_id)

        # For public listing or other users: only show available products (optionally by shop)
        queryset = Product.objects.filter(is_available=True)
        if shop_id:
            print(f"DEBUG: Public/other user viewing shop products - showing only available products for shop {shop_id}")
            print(f"DEBUG: Total available products: {queryset.count()}")
            queryset = queryset.filter(shop=shop_id)
            print(f"DEBUG: Available products for shop {shop_id}: {queryset.count()}")
            print(f"DEBUG: Products in shop {shop_id}: {list(queryset.values_list('name', 'is_available', 'shop_id'))}")
        if name:
            queryset = queryset.filter(name__icontains=name)
        return queryset

    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        """Log product creation"""
        product = serializer.save()
        
        # Log the product creation with error handling
        try:
            ShopLog.objects.create(
                shop=product.shop,
                action='product_created',
                performed_by=self.request.user,
                details={
                    'product_name': product.name,
                    'product_id': str(product.id),
                    'price': float(product.price),
                    'stock': product.stock,
                    'category': product.category.name if product.category else 'No Category'
                }
            )
            print(f"[DEBUG] Product creation logged successfully for {product.name}")
            
            # Broadcast product creation via WebSocket
            try:
                from .websocket_utils import broadcast_product_update
                broadcast_product_update(
                    product_id=str(product.id),
                    shop_id=str(product.shop.id),
                    changes={'action': 'created', 'name': product.name, 'price': float(product.price), 'stock': product.stock}
                )
                print(f"[DEBUG] Product creation broadcasted via WebSocket for {product.name}")
            except Exception as e:
                print(f"[ERROR] Failed to broadcast product creation: {e}")
                
        except Exception as e:
            print(f"[ERROR] Failed to log product creation for {product.name}: {str(e)}")
            # Don't fail the product creation if logging fails
        
        return product

    def perform_update(self, serializer):
        """Log product updates"""
        old_product = self.get_object()
        product = serializer.save()
        
        # Determine what fields were updated
        updated_fields = []
        for field, value in serializer.validated_data.items():
            if hasattr(old_product, field) and getattr(old_product, field) != value:
                updated_fields.append(field)
        
        if updated_fields:
            # Special logging for stock changes
            if 'stock' in updated_fields:
                old_stock = getattr(old_product, 'stock', 0)
                new_stock = getattr(product, 'stock', 0)
                stock_change = new_stock - old_stock
                
                try:
                    ShopLog.objects.create(
                        shop=product.shop,
                        action='stock_updated',
                        performed_by=self.request.user,
                        details={
                            'product_name': product.name,
                            'product_id': str(product.id),
                            'old_stock': old_stock,
                            'new_stock': new_stock,
                            'stock_change': stock_change,
                            'change_type': 'increase' if stock_change > 0 else 'decrease' if stock_change < 0 else 'no_change',
                            'updated_by_role': getattr(self.request.user, 'role', 'unknown')
                        }
                    )
                    print(f"[DEBUG] Stock update logged successfully for {product.name}")
                    
                    # Broadcast stock update via WebSocket
                    try:
                        from .websocket_utils import broadcast_stock_update
                        broadcast_stock_update(
                            product_id=str(product.id),
                            stock=new_stock,
                            shop_id=str(product.shop.id)
                        )
                        print(f"[DEBUG] Stock update broadcasted via WebSocket for {product.name}")
                    except Exception as e:
                        print(f"[ERROR] Failed to broadcast stock update: {e}")
                        
                except Exception as e:
                    print(f"[ERROR] Failed to log stock update for {product.name}: {str(e)}")
            
            # General logging for other updates
            if any(field != 'stock' for field in updated_fields):
                try:
                    ShopLog.objects.create(
                        shop=product.shop,
                        action='product_updated',
                        performed_by=self.request.user,
                        details={
                            'product_name': product.name,
                            'product_id': str(product.id),
                            'updated_fields': [f for f in updated_fields if f != 'stock'],
                            'old_values': {field: getattr(old_product, field) for field in updated_fields if field != 'stock' and hasattr(old_product, field)},
                            'new_values': {field: getattr(product, field) for field in updated_fields if field != 'stock' and hasattr(product, field)}
                        }
                    )
                    print(f"[DEBUG] Product update logged successfully for {product.name}")
                    
                    # Broadcast product update via WebSocket
                    try:
                        from .websocket_utils import broadcast_product_update
                        changes = {field: getattr(product, field) for field in updated_fields if field != 'stock' and hasattr(product, field)}
                        broadcast_product_update(
                            product_id=str(product.id),
                            shop_id=str(product.shop.id),
                            changes=changes
                        )
                        print(f"[DEBUG] Product update broadcasted via WebSocket for {product.name}")
                    except Exception as e:
                        print(f"[ERROR] Failed to broadcast product update: {e}")
                        
                except Exception as e:
                    print(f"[ERROR] Failed to log product update for {product.name}: {str(e)}")
        
        return product

    def perform_destroy(self, instance):
        """Log product deletion"""
        # Log the product deletion before deleting
        try:
            ShopLog.objects.create(
                shop=instance.shop,
                action='product_deleted',
                performed_by=self.request.user,
                details={
                    'product_name': instance.name,
                    'product_id': str(instance.id),
                    'price': float(instance.price),
                    'stock': instance.stock
                }
            )
            print(f"[DEBUG] Product deletion logged successfully for {instance.name}")
        except Exception as e:
            print(f"[ERROR] Failed to log product deletion for {instance.name}: {str(e)}")
            # Don't fail the deletion if logging fails
        
        instance.delete()

    def update(self, request, *args, **kwargs):
        """Custom update method to handle product availability updates"""
        try:
            instance = self.get_object()
            
            # For shop admins, ensure they can only update their own shop's products
            if request.user.role == 'shopAdmin':
                if str(instance.shop.id) != str(request.user.shop.id):
                    return Response({'error': 'You can only update products for your own shop'}, status=status.HTTP_403_FORBIDDEN)
            
            # For admins, they can update any product (no additional restrictions needed)
            # The get_queryset method already filters products appropriately
            
            # Always allow partial updates for flexibility
            kwargs['partial'] = True
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def partial_update(self, request, *args, **kwargs):
        """Handle PATCH requests for partial updates"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """Custom create method to validate shop_id for shop admins and admins"""
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
            
            # For both admin and shopAdmin users, verify shop exists
            if shop_id:
                try:
                    shop = Shop.objects.get(id=shop_id)
                except Shop.DoesNotExist:
                    return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Validate shop_id for admins
            elif request.user.role == 'admin':
                if not shop_id:
                    return Response({'error': 'Shop ID is required for admins'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Verify shop exists
                try:
                    shop = Shop.objects.get(id=shop_id)
                except Shop.DoesNotExist:
                    return Response({'error': 'Shop not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Create the product using perform_create for logging
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            product = self.perform_create(serializer)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update products (e.g., stock, availability, etc.)"""
        try:
            products_data = request.data.get('products', [])
            if not products_data:
                return Response({'error': 'No products data provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            updated_products = []
            failed_products = []
            
            for product_data in products_data:
                try:
                    product_id = product_data.get('id')
                    if not product_id:
                        failed_products.append({'id': 'unknown', 'error': 'Missing product ID'})
                        continue
                    
                    # Get the product
                    try:
                        product = Product.objects.get(id=product_id)
                    except Product.DoesNotExist:
                        failed_products.append({'id': product_id, 'error': 'Product not found'})
                        continue
                    
                    # Check permissions
                    if request.user.role == 'shopAdmin':
                        if str(product.shop.id) != str(request.user.shop.id):
                            failed_products.append({'id': product_id, 'error': 'Access denied'})
                            continue
                    
                    # Update the product
                    old_data = {
                        'stock': product.stock,
                        'is_available': product.is_available,
                        'price': float(product.price)
                    }
                    
                    # Apply updates
                    for field, value in product_data.items():
                        if field != 'id' and hasattr(product, field):
                            setattr(product, field, value)
                    
                    product.save()
                    updated_products.append(product)
                    
                    # Log the bulk update
                    ShopLog.objects.create(
                        shop=product.shop,
                        action='product_bulk_updated',
                        performed_by=request.user,
                        details={
                            'product_name': product.name,
                            'product_id': str(product.id),
                            'updated_fields': [f for f in product_data.keys() if f != 'id'],
                            'old_values': old_data,
                            'new_values': {
                                'stock': product.stock,
                                'is_available': product.is_available,
                                'price': float(product.price)
                            },
                            'bulk_operation': True
                        }
                    )
                    
                except Exception as e:
                    failed_products.append({'id': product_data.get('id', 'unknown'), 'error': str(e)})
            
            # Log the overall bulk operation
            if updated_products:
                ShopLog.objects.create(
                    shop=updated_products[0].shop,
                    action='bulk_operation_completed',
                    performed_by=request.user,
                    details={
                        'operation_type': 'bulk_product_update',
                        'total_products': len(products_data),
                        'successful_updates': len(updated_products),
                        'failed_updates': len(failed_products),
                        'updated_product_ids': [str(p.id) for p in updated_products],
                        'failed_product_details': failed_products
                    }
                )
            
            return Response({
                'message': f'Bulk update completed. {len(updated_products)} products updated, {len(failed_products)} failed.',
                'updated_products': len(updated_products),
                'failed_products': len(failed_products),
                'failed_details': failed_products
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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

    def create(self, request, *args, **kwargs):
        """
        Create order with payment - orders are only created after successful payment.
        For balance payment: deduct balance, create order, deduct stock.
        For Razorpay: create Razorpay order, return order_id for frontend to process payment.
        """
        # Determine acting user
        if getattr(request.user, 'is_authenticated', False):
            acting_user = request.user
        else:
            # Require parent session id to proceed
            if not getattr(request, 'auth', None):
                return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
            acting_user = self._get_or_create_parent_guest_user()
        
        payment_method = request.data.get('paymentMethod', 'balance')
        
        # For Razorpay, create Razorpay order and store pending order data
        if payment_method == 'razorpay':
            return self._create_razorpay_order(request, acting_user)
        
        # For balance payment, process payment and create order immediately
        elif payment_method == 'balance':
            return self._create_balance_order(request, acting_user)
        
        else:
            return Response({'error': 'Invalid payment method'}, status=status.HTTP_400_BAD_REQUEST)
    
    def _create_balance_order(self, request, acting_user):
        """Create order with balance payment - payment processed first, then order created."""
        from django.core.cache import cache
        
        order_items_data = request.data.get('order_items', [])
        shop_id = request.data.get('shop_id')
        total_price = Decimal(str(request.data.get('total_price', 0)))
        
        if not order_items_data:
            return Response({'error': 'Order items are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate and calculate total
        validated_items, calculated_total, shop = self._validate_order_items(order_items_data, shop_id)
        
        if abs(calculated_total - total_price) > Decimal('0.01'):
            return Response({'error': f'Price mismatch. Expected: {calculated_total}, Got: {total_price}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check balance
        if acting_user.balance < total_price:
            return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Process payment and create order in a single transaction
        with transaction.atomic():
            # 1. Deduct balance first
            acting_user.balance -= total_price
            acting_user.save()
            
            # 2. Create order with is_paid=True
            order = self._create_order_with_stock_deduction(
                acting_user, shop, validated_items, total_price,
                payment_method='balance',
                is_paid=True
            )
            
            # 3. Create transaction record
            Transaction.objects.create(
                user=acting_user,
                shop=shop,
                order=order,
                amount=total_price,
                type='payment',
                payment_method='balance',
                status='success',
                description=f'Balance payment for order {order.order_id}'
            )
            
            # 4. Log order creation
            ShopLog.objects.create(
                shop=shop,
                action='order_created',
                performed_by=acting_user if acting_user.role != 'student' else None,
                details={
                    'order_id': order.order_id,
                    'total_price': float(total_price),
                    'payment_method': 'balance',
                    'items_count': len(validated_items),
                    'customer_name': acting_user.name
                }
            )
            
            # Log student/staff activity
            if acting_user.role in ['student', 'staff']:
                from .student_logger import log_student_activity
                log_student_activity(
                    user=acting_user,
                    action='place_order',
                    description=f'Placed order #{order.order_id} for ₹{total_price}',
                    shop=shop,
                    order=order,
                    metadata={'payment_method': 'balance', 'total_price': float(total_price)},
                    request=request
                )
            
            # 5. Send wallet update
            try:
                from api.tasks import send_wallet_update
                send_wallet_update(
                    user_id=str(acting_user.id),
                    balance=float(acting_user.balance),
                    change=-float(total_price),
                    transaction_type='order_payment'
                )
            except Exception:
                pass
        
        serializer = self.get_serializer(order)
        return Response({'order': serializer.data}, status=status.HTTP_201_CREATED)
    
    def _create_razorpay_order(self, request, acting_user):
        """Create Razorpay order and store pending order in database with pending status."""
        import razorpay
        from django.conf import settings
        
        order_items_data = request.data.get('order_items', [])
        shop_id = request.data.get('shop_id')
        total_price = Decimal(str(request.data.get('total_price', 0)))
        
        if not order_items_data:
            return Response({'error': 'Order items are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate and calculate total
        validated_items, calculated_total, shop = self._validate_order_items(order_items_data, shop_id)
        
        if abs(calculated_total - total_price) > Decimal('0.01'):
            return Response({'error': f'Price mismatch. Expected: {calculated_total}, Got: {total_price}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create Razorpay order
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            razorpay_order = client.order.create({
                'amount': int(total_price * 100),  # Amount in paise
                'currency': 'INR',
                'payment_capture': 1
            })
            
            razorpay_order_id = razorpay_order['id']
            
            # Create pending order in database (no stock deduction yet)
            # Generate order_id
            try:
                today = timezone.now().date()
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
                order_id = f"{today.strftime('%Y%m%d')}-{next_token:04d}"
            except Exception:
                order_id = f"{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
            
            # Calculate expiry
            qr_expiry = timezone.now() + timedelta(minutes=shop.qr_validity_minutes)
            if shop.final_validity_time and qr_expiry > shop.final_validity_time:
                expires_at = shop.final_validity_time
            else:
                expires_at = qr_expiry
            
            # Prepare order items without stock deduction
            processed_items = []
            for item_data in validated_items:
                product_id = item_data.get('product_id')
                quantity = item_data.get('quantity')
                product = Product.objects.get(id=product_id)
                
                incoming_price = item_data.get('price')
                unit_price = Decimal(str(incoming_price)) if incoming_price is not None else product.price
                
                processed_items.append({
                    'product_id': str(product.id),
                    'name': product.name,
                    'image': product.image,
                    'is_bought': False,
                    'price': str(unit_price),
                    'quantity': quantity,
                    'shop_id': str(shop.id),
                    'shop_name': shop.name,
                })
            
            # Create pending order (is_paid=False, status='pending')
            pending_order = Order.objects.create(
                order_id=order_id,
                user=acting_user,
                shop=shop,
                order_items=processed_items,
                total_price=total_price,
                is_paid=False,
                payment_result={'method': 'razorpay', 'razorpay_order_id': razorpay_order_id, 'status': 'pending'},
                expires_at=expires_at,
                status='pending'
            )
            
            return Response({
                'razorpay_order_id': razorpay_order_id,
                'amount': int(total_price * 100),
                'currency': 'INR',
                'pending_order_id': str(pending_order.id)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': f'Failed to create Razorpay order: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _validate_order_items(self, order_items_data, shop_id):
        """Validate order items and calculate total price."""
        from .serializers import OrderItemSerializer
        
        # Validate order items
        order_item_serializer = OrderItemSerializer(data=order_items_data, many=True)
        order_item_serializer.is_valid(raise_exception=True)
        validated_items = order_item_serializer.validated_data
        
        # Determine shop
        if not shop_id and validated_items:
            first_product_id = validated_items[0].get('product_id')
            if first_product_id:
                try:
                    first_product = Product.objects.get(id=first_product_id)
                    shop_id = first_product.shop.id
                except Product.DoesNotExist:
                    raise serializers.ValidationError(f"Product with ID {first_product_id} does not exist.")
        
        if not shop_id:
            raise serializers.ValidationError("Shop ID is required.")
        
        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            raise serializers.ValidationError(f"Shop with ID {shop_id} does not exist.")
        
        # Validate products and calculate total
        calculated_total = Decimal('0.0')
        for item_data in validated_items:
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity')
            
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with ID {product_id} does not exist.")
            
            if str(product.shop.id) != str(shop_id):
                raise serializers.ValidationError(f"Product {product.name} does not belong to shop {shop.name}.")
            
            # Check stock availability
            if product.stock_mode == 'stock' and product.stock < quantity:
                raise serializers.ValidationError(f"Not enough stock for {product.name}. Available: {product.stock}")
            
            # Calculate price
            incoming_price = item_data.get('price')
            unit_price = Decimal(str(incoming_price)) if incoming_price is not None else product.price
            calculated_total += unit_price * quantity
        
        return validated_items, calculated_total, shop
    
    def _create_order_with_stock_deduction(self, user, shop, validated_items, total_price, payment_method, is_paid):
        """Create order and deduct stock atomically."""
        from django.db.models import F
        import uuid
        
        # Generate order_id
        try:
            today = timezone.now().date()
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
            order_id = f"{today.strftime('%Y%m%d')}-{next_token:04d}"
        except Exception:
            order_id = f"{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        
        # Calculate expiry
        qr_expiry = timezone.now() + timedelta(minutes=shop.qr_validity_minutes)
        if shop.final_validity_time and qr_expiry > shop.final_validity_time:
            expires_at = shop.final_validity_time
        else:
            expires_at = qr_expiry
        
        # Process order items and deduct stock
        processed_items = []
        for item_data in validated_items:
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity')
            
            # Lock product row
            product = Product.objects.select_for_update().get(id=product_id)
            
            # Deduct stock for regular stock products
            if product.stock_mode == 'stock':
                updated = Product.objects.filter(id=product.id, stock__gte=quantity).update(stock=F('stock') - quantity)
                if updated != 1:
                    raise serializers.ValidationError(f"Not enough stock for {product.name}.")
            
            # Prepare order item
            incoming_price = item_data.get('price')
            unit_price = Decimal(str(incoming_price)) if incoming_price is not None else product.price
            
            processed_items.append({
                'product_id': str(product.id),
                'name': product.name,
                'image': product.image,
                'is_bought': False,
                'price': str(unit_price),
                'quantity': quantity,
                'shop_id': str(shop.id),
                'shop_name': shop.name,
            })
            
            # Broadcast stock update
            if _channels_available:
                try:
                    from .websocket_utils import broadcast_stock_update
                    product.refresh_from_db()
                    broadcast_stock_update(
                        product_id=str(product.id),
                        stock=int(product.stock),
                        shop_id=str(shop.id)
                    )
                except Exception:
                    pass
        
        # Create order
        order = Order.objects.create(
            order_id=order_id,
            user=user,
            shop=shop,
            order_items=processed_items,
            total_price=total_price,
            is_paid=is_paid,
            paid_at=timezone.now() if is_paid else None,
            payment_result={'method': payment_method, 'status': 'success'} if is_paid else None,
            expires_at=expires_at,
            status='pending'
        )
        
        return order

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Admin/ShopAdmin search for orders by code or date/user.
        Query params: q (order code/user), date (YYYY-MM-DD), shop_id (optional)
        """
        try:
            if getattr(request.user, 'role', None) not in ['admin', 'shopAdmin']:
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

            qs = Order.objects.all().order_by('-created_at')
            q = request.query_params.get('q')
            date = request.query_params.get('date')
            shop_id = request.query_params.get('shop_id')
            if q:
                from django.db.models import Q
                qs = qs.filter(Q(order_id__icontains=q) | Q(user__email__icontains=q) | Q(user__name__icontains=q))
            if date:
                try:
                    from datetime import datetime
                    d = datetime.fromisoformat(date)
                    qs = qs.filter(created_at__date=d.date())
                except Exception:
                    pass
            if shop_id:
                qs = qs.filter(shop__id=shop_id)
            data = OrderSerializer(qs[:50], many=True).data
            return Response({'results': data})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an order and refund wallet if paid by balance."""
        try:
            user = request.user
            
            # Check user role
            user_role = getattr(user, 'role', None)
            print(f"[DEBUG] Reject order - User: {getattr(user, 'email', 'unknown')}, Role: {user_role}")
            
            # Allow admin, shopAdmin, and sub-admins
            if user_role not in ['admin', 'shopAdmin']:
                print(f"[ERROR] User role '{user_role}' not authorized to reject orders")
                return Response({
                    'error': 'Forbidden - Only admins and shop admins can reject orders',
                    'user_role': user_role
                }, status=status.HTTP_403_FORBIDDEN)

            try:
                order = self.get_object()
            except Exception:
                try:
                    order = Order.objects.get(order_id=pk)
                except Order.DoesNotExist:
                    return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Shop context check - ensure shop admin can only reject orders from their shop
            if user_role == 'shopAdmin':
                user_shop_id = str(user.shop.id) if hasattr(user, 'shop') and user.shop else None
                order_shop_id = str(order.shop.id)
                
                if user_shop_id != order_shop_id:
                    print(f"[ERROR] Shop admin trying to reject order from different shop")
                    return Response({
                        'error': 'You can only reject orders from your own shop'
                    }, status=status.HTTP_403_FORBIDDEN)

            if order.status in ['expired', 'completed']:
                # No-op: already finalized; return current state for idempotency
                return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

            with transaction.atomic():
                # Always refund to wallet if paid, regardless of payment method
                if order.is_paid:
                    order.user.balance += order.total_price
                    order.user.save()
                    # Create refund transaction with method/status for UI clarity
                    try:
                        payment_method = None
                        try:
                            pr = order.payment_result or {}
                            payment_method = pr.get('method') or pr.get('payment_method') or 'balance'
                        except Exception:
                            payment_method = 'balance'
                        Transaction.objects.create(
                            user=order.user,
                            shop=order.shop,
                            order=order,
                            amount=order.total_price,
                            type='refund',
                            status='success',
                            payment_method=payment_method,
                            description=f'Refund for rejected order {order.order_id}',
                            metadata={'reason': 'admin_reject'}
                        )
                    except Exception:
                        pass
                    # Notify wallet balance change in real-time
                    try:
                        from api.tasks import send_wallet_update
                        send_wallet_update(
                            user_id=str(order.user.id),
                            balance=float(order.user.balance),
                            change=float(order.total_price),  # Positive for refund
                            transaction_type='order_refund'
                        )
                    except Exception:
                        pass
                # Mark order as expired and unpaid after refund so it won't reappear in verification queue
                order.status = 'expired'
                order.is_verified = False
                order.is_paid = False
                # Optionally annotate payment_result to reflect refund
                try:
                    pr = order.payment_result or {}
                    pr.update({'status': 'refunded', 'refunded_at': timezone.now().isoformat()})
                    order.payment_result = pr
                except Exception:
                    pass
                order.save()
                # Always record a cancellation transaction for audit trail (amount 0 when no refund)
                try:
                    performer = getattr(request, 'user', None)
                    performer_name = getattr(performer, 'name', getattr(performer, 'username', '')) if performer else 'System'
                    performer_email = getattr(performer, 'email', '') if performer else ''
                    performer_role = getattr(performer, 'role', '') if performer else ''
                    Transaction.objects.create(
                        user=order.user,
                        shop=order.shop,
                        order=order,
                        amount=0,
                        type='cancellation',
                        status='success',
                        description=f"Order {order.order_id} rejected by {performer_name}",
                        metadata={
                            'cancelled_by': {
                                'id': str(getattr(performer, 'id', '')) if performer else None,
                                'name': performer_name,
                                'email': performer_email,
                                'role': performer_role,
                            }
                        }
                    )
                except Exception:
                    pass
            # Log the rejection in shop logs
            try:
                ShopLog.objects.create(
                    shop=order.shop,
                    action='order_rejected',
                    performed_by=request.user,
                    details={
                        'order_id': order.order_id,
                        'total_price': float(order.total_price),
                        'rejected_at': timezone.now().isoformat(),
                        'reason': 'admin_reject',
                    }
                )
            except Exception:
                pass
            # Broadcast update so clients refresh order state in real-time
            try:
                from .websocket_utils import broadcast_order_verification
                order_data = OrderSerializer(order).data
                broadcast_order_verification(
                    order_id=str(order.id),
                    shop_id=str(order.shop.id),
                    order_data=order_data
                )
            except Exception:
                pass
            return Response(OrderSerializer(order).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def bill(self, request, pk=None):
        """Return a simple bill HTML for the order."""
        try:
            try:
                order = self.get_object()
            except Exception:
                order = Order.objects.get(order_id=pk)

            items_html = ''.join([
                f"<tr><td style='padding:6px 8px;border:1px solid #e5e7eb'>{i.get('name')}</td>"
                f"<td style='padding:6px 8px;border:1px solid #e5e7eb;text-align:right'>{i.get('quantity')}</td>"
                f"<td style='padding:6px 8px;border:1px solid #e5e7eb;text-align:right'>₹{i.get('price')}</td>"
                f"<td style='padding:6px 8px;border:1px solid #e5e7eb;text-align:right'>₹{float(i.get('price'))*int(i.get('quantity'))}</td></tr>"
                for i in (order.order_items or [])
            ])
            # Prefer paid time if available; fall back to created time
            display_dt = order.paid_at or order.created_at
            try:
                # Determine timezone preference: query param tz, header X-Timezone, env var LOCAL_TIME_ZONE,
                # else Django settings.TIME_ZONE, else UTC
                from django.conf import settings as django_settings
                try:
                    from zoneinfo import ZoneInfo
                    tz_param = request.query_params.get('tz') or request.GET.get('tz')
                    tz_header = request.headers.get('X-Timezone') or request.META.get('HTTP_X_TIMEZONE')
                    tz_name = (tz_param or tz_header or os.environ.get('LOCAL_TIME_ZONE') 
                               or getattr(django_settings, 'TIME_ZONE', 'UTC'))
                    local_dt = display_dt.astimezone(ZoneInfo(tz_name))
                except Exception:
                    # Fallback to Django's timezone helper (uses settings.TIME_ZONE)
                    local_dt = timezone.localtime(display_dt)
            except Exception:
                local_dt = display_dt

            display_dt_str = local_dt.strftime('%Y-%m-%d %I:%M %p %Z')

            html = f"""
<!doctype html>
<html><head><meta charset='utf-8'><title>Bill {order.order_id}</title></head>
<body style='font-family:Arial,Helvetica,sans-serif;color:#111827'>
  <div style='max-width:720px;margin:24px auto;padding:16px;border:1px solid #e5e7eb;border-radius:8px'>
    <h2 style='margin:0 0 8px 0'>Bill</h2>
    <div style='font-size:14px;color:#374151'>
      <div><strong>Order ID:</strong> {order.order_id}</div>
      <div><strong>Date:</strong> {display_dt_str}</div>
      <div><strong>Shop:</strong> {order.shop.name}</div>
      <div><strong>Customer:</strong> {order.user.name}</div>
    </div>
    <table style='width:100%;border-collapse:collapse;margin-top:12px;font-size:14px'>
      <thead>
        <tr style='background:#f3f4f6'>
          <th style='text-align:left;padding:8px;border:1px solid #e5e7eb'>Item</th>
          <th style='text-align:right;padding:8px;border:1px solid #e5e7eb'>Qty</th>
          <th style='text-align:right;padding:8px;border:1px solid #e5e7eb'>Price</th>
          <th style='text-align:right;padding:8px;border:1px solid #e5e7eb'>Total</th>
        </tr>
      </thead>
      <tbody>
        {items_html}
      </tbody>
      <tfoot>
        <tr>
          <td colspan='3' style='text-align:right;padding:8px;border:1px solid #e5e7eb'><strong>Grand Total</strong></td>
          <td style='text-align:right;padding:8px;border:1px solid #e5e7eb'><strong>₹{order.total_price}</strong></td>
        </tr>
      </tfoot>
    </table>
  </div>
</body></html>
"""
            return Response({'html': html})
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_update(self, serializer):
        """Log order updates"""
        old_order = self.get_object()
        order = serializer.save()
        
        # Determine what fields were updated
        updated_fields = []
        for field, value in serializer.validated_data.items():
            if hasattr(old_order, field) and getattr(old_order, field) != value:
                updated_fields.append(field)
        
        if updated_fields:
            # Special logging for status changes
            if 'status' in updated_fields:
                old_status = getattr(old_order, 'status', 'unknown')
                new_status = getattr(order, 'status', 'unknown')
                
                ShopLog.objects.create(
                    shop=order.shop,
                    action='order_status_changed',
                    performed_by=self.request.user,
                    details={
                        'order_id': order.order_id,
                        'old_status': old_status,
                        'new_status': new_status,
                        'total_price': float(order.total_price),
                        'customer_name': order.user.name if order.user else 'Unknown',
                        'changed_by_role': getattr(self.request.user, 'role', 'unknown'),
                        'changed_by_name': getattr(self.request.user, 'name', 'Unknown')
                    }
                )
                
                # Broadcast order status update via WebSocket
                try:
                    from .websocket_utils import broadcast_order_update
                    broadcast_order_update(
                        order_id=str(order.id),
                        status=new_status,
                        shop_id=str(order.shop.id)
                    )
                    print(f"[DEBUG] Order status update broadcasted via WebSocket for order {order.order_id}")
                except Exception as e:
                    print(f"[ERROR] Failed to broadcast order status update: {e}")
            
            # Special logging for verification changes
            if 'is_verified' in updated_fields:
                old_verified = getattr(old_order, 'is_verified', False)
                new_verified = getattr(order, 'is_verified', False)
                
                if new_verified and not old_verified:
                    # Order was verified
                    ShopLog.objects.create(
                        shop=order.shop,
                        action='order_verified',
                        performed_by=self.request.user,
                        details={
                            'order_id': order.order_id,
                            'total_price': float(order.total_price),
                            'verified_at': order.verified_at.isoformat() if hasattr(order, 'verified_at') and order.verified_at else None,
                            'verifier_role': getattr(self.request.user, 'role', 'unknown'),
                            'verifier_name': getattr(self.request.user, 'name', 'Unknown'),
                            'customer_name': order.user.name if order.user else 'Unknown'
                        }
                    )
                elif old_verified and not new_verified:
                    # Order was unverified
                    ShopLog.objects.create(
                        shop=order.shop,
                        action='order_unverified',
                        performed_by=self.request.user,
                        details={
                            'order_id': order.order_id,
                            'total_price': float(order.total_price),
                            'unverified_by_role': getattr(self.request.user, 'role', 'unknown'),
                            'unverified_by_name': getattr(self.request.user, 'name', 'Unknown'),
                            'customer_name': order.user.name if order.user else 'Unknown'
                        }
                    )
            
            # General logging for other updates
            other_fields = [f for f in updated_fields if f not in ['status', 'is_verified']]
            if other_fields:
                ShopLog.objects.create(
                    shop=order.shop,
                    action='order_updated',
                    performed_by=self.request.user,
                    details={
                        'order_id': order.order_id,
                        'updated_fields': other_fields,
                        'old_values': {field: getattr(old_order, field) for field in other_fields if hasattr(old_order, field)},
                        'new_values': {field: getattr(order, field) for field in other_fields if hasattr(order, field)}
                    }
                )
        
        return order

    def perform_destroy(self, instance):
        """Log order deletion"""
        # Log the order deletion before deleting
        ShopLog.objects.create(
            shop=instance.shop,
            action='order_deleted',
            performed_by=self.request.user,
            details={
                'order_id': instance.order_id,
                'total_price': float(instance.total_price),
                'customer_name': instance.user.name if instance.user else 'Unknown'
            }
        )
        
        instance.delete()

    def create(self, request, *args, **kwargs):
        """Create a single shop order"""
        try:
            # Check if ordering is enabled
            from startup.models import SiteConfiguration
            config = SiteConfiguration.get_config()
            if not config.ordering_enabled:
                return Response(
                    {"error": "Ordering is currently disabled. Please try again later."},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check year and department restrictions for students
            user = request.user
            if user.is_authenticated and user.role == 'student':
                if not config.is_ordering_allowed(year=user.year, department=user.department):
                    return Response(
                        {"error": "Ordering is currently restricted for your year or department. Please contact administration."},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
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
                # Strong balance handling (atomic + Decimal + row lock)
                from decimal import Decimal, ROUND_HALF_UP
                user_locked = User.objects.select_for_update().get(id=request.user.id)
                current_balance: Decimal = Decimal(user_locked.balance)
                charge: Decimal = Decimal(total_price).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                if current_balance < charge:
                    return Response({'error': 'Insufficient balance'}, status=status.HTTP_400_BAD_REQUEST)
                new_balance = (current_balance - charge).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                user_locked.balance = new_balance
                user_locked.save(update_fields=['balance'])

                order.is_paid = True
                order.paid_at = timezone.now()
                order.payment_result = {'method': 'balance', 'status': 'success'}
                order.save(update_fields=['is_paid', 'paid_at', 'payment_result'])

                Transaction.objects.create(
                    user=order.user,
                    shop=order.shop,
                    order=order,
                    amount=charge,
                    type='payment',
                    payment_method='balance',
                    description=f'Payment for order {order.order_id}'
                )

                # Send WebSocket update for wallet balance change
                from api.tasks import send_wallet_update
                send_wallet_update(
                    user_id=str(order.user.id),
                    balance=float(user_locked.balance),
                    change=-float(charge),  # Negative for deduction
                    transaction_type='order_payment'
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
                            
                            # Send WebSocket update for wallet balance change
                            from api.tasks import send_wallet_update
                            send_wallet_update(
                                user_id=str(user.id),
                                balance=float(user.balance),
                                change=float(order.total_price),
                                transaction_type='expiry_refund'
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
            # Before returning, auto-mark any overdue orders as expired to keep UI in sync
            now = timezone.now()
            overdue = Order.objects.filter(
                shop=shop_id,
                status='pending',
                is_verified=False,
                expires_at__lt=now,
            )
            for o in overdue:
                try:
                    with transaction.atomic():
                        o.status = 'expired'
                        o.save(update_fields=['status', 'updated_at'])
                        
                        # If order was paid, refund to wallet
                        if o.is_paid:
                            user = o.user
                            user.balance += o.total_price
                            user.save()
                            
                            # Log refund transaction
                            Transaction.objects.create(
                                user=user,
                                shop=o.shop,
                                order=o,
                                amount=o.total_price,
                                type='credit',
                                status='success',
                                payment_method='balance',
                                description=f'Order {o.order_id} expired, amount returned to wallet.'
                            )
                            
                            # Send WebSocket update for wallet balance change
                            try:
                                from api.tasks import send_wallet_update
                                send_wallet_update(
                                    user_id=str(user.id),
                                    balance=float(user.balance),
                                    change=float(o.total_price),
                                    transaction_type='expiry_refund'
                                )
                            except Exception:
                                pass
                except Exception as e:
                    print(f"[ERROR] Failed to expire order {o.order_id}: {str(e)}")
                    pass

            orders = Order.objects.filter(shop=shop_id)
            # Convert orders to dictionaries with proper UUID handling
            orders_data = []
            for order in orders:
                # Process order items to include product information
                processed_items = []
                for item in order.order_items:
                    try:
                        product = Product.objects.get(id=item.get('product_id'))
                        processed_item = {
                            'product': {
                                'name': product.name,
                                'price': float(product.price)
                            },
                            'quantity': item.get('quantity', 0)
                        }
                        processed_items.append(processed_item)
                    except Product.DoesNotExist:
                        # If product doesn't exist, include basic info
                        processed_item = {
                            'product': {
                                'name': 'Product Not Found',
                                'price': 0
                            },
                            'quantity': item.get('quantity', 0)
                        }
                        processed_items.append(processed_item)
                
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
                    'payment_result': order.payment_result,
                    'is_verified': order.is_verified,
                    'status': order.status,
                    'order_items': processed_items,
                    'createdAt': order.created_at.isoformat() if order.created_at else None,
                }
                # Convenience flag to help UI distinguish admin rejection from natural expiry
                try:
                    pr = order.payment_result or {}
                    order_dict['is_rejected'] = (
                        order.status == 'expired' and (not order.is_paid) and (
                            (pr.get('status') == 'refunded') or ('refunded_at' in pr) or (pr.get('reason') == 'admin_reject')
                        )
                    )
                except Exception:
                    order_dict['is_rejected'] = False
                orders_data.append(order_dict)
            return Response(orders_data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    # Multi-shop endpoint removed

    @action(detail=False, methods=['get', 'post'])
    def scan_qr_code(self, request):
        """Scan a QR string/payload and return the associated order details.

        Accepts either:
        - qr_code_data: full QR JSON payload string
        - order_id: a direct order id like "ORD-XXXX"
        Works with GET (query params) and POST (JSON/form body).
        """
        try:
            # Support both GET and POST sources
            raw_qr = request.data.get('qr_code_data') or request.query_params.get('qr_code_data')
            explicit_order_id = request.data.get('order_id') or request.query_params.get('order_id')

            order_id = None
            if explicit_order_id:
                order_id = str(explicit_order_id).strip()
            elif raw_qr:
                # Try parse JSON payload to extract order_id
                try:
                    payload = json.loads(raw_qr)
                    if isinstance(payload, dict) and payload.get('order_id'):
                        order_id = str(payload.get('order_id')).strip()
                    else:
                        # Walk nested structures to find first order_id
                        def collect_first_order_id(node):
                            if not node:
                                return None
                            if isinstance(node, dict):
                                if 'order_id' in node:
                                    return str(node['order_id']).strip()
                                for v in node.values():
                                    found = collect_first_order_id(v)
                                    if found:
                                        return found
                            if isinstance(node, list):
                                for v in node:
                                    found = collect_first_order_id(v)
                                    if found:
                                        return found
                            return None
                        order_id = collect_first_order_id(payload)
                except Exception:
                    # Fallback: attempt to regex order_id from plain string
                    import re
                    m = re.search(r'"order_id"\s*:\s*"([^"]+)"', raw_qr)
                    if m:
                        order_id = m.group(1)

            if not order_id:
                return Response({'error': 'Order ID not found in QR data'}, status=status.HTTP_400_BAD_REQUEST)

            # Lookup by order_id or UUID
            try:
                order = Order.objects.get(order_id=order_id)
            except Order.DoesNotExist:
                # Try UUID lookup via primary key
                try:
                    order = Order.objects.get(id=order_id)
                except Exception:
                    return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        # The serializer already handles order creation, so we just need to handle post-creation tasks
        order = serializer.save()
        
        # QR generation removed: do not set qr_code/qr_valid_until
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

    @action(detail=True, methods=['put', 'post'])
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

        # --- SHOP CONTEXT CHECK ---
        user = request.user
        selected_shop_id = None
        if hasattr(user, 'role') and user.role == 'shopAdmin' and hasattr(user, 'shop') and user.shop:
            selected_shop_id = str(user.shop.id)
        elif hasattr(user, 'role') and user.role == 'admin' and hasattr(user, 'selected_shop_id'):
            selected_shop_id = str(user.selected_shop_id)
        elif 'selected_shop_id' in request.data:
            selected_shop_id = str(request.data['selected_shop_id'])
        if selected_shop_id and str(order.shop.id) != selected_shop_id:
            return Response({'error': 'You can only verify orders for your own shop.'}, status=status.HTTP_403_FORBIDDEN)
        # --- END SHOP CONTEXT CHECK ---

        if order.is_verified:
            # Idempotent success
            return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)

        # Mark as verified
        order.is_verified = True
        order.verified_at = timezone.now()
        order.status = 'completed'
        order.save()

        # Log the order verification
        ShopLog.objects.create(
            shop=order.shop,
            action='order_verified',
            performed_by=request.user,
            details={
                'order_id': order.order_id,
                'total_price': float(order.total_price),
                'verified_at': order.verified_at.isoformat(),
                'verifier_role': getattr(request.user, 'role', 'unknown'),
                'verifier_name': getattr(request.user, 'name', 'Unknown'),
                'customer_name': order.user.name if order.user else 'Unknown'
            }
        )

        # Multiorder QR update logic
        try:
            # Only update if this order has a multiorder QR
            import json
            qr_payload = json.loads(order.qr_code or '{}')
            if isinstance(qr_payload, dict) and qr_payload.get('type') == 'multi_order':
                # Find all sibling orders in this group
                sibling_orders = []
                orders_list = qr_payload.get('orders') or []
                for entry in orders_list:
                    oid = entry.get('order_id')
                    if not oid:
                        continue
                    try:
                        o = Order.objects.get(order_id=oid)
                        sibling_orders.append(o)
                    except Order.DoesNotExist:
                        continue
                # Remove verified orders from the QR payload
                unverified_orders = [o for o in sibling_orders if not o.is_verified]
                if unverified_orders:
                    # Update QR for all unverified siblings
                    new_orders_list = []
                    for o in unverified_orders:
                        # Use latest items for each order
                        item_summary = [
                            {
                                'name': it.get('name'),
                                'quantity': it.get('quantity'),
                            }
                            for it in (o.order_items or [])
                        ]
                        new_orders_list.append({
                            'order_id': o.order_id,
                            'shop_id': str(o.shop.id),
                            'shop_name': o.shop.name,
                            'items': item_summary,
                        })
                    new_qr_payload = {
                        'type': 'multi_order',
                        'user_id': str(order.user.id),
                        'orders': new_orders_list,
                        'total_price': str(sum([float(o.total_price) for o in unverified_orders])),
                    }
                    new_qr_str = json.dumps(new_qr_payload)
                    for o in unverified_orders:
                        o.qr_code = new_qr_str
                        o.save()
                else:
                    # All verified, clear QR for all siblings
                    for o in sibling_orders:
                        o.qr_code = None
                        o.save()
        except Exception as e:
            pass  # Non-fatal, don't block verification

        # Create transaction for verification, recording who verified
        try:
            verifier = getattr(request, 'user', None)
            verified_by = None
            if getattr(verifier, 'is_authenticated', False):
                verified_by = {
                    'id': str(getattr(verifier, 'id', '')),
                    'name': getattr(verifier, 'name', getattr(verifier, 'username', '')),
                    'email': getattr(verifier, 'email', ''),
                    'role': getattr(verifier, 'role', ''),
                    'shop': {
                        'id': str(getattr(getattr(verifier, 'shop', None), 'id', '')) if getattr(verifier, 'shop', None) else None,
                        'name': getattr(getattr(verifier, 'shop', None), 'name', None) if getattr(verifier, 'shop', None) else None,
                    }
                }
            Transaction.objects.create(
                user=order.user,
                shop=order.shop,
                order=order,
                amount=order.total_price,
                type='verification',
                description=f'Order verification for {order.order_id}',
                metadata={
                    'verified_by': verified_by,
                    'verified_at': timezone.now().isoformat(),
                }
            )
        except Exception:
            # Fail-safe: still create a minimal record
            Transaction.objects.create(
                user=order.user,
                shop=order.shop,
                order=order,
                amount=order.total_price,
                type='verification',
                description=f'Order verification for {order.order_id}'
            )

        # Broadcast WebSocket update for real-time order verification
        try:
            from .websocket_utils import broadcast_order_verification
            order_data = OrderSerializer(order).data
            print(f"DEBUG: About to broadcast order verification")
            print(f"DEBUG: Order ID: {order.id} (type: {type(order.id)})")
            print(f"DEBUG: Shop ID: {order.shop.id} (type: {type(order.shop.id)})")
            print(f"DEBUG: Order data keys: {list(order_data.keys())}")
            print(f"DEBUG: Order data ID: {order_data.get('id')} (type: {type(order_data.get('id'))})")
            print(f"DEBUG: Order verification status: {order_data.get('is_verified')}")
            
            broadcast_order_verification(
                order_id=str(order.id),
                shop_id=str(order.shop.id),
                order_data=order_data
            )
            print(f"DEBUG: Order verification broadcast completed successfully")
        except Exception as e:
            print(f"DEBUG: Failed to broadcast order verification update: {e}")
            import traceback
            traceback.print_exc()
            # Non-fatal, don't block the response

        return Response(OrderSerializer(order).data)

    @action(detail=False, methods=['post'], url_path='verify-razorpay-payment')
    def verify_razorpay_payment(self, request):
        """
        Verify Razorpay payment and update pending order to paid.
        This endpoint is called after successful Razorpay payment.
        """
        import razorpay
        from django.conf import settings
        from django.db.models import F
        
        # Check authentication
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_order_id = request.data.get('razorpay_order_id')
        razorpay_signature = request.data.get('razorpay_signature')
        
        if not all([razorpay_payment_id, razorpay_order_id, razorpay_signature]):
            return Response({'error': 'Missing Razorpay payment details'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify signature
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            params_dict = {
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature
            }
            client.utility.verify_payment_signature(params_dict)
            
        except Exception as e:
            return Response({'error': f'Payment verification failed: {str(e)}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Find pending order by razorpay_order_id
        try:
            pending_order = Order.objects.get(
                payment_result__razorpay_order_id=razorpay_order_id,
                is_paid=False,
                user=request.user
            )
        except Order.DoesNotExist:
            return Response({'error': 'Order not found. Please contact support if payment was deducted.'}, 
                          status=status.HTTP_404_NOT_FOUND)
        except Order.MultipleObjectsReturned:
            # Get the most recent one
            pending_order = Order.objects.filter(
                payment_result__razorpay_order_id=razorpay_order_id,
                is_paid=False,
                user=request.user
            ).order_by('-created_at').first()
        
        # Update order and deduct stock
        try:
            with transaction.atomic():
                # Deduct stock for each item
                for item in pending_order.order_items:
                    product_id = item.get('product_id')
                    quantity = item.get('quantity')
                    
                    # Lock product row
                    product = Product.objects.select_for_update().get(id=product_id)
                    
                    # Deduct stock for regular stock products
                    if product.stock_mode == 'stock':
                        updated = Product.objects.filter(id=product.id, stock__gte=quantity).update(stock=F('stock') - quantity)
                        if updated != 1:
                            raise serializers.ValidationError(f"Not enough stock for {product.name}. Please contact support.")
                    
                    # Broadcast stock update
                    if _channels_available:
                        try:
                            from .websocket_utils import broadcast_stock_update
                            product.refresh_from_db()
                            broadcast_stock_update(
                                product_id=str(product.id),
                                stock=int(product.stock),
                                shop_id=str(pending_order.shop.id)
                            )
                        except Exception:
                            pass
                
                # Update order to paid
                pending_order.is_paid = True
                pending_order.paid_at = timezone.now()
                pending_order.payment_result = {
                    'method': 'razorpay',
                    'status': 'success',
                    'razorpay_payment_id': razorpay_payment_id,
                    'razorpay_order_id': razorpay_order_id,
                    'razorpay_signature': razorpay_signature
                }
                pending_order.save()
                
                # Create transaction record
                Transaction.objects.create(
                    user=request.user,
                    shop=pending_order.shop,
                    order=pending_order,
                    amount=pending_order.total_price,
                    type='payment',
                    payment_method='razorpay',
                    status='success',
                    description=f'Razorpay payment for order {pending_order.order_id}'
                )
                
                # Log order payment
                ShopLog.objects.create(
                    shop=pending_order.shop,
                    action='order_created',
                    performed_by=request.user if request.user.role != 'student' else None,
                    details={
                        'order_id': pending_order.order_id,
                        'total_price': float(pending_order.total_price),
                        'payment_method': 'razorpay',
                        'items_count': len(pending_order.order_items),
                        'customer_name': request.user.name
                    }
                )
                
                # Log student/staff activity
                if request.user.role in ['student', 'staff']:
                    from .student_logger import log_student_activity
                    log_student_activity(
                        user=request.user,
                        action='place_order',
                        description=f'Placed order #{pending_order.order_id} for ₹{pending_order.total_price}',
                        shop=pending_order.shop,
                        order=pending_order,
                        metadata={'payment_method': 'razorpay', 'total_price': float(pending_order.total_price)},
                        request=request
                    )
                
                serializer = self.get_serializer(pending_order)
                return Response({
                    'message': 'Payment successful',
                    'order': serializer.data
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({'error': f'Failed to process payment: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='cancel-razorpay')
    def cancel_razorpay_order(self, request):
        """Cancel a pending Razorpay order (before payment completion)."""
        razorpay_order_id = request.data.get('razorpay_order_id')
        
        if not razorpay_order_id:
            return Response({'error': 'Razorpay order ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find and delete pending order
        try:
            pending_order = Order.objects.get(
                payment_result__razorpay_order_id=razorpay_order_id,
                is_paid=False
            )
            pending_order.delete()
        except Order.DoesNotExist:
            pass  # Already deleted or doesn't exist
        
        return Response({'message': 'Order cancelled successfully'}, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['put'])
    def cancel(self, request, pk=None):
        """Cancel an order and restock items when unpaid"""
        order = self.get_object()

        if order.is_paid:
            return Response({'error': 'Cannot cancel a paid order'}, status=status.HTTP_400_BAD_REQUEST)

        if order.status == 'cancelled':
            return Response({'error': 'Order is already cancelled'}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction as db_transaction
        from .models import Product as _Product
        with db_transaction.atomic():
            # Restock items for unpaid order
            try:
                for it in (order.order_items or []):
                    pid = it.get('product_id')
                    qty = int(it.get('quantity') or 0)
                    if not pid or qty <= 0:
                        continue
                    try:
                        p = _Product.objects.select_for_update().get(id=pid)
                        # Only restock regular stock products, not live stock products
                        if p.stock_mode == 'stock':
                            p.stock = p.stock + qty
                            p.save()
                        # For live stock products, no restocking needed
                    except _Product.DoesNotExist:
                        pass
            except Exception:
                pass

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


    @action(detail=True, methods=['post', 'patch'])
    def update_expiry(self, request, pk=None):
        """Update or extend an order's expiry time.

        Accepts either:
        - add_minutes: int (positive) to extend from current expires_at
        - new_expires_at: ISO datetime string to set absolute expiry

        Constraints:
        - Only for pending, unverified orders
        - Cannot set beyond shop.final_validity_time if present
        - Requires admin or shopAdmin
        """
        try:
            if getattr(request.user, 'role', None) not in ['admin', 'shopAdmin']:
                return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

            try:
                order = self.get_object()
            except Exception:
                try:
                    order = Order.objects.get(order_id=pk)
                except Order.DoesNotExist:
                    return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

            if order.status != 'pending' or order.is_verified:
                return Response({'error': 'Only pending, unverified orders can be updated'}, status=status.HTTP_400_BAD_REQUEST)

            add_minutes = request.data.get('add_minutes')
            new_expires_at = request.data.get('new_expires_at')

            from django.utils.dateparse import parse_datetime
            target = None
            if add_minutes is not None:
                try:
                    delta = int(add_minutes)
                except Exception:
                    return Response({'error': 'add_minutes must be an integer'}, status=status.HTTP_400_BAD_REQUEST)
                if delta <= 0:
                    return Response({'error': 'add_minutes must be > 0'}, status=status.HTTP_400_BAD_REQUEST)
                base = order.expires_at or timezone.now()
                target = base + timedelta(minutes=delta)
            elif new_expires_at:
                dt = parse_datetime(str(new_expires_at))
                if not dt:
                    return Response({'error': 'new_expires_at must be an ISO datetime'}, status=status.HTTP_400_BAD_REQUEST)
                target = dt
            else:
                return Response({'error': 'Provide add_minutes or new_expires_at'}, status=status.HTTP_400_BAD_REQUEST)

            # Respect shop final validity cap
            try:
                shop_cap = getattr(order.shop, 'final_validity_time', None)
                if shop_cap and target > shop_cap:
                    target = shop_cap
            except Exception:
                pass

            if target <= timezone.now():
                return Response({'error': 'Expiry must be in the future'}, status=status.HTTP_400_BAD_REQUEST)

            order.expires_at = target
            order.save(update_fields=['expires_at', 'updated_at'])

            # Optional: reflect in qr_valid_until when reserved/unpaid flows use it
            try:
                if not order.is_paid:
                    order.qr_valid_until = target
                    order.save(update_fields=['qr_valid_until', 'updated_at'])
            except Exception:
                pass

            return Response(OrderSerializer(order).data)
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

    @action(detail=False, methods=['get'])
    def shop(self, request):
        """Get transactions for a specific shop"""
        try:
            shop_id = request.query_params.get('shop_id')
            if not shop_id:
                return Response({'error': 'shop_id parameter is required'}, status=400)

            # Get shop transactions
            transactions = Transaction.objects.filter(shop_id=shop_id).order_by('-created_at')

            # Apply filters
            transaction_type = request.query_params.get('type')
            if transaction_type:
                transactions = transactions.filter(type=transaction_type)

            status_filter = request.query_params.get('status')
            if status_filter:
                transactions = transactions.filter(status=status_filter)

            start_date = request.query_params.get('startDate')
            if start_date:
                transactions = transactions.filter(created_at__date__gte=start_date)

            end_date = request.query_params.get('endDate')
            if end_date:
                transactions = transactions.filter(created_at__date__lte=end_date)

            search = request.query_params.get('search')
            if search:
                transactions = transactions.filter(
                    Q(user__name__icontains=search) |
                    Q(description__icontains=search) |
                    Q(order__order_id__icontains=search)
                )

            # Pagination
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 50))
            offset = (page - 1) * limit

            total = transactions.count()
            transactions = transactions[offset:offset + limit]

            # Serialize with additional context
            serializer = self.get_serializer(transactions, many=True)
            data = serializer.data

            # Add pagination info
            response_data = {
                'results': data,
                'total': total,
                'currentPage': page,
                'totalPages': (total + limit - 1) // limit,
                'hasNext': offset + limit < total,
                'hasPrevious': page > 1
            }

            return Response(response_data)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ShopLogViewSet(viewsets.ModelViewSet):
    queryset = ShopLog.objects.all()
    serializer_class = ShopLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        print(f"[DEBUG] ShopLogViewSet - User: {user}, Role: {getattr(user, 'role', 'None')}, Is Superuser: {getattr(user, 'is_superuser', False)}")
        
        # Admin users should see all logs
        if getattr(user, 'role', None) == 'admin' or getattr(user, 'is_superuser', False):
            print(f"[DEBUG] Admin user - returning all logs")
            return ShopLog.objects.all().order_by('-created_at')
        elif getattr(user, 'role', None) == 'shopAdmin':
            print(f"[DEBUG] Shop admin user - filtering by shop")
            return ShopLog.objects.filter(shop__shop_admin=user).order_by('-created_at')
        else:
            print(f"[DEBUG] Regular user - no logs")
            return ShopLog.objects.none()

    @action(detail=False, methods=['get'])
    def admin_all_logs(self, request):
        """Get all logs for admin users with enhanced filtering"""
        if not (getattr(request.user, 'role', None) == 'admin' or getattr(request.user, 'is_superuser', False)):
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Get query parameters
            shop_id = request.query_params.get('shop_id')
            action = request.query_params.get('action')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            performed_by = request.query_params.get('performed_by')
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 50))
            
            # Start with all logs
            queryset = ShopLog.objects.all()
            
            # Apply filters
            if shop_id:
                queryset = queryset.filter(shop_id=shop_id)
                print(f"[DEBUG] Filtered by shop_id: {shop_id}")
            
            if action:
                queryset = queryset.filter(action=action)
                print(f"[DEBUG] Filtered by action: {action}")
            
            if start_date:
                print(f"[DEBUG] Start date received: {start_date}, type: {type(start_date)}")
                try:
                    # Handle different date formats
                    if isinstance(start_date, str):
                        queryset = queryset.filter(created_at__date__gte=start_date)
                        print(f"[DEBUG] Filtered by start_date: {start_date}")
                    else:
                        print(f"[DEBUG] Start date is not a string, skipping filter")
                except Exception as e:
                    print(f"[DEBUG] Error filtering by start_date: {e}")
            
            if end_date:
                print(f"[DEBUG] End date received: {end_date}, type: {type(end_date)}")
                try:
                    # Handle different date formats
                    if isinstance(end_date, str):
                        queryset = queryset.filter(created_at__date__lte=end_date)
                        print(f"[DEBUG] Filtered by end_date: {end_date}")
                    else:
                        print(f"[DEBUG] End date is not a string, skipping filter")
                except Exception as e:
                    print(f"[DEBUG] Error filtering by end_date: {e}")
            
            if performed_by:
                queryset = queryset.filter(performed_by__name__icontains=performed_by)
                print(f"[DEBUG] Filtered by performed_by: {performed_by}")
            
            # Order by creation date
            queryset = queryset.order_by('-created_at')
            
            # Pagination
            offset = (page - 1) * limit
            total = queryset.count()
            logs = queryset[offset:offset + limit]
            
            # Serialize
            serializer = self.get_serializer(logs, many=True)
            
            return Response({
                'results': serializer.data,
                'total': total,
                'currentPage': page,
                'totalPages': (total + limit - 1) // limit,
                'hasNext': offset + limit < total,
                'hasPrevious': page > 1
            })
            
        except Exception as e:
            print(f"[ERROR] Admin all logs error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def list(self, request, *args, **kwargs):
        """Override list method to add debugging and proper filtering"""
        print(f"[DEBUG] ShopLogViewSet.list called by user: {request.user}, role: {getattr(request.user, 'role', 'None')}")
        
        try:
            # Get the base queryset
            queryset = self.get_queryset()
            
            # Get query parameters for filtering
            shop_id = request.query_params.get('shop')
            action = request.query_params.get('action')
            start_date = request.query_params.get('startDate')  # Frontend sends startDate
            end_date = request.query_params.get('endDate')      # Frontend sends endDate
            performed_by = request.query_params.get('performedBy')
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 50))
            
            print(f"[DEBUG] Filter params - shop: {shop_id}, action: {action}, start: {start_date}, end: {end_date}, user: {performed_by}, page: {page}, limit: {limit}")
            
            # Apply filters
            if shop_id:
                queryset = queryset.filter(shop_id=shop_id)
                print(f"[DEBUG] Filtered by shop_id: {shop_id}")
            
            if action:
                queryset = queryset.filter(action=action)
                print(f"[DEBUG] Filtered by action: {action}")
            
            if start_date:
                queryset = queryset.filter(created_at__date__gte=start_date)
                print(f"[DEBUG] Filtered by start_date: {start_date}")
            
            if end_date:
                queryset = queryset.filter(created_at__date__lte=end_date)
                print(f"[DEBUG] Filtered by end_date: {end_date}")
            
            if performed_by:
                queryset = queryset.filter(performed_by__name__icontains=performed_by)
                print(f"[DEBUG] Filtered by performed_by: {performed_by}")
            
            # Order by creation date (newest first)
            queryset = queryset.order_by('-created_at')
            
            # Get total count before pagination
            total = queryset.count()
            print(f"[DEBUG] Total logs after filtering: {total}")
            
            # Apply pagination
            offset = (page - 1) * limit
            logs = queryset[offset:offset + limit]
            print(f"[DEBUG] Pagination - offset: {offset}, limit: {limit}, returned: {len(logs)}")
            
            # Serialize the paginated results
            serializer = self.get_serializer(logs, many=True)
            
            # Return paginated response
            response_data = {
                'results': serializer.data,
                'total': total,
                'currentPage': page,
                'totalPages': (total + limit - 1) // limit,
                'hasNext': offset + limit < total,
                'hasPrevious': page > 1
            }
            
            print(f"[DEBUG] Response - total: {total}, pages: {response_data['totalPages']}, current: {page}")
            print(f"[DEBUG] Response data keys: {list(response_data.keys())}")
            print(f"[DEBUG] Results count: {len(response_data['results'])}")
            return Response(response_data)
            
        except Exception as e:
            print(f"[ERROR] ShopLogViewSet.list error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def create_test_log(self, request):
        """Create a test log entry for debugging purposes"""
        if not (getattr(request.user, 'role', None) == 'admin' or getattr(request.user, 'is_superuser', False)):
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Get the first shop for testing
            shop = Shop.objects.first()
            if not shop:
                return Response({'error': 'No shops found'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Create a test log entry
            test_log = ShopLog.objects.create(
                shop=shop,
                action='test_log_created',
                performed_by=request.user,
                details={
                    'test_message': 'This is a test log entry',
                    'created_by': request.user.email,
                    'timestamp': timezone.now().isoformat(),
                    'purpose': 'Testing logging system'
                }
            )
            
            print(f"[DEBUG] Test log created: {test_log.id}")
            
            return Response({
                'message': 'Test log created successfully',
                'log_id': str(test_log.id),
                'shop': shop.name,
                'action': test_log.action
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"[ERROR] Test log creation error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def debug_info(self, request):
        """Get debug information about the logging system"""
        if not (getattr(request.user, 'role', None) == 'admin' or getattr(request.user, 'is_superuser', False)):
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Get basic statistics
            total_logs = ShopLog.objects.count()
            logs_by_action = ShopLog.objects.values('action').annotate(count=Count('action')).order_by('-count')
            recent_logs = ShopLog.objects.order_by('-created_at')[:5]
            
            # Get user info
            user_info = {
                'id': request.user.id,
                'email': request.user.email,
                'role': getattr(request.user, 'role', 'None'),
                'is_superuser': getattr(request.user, 'is_superuser', False),
                'is_staff': getattr(request.user, 'is_staff', False)
            }
            
            return Response({
                'debug_info': {
                    'total_logs': total_logs,
                    'logs_by_action': list(logs_by_action),
                    'recent_logs': [
                        {
                            'id': str(log.id),
                            'action': log.action,
                            'shop': log.shop.name if log.shop else 'Unknown',
                            'created_at': log.created_at.isoformat(),
                            'performed_by': getattr(log.performed_by, 'name', 'System') if log.performed_by else 'System'
                        }
                        for log in recent_logs
                    ]
                },
                'user_info': user_info,
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            print(f"[ERROR] Debug info error: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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

@api_view(['GET'])
def test_websocket(request):
    """Test endpoint to verify WebSocket configuration"""
    return Response({
        'status': 'success',
        'message': 'WebSocket test endpoint working',
        'websocket_url': 'wss://rec-kiosk.onrender.com/ws/stock/?shop_id=test',
        'timestamp': timezone.now().isoformat()
    })

@api_view(['POST'])
def test_wallet_update(request):
    """Test endpoint to trigger wallet update via WebSocket"""
    from api.tasks import send_wallet_update
    
    user_id = request.data.get('user_id')
    balance = request.data.get('balance', 100.0)
    change = request.data.get('change', 10.0)
    transaction_type = request.data.get('transaction_type', 'test')
    
    if not user_id:
        return Response({'error': 'user_id is required'}, status=400)
    
    # Send WebSocket update
    send_wallet_update(user_id, balance, change, transaction_type)
    
    return Response({
        'status': 'success',
        'message': f'Wallet update sent for user {user_id}',
        'balance': balance,
        'change': change,
        'transaction_type': transaction_type,
        'timestamp': timezone.now().isoformat()
    })



class StudentLogViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing student activity logs
    """
    queryset = StudentLog.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter logs based on user role"""
        user = self.request.user
        queryset = StudentLog.objects.select_related('user', 'shop', 'order', 'product').all()
        
        # Admin can see all logs
        if user.role == 'admin':
            return queryset
        
        # Shop admin can see logs related to their shop
        if user.role == 'shopAdmin':
            shop_id = user.shop_id
            if shop_id:
                return queryset.filter(shop_id=shop_id)
            return queryset.none()
        
        # Students and staff can only see their own logs
        if user.role in ['student', 'staff']:
            return queryset.filter(user=user)
        
        return queryset.none()
    
    def create(self, request):
        """Create a new student/staff activity log"""
        try:
            user = request.user
            
            # Only allow students and staff to create logs
            if user.role not in ['student', 'staff']:
                return Response(
                    {'error': 'Only students and staff can create activity logs'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get data from request
            action = request.data.get('action')
            description = request.data.get('description')
            shop_id = request.data.get('shop_id')
            order_id = request.data.get('order_id')
            product_id = request.data.get('product_id')
            metadata = request.data.get('metadata', {})
            
            # Validate action
            valid_actions = [choice[0] for choice in StudentLog.ACTION_CHOICES]
            if action not in valid_actions:
                return Response(
                    {'error': f'Invalid action. Must be one of: {", ".join(valid_actions)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get related objects
            shop = None
            if shop_id:
                try:
                    shop = Shop.objects.get(id=shop_id)
                except Shop.DoesNotExist:
                    pass
            
            order = None
            if order_id:
                try:
                    order = Order.objects.get(id=order_id)
                except Order.DoesNotExist:
                    pass
            
            product = None
            if product_id:
                try:
                    product = Product.objects.get(id=product_id)
                except Product.DoesNotExist:
                    pass
            
            # Get IP address and user agent
            ip_address = None
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')
            
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Create log
            log = StudentLog.objects.create(
                user=user,
                action=action,
                description=description,
                shop=shop,
                order=order,
                product=product,
                metadata=metadata,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            return Response({
                'success': True,
                'log_id': str(log.id),
                'message': 'Activity logged successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"[ERROR] Failed to create student log: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Failed to create log', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def list(self, request):
        """List student logs with filtering and pagination"""
        try:
            user = request.user
            
            # Get query parameters
            user_id = request.query_params.get('user_id')
            action = request.query_params.get('action')
            shop_id = request.query_params.get('shop_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')
            search = request.query_params.get('search', '')
            page = int(request.query_params.get('page', 1))
            limit = int(request.query_params.get('limit', 50))
            
            # Start with base queryset
            queryset = self.get_queryset()
            
            # Apply filters
            if user_id and user.role in ['admin', 'shopAdmin']:
                queryset = queryset.filter(user_id=user_id)
            
            if action:
                queryset = queryset.filter(action=action)
            
            if shop_id:
                queryset = queryset.filter(shop_id=shop_id)
            
            if start_date:
                queryset = queryset.filter(created_at__date__gte=start_date)
            
            if end_date:
                queryset = queryset.filter(created_at__date__lte=end_date)
            
            if search:
                queryset = queryset.filter(
                    Q(user__name__icontains=search) |
                    Q(user__roll_no__icontains=search) |
                    Q(description__icontains=search) |
                    Q(action__icontains=search)
                )
            
            # Order by creation date (newest first)
            queryset = queryset.order_by('-created_at')
            
            # Get total count
            total = queryset.count()
            
            # Pagination
            start_idx = (page - 1) * limit
            end_idx = start_idx + limit
            logs = queryset[start_idx:end_idx]
            
            # Serialize data
            results = []
            for log in logs:
                results.append({
                    '_id': str(log.id),
                    'user': {
                        '_id': str(log.user.id),
                        'name': log.user.name,
                        'email': log.user.email,
                        'rollNo': log.user.roll_no,
                    },
                    'action': log.action,
                    'description': log.description,
                    'shop': {
                        '_id': str(log.shop.id),
                        'name': log.shop.name,
                    } if log.shop else None,
                    'order': {
                        '_id': str(log.order.id),
                        'order_id': log.order.order_id,
                    } if log.order else None,
                    'product': {
                        '_id': str(log.product.id),
                        'name': log.product.name,
                    } if log.product else None,
                    'metadata': log.metadata,
                    'ip_address': log.ip_address,
                    'user_agent': log.user_agent,
                    'created_at': log.created_at.isoformat(),
                })
            
            return Response({
                'results': results,
                'total': total,
                'currentPage': page,
                'totalPages': (total + limit - 1) // limit,
                'hasNext': end_idx < total,
                'hasPrev': page > 1,
            })
            
        except Exception as e:
            print(f"[ERROR] Failed to fetch student logs: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
