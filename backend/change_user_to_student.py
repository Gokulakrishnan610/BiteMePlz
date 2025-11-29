import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')
django.setup()

from api.models import User

email = '230701321@rajalakshmi.edu.in'
user = User.objects.filter(email=email).first()

if user:
    print(f"Current role: {user.role}")
    user.role = 'student'
    user.save()
    print(f"✓ Changed role to: {user.role}")
    print(f"\nNow you can test with this account!")
else:
    print(f"User not found: {email}")
