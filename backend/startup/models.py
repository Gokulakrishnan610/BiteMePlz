import uuid
from django.db import models


class AcademicYear(models.Model):
    """Model to store academic years dynamically"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, help_text="Year code (e.g., '1', '2', '3', '4')")
    name = models.CharField(max_length=100, help_text="Display name (e.g., 'First Year', 'Second Year')")
    is_active = models.BooleanField(default=True, help_text="Show this year in registration")
    order = models.IntegerField(default=0, help_text="Display order")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'academic_years'
        verbose_name = 'Academic Year'
        verbose_name_plural = 'Academic Years'
        ordering = ['order', 'code']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Department(models.Model):
    """Model to store departments dynamically"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, help_text="Department code (e.g., 'CSE', 'ECE')")
    name = models.CharField(max_length=200, help_text="Full department name")
    is_active = models.BooleanField(default=True, help_text="Show this department in registration")
    order = models.IntegerField(default=0, help_text="Display order")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'departments'
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'
        ordering = ['order', 'code']

    def __str__(self):
        return f"{self.code} - {self.name}"


class SiteConfiguration(models.Model):
    """
    Singleton model to store site-wide configuration settings.
    Only one instance of this model should exist in the database.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    login_enabled = models.BooleanField(default=True, help_text="Allow users to login")
    registration_enabled = models.BooleanField(default=True, help_text="Allow new user registration")
    ordering_enabled = models.BooleanField(default=True, help_text="Allow users to place orders")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'site_configuration'
        verbose_name = 'Site Configuration'
        verbose_name_plural = 'Site Configuration'

    def __str__(self):
        return f"Site Configuration (Login: {self.login_enabled}, Registration: {self.registration_enabled}, Ordering: {self.ordering_enabled})"

    @classmethod
    def get_config(cls):
        """
        Get the singleton configuration instance.
        Creates one with default values if it doesn't exist.
        """
        config, created = cls.objects.get_or_create(pk=cls.objects.first().pk if cls.objects.exists() else uuid.uuid4())
        return config

    def save(self, *args, **kwargs):
        """
        Override save to enforce singleton pattern.
        If an instance already exists, update it instead of creating a new one.
        """
        if not self.pk and SiteConfiguration.objects.exists():
            # If trying to create a new instance when one already exists,
            # update the existing instance instead
            existing = SiteConfiguration.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)
