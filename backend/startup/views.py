from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, AllowAny
from .models import SiteConfiguration, AcademicYear, Department
from .serializers import SiteConfigurationSerializer, AcademicYearSerializer, DepartmentSerializer


class AcademicYearsView(APIView):
    """
    API view for retrieving active academic years.
    Public access - used for registration form.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Retrieve all active academic years.
        
        Returns:
            200 OK: List of active academic years
        """
        years = AcademicYear.objects.filter(is_active=True).order_by('order', 'code')
        serializer = AcademicYearSerializer(years, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DepartmentsView(APIView):
    """
    API view for retrieving active departments.
    Public access - used for registration form.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """
        Retrieve all active departments.
        
        Returns:
            200 OK: List of active departments
        """
        departments = Department.objects.filter(is_active=True).order_by('order', 'code')
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SiteConfigurationView(APIView):
    """
    API view for retrieving and updating site configuration.
    
    GET: Public access - retrieve current configuration
    PATCH: Admin only - update configuration settings
    """
    
    def get_permissions(self):
        """
        Set permissions based on request method.
        GET requests are public, PATCH requests require admin.
        """
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminUser()]
    
    def get(self, request):
        """
        Retrieve the current site configuration.
        Public access - no authentication required.
        
        Returns:
            200 OK: Configuration data
        """
        config = SiteConfiguration.get_config()
        serializer = SiteConfigurationSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def patch(self, request):
        """
        Update site configuration settings.
        Admin only - requires admin authentication.
        
        Request Body:
            - login_enabled (optional): Boolean
            - registration_enabled (optional): Boolean
            - ordering_enabled (optional): Boolean
        
        Returns:
            200 OK: Updated configuration data
            400 Bad Request: Invalid data
            403 Forbidden: Unauthorized access
        """
        # Check if user is authenticated and is admin
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required to modify site configuration."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not request.user.is_staff:
            return Response(
                {"error": "You do not have permission to modify site configuration."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the singleton configuration instance
        config = SiteConfiguration.get_config()
        
        # Partial update - only update fields provided in request
        serializer = SiteConfigurationSerializer(
            config, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(
            {"error": "Invalid configuration data", "detail": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
