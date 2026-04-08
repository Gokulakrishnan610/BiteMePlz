from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os


class Command(BaseCommand):
    help = 'Create superuser from environment variables if it does not exist'

    def handle(self, *args, **options):
        User = get_user_model()
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@gmail.com')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin@123')
        name = os.environ.get('DJANGO_SUPERUSER_NAME', 'Admin')

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'Superuser {email} already exists, skipping.'))
            return

        User.objects.create_superuser(
            username=email,
            email=email,
            password=password,
            name=name,
            role='admin',
            is_verified=True,
        )
        self.stdout.write(self.style.SUCCESS(f'Superuser {email} created successfully.'))
