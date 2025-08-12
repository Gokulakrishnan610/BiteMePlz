#!/usr/bin/env python3
"""
Test script for the parent session endpoint
"""
import requests
import json

def test_session_endpoint():
    """Test the session creation endpoint"""
    url = "http://localhost:8000/api/session/"
    
    try:
        # Test POST request to create session
        response = requests.post(url)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Test with custom header
            session_id = data.get('session_id')
            if session_id:
                print(f"\nTesting with session ID: {session_id}")
                
                # Test a request with the session header
                test_url = "http://localhost:8000/api/shops/"
                headers = {"X-Parent-Session-ID": session_id}
                
                test_response = requests.get(test_url, headers=headers)
                print(f"Test request status: {test_response.status_code}")
                
        else:
            print(f"Error Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to Django server. Make sure it's running on localhost:8000")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Testing Parent Session Endpoint...")
    print("=" * 40)
    test_session_endpoint()



