#!/usr/bin/env python3
"""
Script to upload product images to Django backend media folder
Run this script from the backend directory
"""

import os
import shutil
import requests
from pathlib import Path

# Configuration
MEDIA_ROOT = "media"
PRODUCTS_FOLDER = "products"
FRONTEND_IMAGES = [
    # Coffee & Beverages
    "americano.jpg",
    "cappuccino.jpg", 
    "latte.jpg",
    "espresso.jpg",
    "chai-tea.jpg",
    "hot-chocolate.jpg",
    "iced-coffee.jpg",
    "vanilla-latte.jpg",
    "mocha.jpg",
    "green-tea.jpg",
    "milkshake.jpg",
    
    # Food Items
    "bagel.jpg",
    "sandwich.jpg",
    "pizza-slice.jpg",
    "chicken-burger.jpg",
    "french-fries.jpg",
    "croissant.jpg",
    "danish-pastry.jpg",
    "coffee-cake.jpg",
    "chocolate-cake.jpg",
    "cheesecake.jpg",
    "beef-noodles.jpg",
    "chicken-noodles.jpg",
    "fried-rice.jpg",
    "kung-pao-chicken.jpg",
    "sweet-and-sour-chicken.jpg",
    "chicken-wings.jpg",
    "chicken-nuggets.jpg",
    "chicken-wrap.jpg",
    "spring-rolls.jpg",
    "onion-rings.jpg",
    "soft-serve-ice-cream.jpg",
    
    # Snacks & Drinks
    "coca-cola.jpg",
    "pepsi.jpg",
    "sprite.jpg",
    "doritos-nacho-cheese.jpg",
    "cheetos.jpg",
    "pringles-original.jpg",
    
    # Stationery
    "blue-pen.jpg",
    "pencil-set.jpg",
    "eraser.jpg",
    "notebook-a4.jpg"
]

def download_image_from_netlify(image_name):
    """Download image from Netlify frontend"""
    url = f"https://kioskrec25.netlify.app/images/products/{image_name}"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.content
    except Exception as e:
        print(f"❌ Failed to download {image_name}: {e}")
        return None

def create_media_structure():
    """Create media folder structure"""
    products_path = Path(MEDIA_ROOT) / PRODUCTS_FOLDER
    products_path.mkdir(parents=True, exist_ok=True)
    print(f"📁 Created media structure: {products_path}")
    return products_path

def upload_images():
    """Main function to upload all images"""
    print("🚀 Starting image upload process...")
    
    # Create media structure
    products_path = create_media_structure()
    
    successful_uploads = 0
    failed_uploads = 0
    
    for image_name in FRONTEND_IMAGES:
        print(f"📥 Downloading {image_name}...")
        
        # Download image from Netlify
        image_data = download_image_from_netlify(image_name)
        
        if image_data:
            # Save to local media folder
            image_path = products_path / image_name
            try:
                with open(image_path, 'wb') as f:
                    f.write(image_data)
                print(f"✅ Successfully uploaded: {image_name}")
                successful_uploads += 1
            except Exception as e:
                print(f"❌ Failed to save {image_name}: {e}")
                failed_uploads += 1
        else:
            failed_uploads += 1
    
    # Summary
    print("\n" + "="*50)
    print("📊 UPLOAD SUMMARY")
    print("="*50)
    print(f"✅ Successful uploads: {successful_uploads}")
    print(f"❌ Failed uploads: {failed_uploads}")
    print(f"📁 Images saved to: {products_path.absolute()}")
    
    if successful_uploads > 0:
        print(f"\n🎉 Images are now available at:")
        print(f"   https://rec-kiosk.onrender.com/media/products/[filename]")
        print(f"\nExample URLs:")
        for img in FRONTEND_IMAGES[:3]:  # Show first 3 examples
            print(f"   https://rec-kiosk.onrender.com/media/products/{img}")
    
    return successful_uploads, failed_uploads

def verify_uploads():
    """Verify that images were uploaded correctly"""
    products_path = Path(MEDIA_ROOT) / PRODUCTS_FOLDER
    
    if not products_path.exists():
        print("❌ Products folder not found!")
        return
    
    uploaded_files = list(products_path.glob("*.jpg"))
    print(f"\n🔍 Verification: Found {len(uploaded_files)} images in {products_path}")
    
    for img_file in uploaded_files[:5]:  # Show first 5
        print(f"   ✓ {img_file.name}")
    
    if len(uploaded_files) > 5:
        print(f"   ... and {len(uploaded_files) - 5} more")

if __name__ == "__main__":
    print("🖼️  REC-KIOSK Product Image Uploader")
    print("="*50)
    
    # Check if requests is available
    try:
        import requests
    except ImportError:
        print("❌ Error: 'requests' library not found!")
        print("   Install it with: pip install requests")
        exit(1)
    
    # Run upload
    success, failed = upload_images()
    
    # Verify
    if success > 0:
        verify_uploads()
        
        print(f"\n🎯 Next steps:")
        print(f"   1. Deploy these images to Render")
        print(f"   2. Test URLs: https://rec-kiosk.onrender.com/media/products/bagel.jpg")
        print(f"   3. Update your Django models if needed")
    
    print("\n✨ Upload process completed!")
