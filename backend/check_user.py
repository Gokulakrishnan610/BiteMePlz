import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')
django.setup()

from api.models import User, StudentLog

email = '230701321@rajalakshmi.edu.in'
user = User.objects.filter(email=email).first()

if user:
    print(f"User found: {user.name}")
    print(f"Email: {user.email}")
    print(f"Role: {user.role}")
    print(f"ID: {user.id}")
    
    # Check logs for this user
    logs = StudentLog.objects.filter(user=user).order_by('-created_at')
    print(f"\nLogs for this user: {logs.count()}")
    
    if logs.exists():
        print("\nRecent logs:")
        for log in logs[:5]:
            print(f"  - {log.created_at} | {log.action} | {log.description}")
    else:
        print("\nNo logs found for this user.")
        print("\nPossible reasons:")
        print("1. User role is not 'student' (current role:", user.role, ")")
        print("2. Frontend logging not triggered")
        print("3. API requests failing silently")
else:
    print(f"User not found: {email}")
