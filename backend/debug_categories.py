import os
import django
import sys

# Add the project directory to sys.path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')
django.setup()

from api.views import UserViewSet, ShopViewSet, ProductViewSet, OrderViewSet

print("--- Checking Classes Directly ---")
print(f"UserViewSet.api_category: {getattr(UserViewSet, 'api_category', 'NOT FOUND')}")
print(f"ShopViewSet.api_category: {getattr(ShopViewSet, 'api_category', 'NOT FOUND')}")
print(f"ProductViewSet.api_category: {getattr(ProductViewSet, 'api_category', 'NOT FOUND')}")
print(f"OrderViewSet.api_category: {getattr(OrderViewSet, 'api_category', 'NOT FOUND')}")

print("\n--- Checking URL Resolution ---")
from django.urls import resolve
try:
    # Try to resolve a known URL
    # Assuming /api/users/ exists (based on UserViewSet)
    # Note: The actual URL might be different depending on router registration
    # I'll try a few common patterns
    urls_to_test = ['/api/users/', '/api/shops/', '/api/products/', '/api/orders/']
    
    for url in urls_to_test:
        print(f"\nTesting {url}...")
        try:
            match = resolve(url)
            print(f"Resolved: {match.view_name}")
            
            view_class = getattr(match.func, 'view_class', None)
            cls = getattr(match.func, 'cls', None)
            
            if view_class:
                print(f"Found view_class: {view_class.__name__}")
                print(f"Category: {getattr(view_class, 'api_category', 'NOT FOUND')}")
            elif cls:
                print(f"Found cls: {cls.__name__}")
                print(f"Category: {getattr(cls, 'api_category', 'NOT FOUND')}")
            else:
                print("No view_class or cls found on callback")
                
        except Exception as e:
            print(f"Could not resolve {url}: {e}")

except Exception as e:
    print(f"Error in URL testing: {e}")
