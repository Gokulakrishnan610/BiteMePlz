from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import User, ShopLog

class Command(BaseCommand):
    help = 'Check and fix admin user roles for shop log access'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Fix admin user roles if they are incorrect'
        )

    def handle(self, *args, **options):
        User = get_user_model()
        
        # Check all users
        self.stdout.write('Checking user roles...')
        
        admin_users = User.objects.filter(is_superuser=True)
        self.stdout.write(f'Found {admin_users.count()} superuser(s)')
        
        for user in admin_users:
            self.stdout.write(f'\nUser: {user.email}')
            self.stdout.write(f'  - ID: {user.id}')
            self.stdout.write(f'  - Role: {getattr(user, "role", "None")}')
            self.stdout.write(f'  - Is Superuser: {user.is_superuser}')
            self.stdout.write(f'  - Is Staff: {user.is_staff}')
            
            # Check if role is set correctly
            if getattr(user, 'role', None) != 'admin':
                self.stdout.write(self.style.WARNING(f'  - WARNING: Role is not "admin"'))
                
                if options['fix']:
                    user.role = 'admin'
                    user.save()
                    self.stdout.write(self.style.SUCCESS(f'  - FIXED: Role set to "admin"'))
            else:
                self.stdout.write(self.style.SUCCESS(f'  - Role is correct'))
        
        # Check shop logs
        self.stdout.write('\nChecking shop logs...')
        total_logs = ShopLog.objects.count()
        self.stdout.write(f'Total shop logs: {total_logs}')
        
        if total_logs > 0:
            recent_logs = ShopLog.objects.order_by('-created_at')[:5]
            self.stdout.write('\nRecent logs:')
            for log in recent_logs:
                self.stdout.write(f'  - {log.action} at {log.created_at} by {log.performed_by.name if log.performed_by else "System"}')
        else:
            self.stdout.write(self.style.WARNING('No shop logs found!'))
            
            # Check if there are any shops
            from api.models import Shop
            shops = Shop.objects.count()
            self.stdout.write(f'Total shops: {shops}')
            
            if shops > 0:
                self.stdout.write(self.style.WARNING('Shops exist but no logs. Logging system may not be working.'))
        
        # Test log creation
        if options['fix'] and total_logs == 0:
            self.stdout.write('\nCreating test log...')
            try:
                shop = Shop.objects.first()
                if shop:
                    test_log = ShopLog.objects.create(
                        shop=shop,
                        action='test_log_created',
                        performed_by=None,
                        details={
                            'test_message': 'Test log created by management command',
                            'purpose': 'Testing logging system'
                        }
                    )
                    self.stdout.write(self.style.SUCCESS(f'Test log created: {test_log.id}'))
                else:
                    self.stdout.write(self.style.ERROR('No shops found to create test log'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating test log: {e}'))
        
        self.stdout.write('\nDone!')
