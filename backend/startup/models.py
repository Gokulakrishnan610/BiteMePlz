import uuid
from django.db import models


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
