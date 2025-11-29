"""
Test frontend logging API endpoint
"""

import requests
import json

BASE_URL = "http://localhost:8000"
EMAIL = "230701321@rajalakshmi.edu.in"
PASSWORD = "Siva@2005"

print("\n" + "="*60)
print("FRONTEND LOGGING API TEST")
print("="*60 + "\n")

# Step 1: Login
print("1. Logging in...")
response = requests.post(
    f"{BASE_URL}/api/users/login/",
    json={"email": EMAIL, "password": PASSWORD}
)

if response.status_code == 200:
    data = response.json()
    token = data.get('token')
    user_id = data.get('_id')
    print(f"   ✓ Login successful")
    print(f"   User: {data.get('name')}")
    print(f"   Role: {data.get('role')}")
else:
    print(f"   ✗ Login failed: {response.status_code}")
    print(f"   {response.text}")
    exit(1)

# Step 2: Test creating a log via API
print("\n2. Testing log creation via API...")
headers = {'Authorization': f'Bearer {token}'}

log_data = {
    "action": "view_shops",
    "description": "Test: Viewed shops page from frontend",
    "metadata": {"test": True, "source": "api_test"}
}

response = requests.post(
    f"{BASE_URL}/api/student-logs/",
    json=log_data,
    headers=headers
)

if response.status_code in [200, 201]:
    print(f"   ✓ Log created successfully")
    print(f"   Response: {response.json()}")
else:
    print(f"   ✗ Log creation failed: {response.status_code}")
    print(f"   {response.text}")

# Step 3: Verify log was created
print("\n3. Verifying log was created...")
response = requests.get(
    f"{BASE_URL}/api/student-logs/?limit=5",
    headers=headers
)

if response.status_code == 200:
    data = response.json()
    logs = data.get('results', [])
    print(f"   ✓ Retrieved {len(logs)} recent logs")
    
    # Find our test log
    test_log = None
    for log in logs:
        if log.get('metadata', {}).get('test') == True:
            test_log = log
            break
    
    if test_log:
        print(f"   ✓ Test log found!")
        print(f"     Action: {test_log.get('action')}")
        print(f"     Description: {test_log.get('description')}")
        print(f"     Created: {test_log.get('created_at')}")
    else:
        print(f"   ⚠ Test log not found in recent logs")
else:
    print(f"   ✗ Failed to retrieve logs: {response.status_code}")

print("\n" + "="*60)
print("TEST COMPLETE")
print("="*60 + "\n")
