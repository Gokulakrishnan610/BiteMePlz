"""
Quick diagnostic script to check student logging system status
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')
django.setup()

from api.models import StudentLog, User
from django.db.models import Count

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"{text}")
    print(f"{'='*60}{Colors.END}\n")

def check_model_exists():
    """Check if StudentLog model exists"""
    try:
        StudentLog.objects.count()
        return True
    except Exception as e:
        print(f"{Colors.RED}✗ StudentLog model error: {str(e)}{Colors.END}")
        return False

def check_logs():
    """Check existing logs"""
    try:
        total_logs = StudentLog.objects.count()
        print(f"{Colors.GREEN}✓ Total logs in database: {total_logs}{Colors.END}")
        
        if total_logs > 0:
            # Get logs by action
            print(f"\n{Colors.BLUE}Logs by action type:{Colors.END}")
            action_counts = StudentLog.objects.values('action').annotate(count=Count('action')).order_by('-count')
            for item in action_counts:
                print(f"  - {item['action']}: {item['count']}")
            
            # Get recent logs
            print(f"\n{Colors.BLUE}Recent logs (last 5):{Colors.END}")
            recent_logs = StudentLog.objects.select_related('user').order_by('-created_at')[:5]
            for log in recent_logs:
                print(f"  - {log.created_at.strftime('%Y-%m-%d %H:%M:%S')} | {log.user.name} | {log.action} | {log.description}")
            
            # Get unique students
            unique_students = StudentLog.objects.values('user').distinct().count()
            print(f"\n{Colors.GREEN}✓ Unique students logged: {unique_students}{Colors.END}")
        else:
            print(f"{Colors.YELLOW}⚠ No logs found yet. Try performing some student actions.{Colors.END}")
        
        return True
    except Exception as e:
        print(f"{Colors.RED}✗ Error checking logs: {str(e)}{Colors.END}")
        return False

def check_students():
    """Check if student users exist"""
    try:
        student_count = User.objects.filter(role='student').count()
        print(f"{Colors.GREEN}✓ Student users in database: {student_count}{Colors.END}")
        
        if student_count > 0:
            print(f"\n{Colors.BLUE}Sample students:{Colors.END}")
            students = User.objects.filter(role='student')[:5]
            for student in students:
                print(f"  - {student.name} ({student.email})")
        else:
            print(f"{Colors.YELLOW}⚠ No student users found. Create a student account to test.{Colors.END}")
        
        return True
    except Exception as e:
        print(f"{Colors.RED}✗ Error checking students: {str(e)}{Colors.END}")
        return False

def main():
    print_header("STUDENT LOGGING SYSTEM - STATUS CHECK")
    
    print(f"{Colors.BLUE}Checking system components...{Colors.END}\n")
    
    # Check model
    if not check_model_exists():
        print(f"\n{Colors.RED}✗ StudentLog model not found. Run migrations first:{Colors.END}")
        print(f"  python manage.py makemigrations")
        print(f"  python manage.py migrate")
        return False
    
    print(f"{Colors.GREEN}✓ StudentLog model exists{Colors.END}")
    
    # Check students
    print(f"\n{Colors.BLUE}Checking student users...{Colors.END}")
    check_students()
    
    # Check logs
    print(f"\n{Colors.BLUE}Checking activity logs...{Colors.END}")
    check_logs()
    
    print_header("STATUS CHECK COMPLETE")
    
    print(f"{Colors.BLUE}Next steps:{Colors.END}")
    print(f"1. If no logs exist, perform student actions (login, view shops, add to cart, etc.)")
    print(f"2. View logs in admin panel: /kisok-ac-back-office/student-logs")
    print(f"3. Run automated tests: python test_student_logging.py")
    
    return True

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Interrupted by user{Colors.END}")
        sys.exit(0)
    except Exception as e:
        print(f"\n{Colors.RED}Error: {str(e)}{Colors.END}")
        sys.exit(1)
