from django.core.management.base import BaseCommand
from startup.models import SiteConfiguration


class Command(BaseCommand):
    help = 'Initialize the site configuration with default values'

    def handle(self, *args, **options):
        config = SiteConfiguration.get_config()
        self.stdout.write(
            self.style.SUCCESS(
                f'Site configuration initialized: {config}'
            )
        )
