from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Transaction


class Command(BaseCommand):
    help = "Backfill metadata.verified_by for verification transactions that don't have it"

    def handle(self, *args, **options):
        updated = 0
        qs = Transaction.objects.filter(type='verification').filter(metadata={})
        for t in qs.iterator():
            try:
                t.metadata = {
                    'verified_by': None,  # Unknown verifier; created before tracking
                    'verified_at': t.created_at.isoformat() if t.created_at else timezone.now().isoformat(),
                }
                t.save(update_fields=['metadata'])
                updated += 1
            except Exception:
                continue
        self.stdout.write(self.style.SUCCESS(f"Backfilled {updated} verification transactions"))


