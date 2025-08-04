import os
import uuid
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings

# Test file upload functionality
def test_upload():
    try:
        # Create a test file
        test_content = b"Test image content"
        filename = f"{uuid.uuid4().hex}_test.jpg"
        
        # Save file
        file_path = default_storage.save(f'uploads/{filename}', ContentFile(test_content))
        print(f"File saved successfully: {file_path}")
        
        # Check if file exists
        if default_storage.exists(file_path):
            print(f"File exists: {file_path}")
        else:
            print(f"File does not exist: {file_path}")
            
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rec_kiosk.settings')
    django.setup()
    
    test_upload() 