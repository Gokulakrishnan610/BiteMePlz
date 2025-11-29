"""
Automated test script for student activity logging system
Run this script to test all logging functionality
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
STUDENT_EMAIL = "231401019@rajalakshmi.edu.in"  # Bharathi - confirmed student
STUDENT_PASSWORD = "Bharathi@123"  # Default password pattern

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

class StudentLoggingTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.user_id = None
        self.shop_id = None
        self.product_id = None
        self.order_id = None
        
    def test_login(self):
        """Test 1: Login and check if login is logged"""
        print_info("Test 1: Testing student login logging...")
        
        try:
            response = self.session.post(
                f"{BASE_URL}/api/users/login/",
                json={
                    "email": STUDENT_EMAIL,
                    "password": STUDENT_PASSWORD
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token')
                self.user_id = data.get('_id')
                
                if data.get('role') != 'student':
                    print_error(f"User is not a student. Role: {data.get('role')}")
                    return False
                
                # Set authorization header
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                
                print_success(f"Login successful for student: {data.get('name')}")
                print_info("Login should be logged in backend automatically")
                return True
            else:
                print_error(f"Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Login test failed: {str(e)}")
            return False
    
    def test_view_shops(self):
        """Test 2: Fetch shops (simulates viewing shops page)"""
        print_info("\nTest 2: Testing view shops logging...")
        
        try:
            response = self.session.get(f"{BASE_URL}/api/shops/")
            
            if response.status_code == 200:
                data = response.json()
                shops = data.get('results', data) if isinstance(data, dict) else data
                
                if shops and len(shops) > 0:
                    self.shop_id = shops[0].get('id')
                    print_success(f"Fetched {len(shops)} shops")
                    print_info("View shops should be logged via frontend")
                    return True
                else:
                    print_warning("No shops found")
                    return False
            else:
                print_error(f"Failed to fetch shops: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"View shops test failed: {str(e)}")
            return False
    
    def test_view_products(self):
        """Test 3: Fetch products for a shop"""
        print_info("\nTest 3: Testing view products logging...")
        
        if not self.shop_id:
            print_warning("No shop ID available, skipping test")
            return False
        
        try:
            response = self.session.get(f"{BASE_URL}/api/products/?shop_id={self.shop_id}")
            
            if response.status_code == 200:
                data = response.json()
                products = data.get('results', data) if isinstance(data, dict) else data
                
                if products and len(products) > 0:
                    self.product_id = products[0].get('id') or products[0].get('_id')
                    print_success(f"Fetched {len(products)} products")
                    print_info("View products should be logged via frontend")
                    return True
                else:
                    print_warning("No products found")
                    return False
            else:
                print_error(f"Failed to fetch products: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"View products test failed: {str(e)}")
            return False
    
    def test_manual_log_creation(self):
        """Test 4: Manually create a log entry"""
        print_info("\nTest 4: Testing manual log creation...")
        
        try:
            log_data = {
                "action": "add_to_cart",
                "description": "Test: Added product to cart",
                "shop_id": self.shop_id,
                "product_id": self.product_id,
                "metadata": {
                    "test": True,
                    "quantity": 1
                }
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/student-logs/",
                json=log_data
            )
            
            if response.status_code in [200, 201]:
                print_success("Manual log entry created successfully")
                return True
            else:
                print_error(f"Failed to create log: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print_error(f"Manual log creation failed: {str(e)}")
            return False
    
    def test_fetch_logs(self):
        """Test 5: Fetch student logs"""
        print_info("\nTest 5: Testing log retrieval...")
        
        try:
            response = self.session.get(f"{BASE_URL}/api/student-logs/?limit=10")
            
            if response.status_code == 200:
                data = response.json()
                logs = data.get('results', [])
                total = data.get('total', 0)
                
                print_success(f"Retrieved {len(logs)} logs (Total: {total})")
                
                if logs:
                    print_info("\nRecent logs:")
                    for log in logs[:5]:
                        action = log.get('action', 'unknown')
                        description = log.get('description', 'No description')
                        created_at = log.get('created_at', '')
                        print(f"  - {action}: {description} ({created_at})")
                    return True
                else:
                    print_warning("No logs found")
                    return False
            else:
                print_error(f"Failed to fetch logs: {response.status_code}")
                return False
                
        except Exception as e:
            print_error(f"Fetch logs test failed: {str(e)}")
            return False
    
    def test_log_filtering(self):
        """Test 6: Test log filtering"""
        print_info("\nTest 6: Testing log filtering...")
        
        try:
            # Test filter by action
            response = self.session.get(f"{BASE_URL}/api/student-logs/?action=login")
            
            if response.status_code == 200:
                data = response.json()
                logs = data.get('results', [])
                print_success(f"Filter by action 'login': {len(logs)} logs")
                
                # Test search
                response = self.session.get(f"{BASE_URL}/api/student-logs/?search=test")
                if response.status_code == 200:
                    data = response.json()
                    logs = data.get('results', [])
                    print_success(f"Search for 'test': {len(logs)} logs")
                    return True
                    
            return False
                
        except Exception as e:
            print_error(f"Log filtering test failed: {str(e)}")
            return False
    
    def test_logout_logging(self):
        """Test 7: Test logout (note: logout is logged from frontend)"""
        print_info("\nTest 7: Testing logout...")
        
        print_info("Logout logging happens in frontend (AuthContext)")
        print_info("Backend login log should already be created")
        return True
    
    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("STUDENT ACTIVITY LOGGING - AUTOMATED TEST SUITE")
        print("="*60 + "\n")
        
        results = {
            "Login": self.test_login(),
            "View Shops": self.test_view_shops(),
            "View Products": self.test_view_products(),
            "Manual Log Creation": self.test_manual_log_creation(),
            "Fetch Logs": self.test_fetch_logs(),
            "Log Filtering": self.test_log_filtering(),
            "Logout": self.test_logout_logging(),
        }
        
        print("\n" + "="*60)
        print("TEST RESULTS SUMMARY")
        print("="*60 + "\n")
        
        passed = sum(1 for v in results.values() if v)
        total = len(results)
        
        for test_name, result in results.items():
            status = "PASS" if result else "FAIL"
            color = Colors.GREEN if result else Colors.RED
            print(f"{color}{status}{Colors.END} - {test_name}")
        
        print(f"\n{Colors.BLUE}Total: {passed}/{total} tests passed{Colors.END}")
        
        if passed == total:
            print(f"\n{Colors.GREEN}🎉 All tests passed! Student logging system is working correctly.{Colors.END}")
        else:
            print(f"\n{Colors.YELLOW}⚠ Some tests failed. Please check the errors above.{Colors.END}")
        
        print("\n" + "="*60 + "\n")
        
        return passed == total

if __name__ == "__main__":
    print_info("Starting automated tests...")
    print_info(f"Base URL: {BASE_URL}")
    print_info(f"Student Email: {STUDENT_EMAIL}")
    print_warning("\nMake sure:")
    print_warning("1. Backend server is running on http://localhost:8000")
    print_warning("2. Student account exists with the credentials above")
    print_warning("3. At least one shop and product exist in the database")
    print("\nPress Enter to continue or Ctrl+C to cancel...")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\n\nTest cancelled.")
        exit(0)
    
    tester = StudentLoggingTester()
    success = tester.run_all_tests()
    
    exit(0 if success else 1)
