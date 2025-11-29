"""
Simple test to verify student logging works
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')
django.setup()

from api.models import StudentLog, User, Shop, Product
from api.student_logger import log_student_activity
from django.test import RequestFactory

print("\n" + "="*60)
print("STUDENT LOGGING - SIMPLE TEST")
print("="*60 + "\n")

# Get a student user
students = User.objects.filter(role='student')
if not students.exists():
    print("❌ No student users found!")
    exit(1)

student = students.first()
print(f"✓ Using student: {student.name} ({student.email})")

# Get a shop
shops = Shop.objects.all()
if not shops.exists():
    print("❌ No shops found!")
    exit(1)

shop = shops.first()
print(f"✓ Using shop: {shop.name}")

# Get a product
products = Product.objects.filter(shop=shop)
if not products.exists():
    print("⚠ No products found for this shop, using None")
    product = None
else:
    product = products.first()
    print(f"✓ Using product: {product.name}")

print("\n" + "-"*60)
print("Creating test logs...")
print("-"*60 + "\n")

# Create a mock request
factory = RequestFactory()
request = factory.get('/')
request.META['REMOTE_ADDR'] = '127.0.0.1'
request.META['HTTP_USER_AGENT'] = 'Test Script'

# Test 1: Login log
print("1. Creating login log...")
try:
    log = log_student_activity(
        user=student,
        action='login',
        description=f'{student.name} logged in (test)',
        request=request
    )
    if log:
        print(f"   ✓ Login log created: {log.id}")
    else:
        print("   ⚠ Log not created (user might not be a student)")
except Exception as e:
    print(f"   ✗ Error: {str(e)}")

# Test 2: View shops log
print("2. Creating view_shops log...")
try:
    log = log_student_activity(
        user=student,
        action='view_shops',
        description='Viewed shops page (test)',
        request=request
    )
    if log:
        print(f"   ✓ View shops log created: {log.id}")
except Exception as e:
    print(f"   ✗ Error: {str(e)}")

# Test 3: View products log
print("3. Creating view_products log...")
try:
    log = log_student_activity(
        user=student,
        action='view_products',
        description=f'Viewed products in {shop.name} (test)',
        shop=shop,
        request=request
    )
    if log:
        print(f"   ✓ View products log created: {log.id}")
except Exception as e:
    print(f"   ✗ Error: {str(e)}")

# Test 4: Add to cart log
if product:
    print("4. Creating add_to_cart log...")
    try:
        log = log_student_activity(
            user=student,
            action='add_to_cart',
            description=f'Added {product.name} to cart (test)',
            shop=shop,
            product=product,
            metadata={'quantity': 1, 'test': True},
            request=request
        )
        if log:
            print(f"   ✓ Add to cart log created: {log.id}")
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")

# Test 5: View profile log
print("5. Creating view_profile log...")
try:
    log = log_student_activity(
        user=student,
        action='view_profile',
        description='Viewed profile page (test)',
        request=request
    )
    if log:
        print(f"   ✓ View profile log created: {log.id}")
except Exception as e:
    print(f"   ✗ Error: {str(e)}")

print("\n" + "-"*60)
print("Verifying logs...")
print("-"*60 + "\n")

# Count logs
total_logs = StudentLog.objects.count()
student_logs = StudentLog.objects.filter(user=student).count()

print(f"✓ Total logs in database: {total_logs}")
print(f"✓ Logs for {student.name}: {student_logs}")

# Show recent logs
print(f"\nRecent logs for {student.name}:")
recent = StudentLog.objects.filter(user=student).order_by('-created_at')[:5]
for log in recent:
    print(f"  - {log.created_at.strftime('%H:%M:%S')} | {log.action} | {log.description}")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60)
print(f"\n✓ View logs in admin panel: /kisok-ac-back-office/student-logs")
print(f"✓ Or run: python check_logging_status.py\n")
