from rest_framework import serializers
from .models import SiteConfiguration


class SiteConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for SiteConfiguration model.
    Handles serialization and validation of site-wide configuration settings.
    """
    id = serializers.UUIDField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = SiteConfiguration
        fields = [
            'id',
            'login_enabled',
            'registration_enabled',
            'ordering_enabled',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_login_enabled(self, value):
        """
        Validate that login_enabled is a boolean value.
        """
        if not isinstance(value, bool):
            raise serializers.ValidationError("login_enabled must be a boolean value.")
        return value
    
    def validate_registration_enabled(self, value):
        """
        Validate that registration_enabled is a boolean value.
        """
        if not isinstance(value, bool):
            raise serializers.ValidationError("registration_enabled must be a boolean value.")
        return value
    
    def validate_ordering_enabled(self, value):
        """
        Validate that ordering_enabled is a boolean value.
        """
        if not isinstance(value, bool):
            raise serializers.ValidationError("ordering_enabled must be a boolean value.")
        return value
