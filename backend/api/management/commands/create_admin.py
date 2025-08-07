from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import User

class Command(BaseCommand):
    help = 'Create an admin user for the application'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='admin@kiosk.com',
            help='Email for the admin user'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='Password for the admin user'
        )
        parser.add_argument(
            '--name',
            type=str,
            default='System Administrator',
            help='Name for the admin user'
        )
        parser.add_argument(
            '--roll-no',
            type=str,
            default='ADMIN001',
            help='Roll number for the admin user'
        )

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        name = options['name']
        roll_no = options['roll_no']

        # Check if admin user already exists
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'Admin user with email {email} already exists.')
            )
            return

        # Create admin user
        try:
            admin_user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                name=name,
                roll_no=roll_no,
                role='admin',
                is_verified=True,  # Admin is pre-verified
                is_staff=True,
                is_superuser=True
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created admin user:\n'
                    f'Email: {email}\n'
                    f'Password: {password}\n'
                    f'Name: {name}\n'
                    f'Roll No: {roll_no}\n'
                    f'Role: Admin'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating admin user: {e}')
            ) 