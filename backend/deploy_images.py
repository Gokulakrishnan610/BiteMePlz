#!/usr/bin/env python3
"""
Deployment helper script for REC-KIOSK images
This script will guide you through deploying images to Render
"""

import os
import subprocess
import sys
from pathlib import Path

def check_git_status():
    """Check if we're in a git repository and if there are changes"""
    try:
        # Check if we're in a git repo
        result = subprocess.run(['git', 'status'], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ Not in a git repository!")
            print("   Make sure you're in the backend directory and it's a git repo")
            return False
        
        # Check for changes
        result = subprocess.run(['git', 'diff', '--name-only'], capture_output=True, text=True)
        if result.stdout.strip():
            print("📝 Found changes in git:")
            for file in result.stdout.strip().split('\n'):
                if file:
                    print(f"   📄 {file}")
            return True
        else:
            print("✅ No changes detected in git")
            return False
            
    except FileNotFoundError:
        print("❌ Git not found! Make sure git is installed")
        return False

def check_media_folder():
    """Check if media folder exists and has images"""
    media_path = Path("media/products")
    
    if not media_path.exists():
        print("❌ Media folder not found!")
        print("   Run upload_images.py first to download images")
        return False
    
    image_files = list(media_path.glob("*.jpg")) + list(media_path.glob("*.png")) + list(media_path.glob("*.webp"))
    
    if not image_files:
        print("❌ No images found in media/products folder!")
        print("   Run upload_images.py first to download images")
        return False
    
    print(f"✅ Found {len(image_files)} images in media/products folder")
    return True

def git_add_and_commit():
    """Add and commit media files to git"""
    try:
        print("📤 Adding media files to git...")
        subprocess.run(['git', 'add', 'media/'], check=True)
        
        print("💾 Committing changes...")
        subprocess.run(['git', 'commit', '-m', 'Add product images to media folder'], check=True)
        
        print("✅ Successfully committed media files")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Git operation failed: {e}")
        return False

def git_push():
    """Push changes to remote repository"""
    try:
        print("🚀 Pushing to remote repository...")
        subprocess.run(['git', 'push'], check=True)
        print("✅ Successfully pushed to remote repository")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Git push failed: {e}")
        return False

def show_deployment_steps():
    """Show manual deployment steps"""
    print("\n" + "="*60)
    print("🚀 MANUAL DEPLOYMENT STEPS")
    print("="*60)
    print("Since automatic deployment failed, follow these steps:")
    print()
    print("1. 📁 Upload media folder to Render:")
    print("   - Go to your Render dashboard")
    print("   - Navigate to your backend service")
    print("   - Go to 'Files' tab")
    print("   - Upload the entire 'media' folder")
    print()
    print("2. 🔄 Restart your Render service")
    print("   - In Render dashboard, click 'Manual Deploy'")
    print("   - Or restart the service")
    print()
    print("3. 🧪 Test the images:")
    print("   - Try: https://rec-kiosk.onrender.com/media/products/bagel.jpg")
    print("   - Check your Django admin panel")
    print()
    print("4. 📊 Update database (optional):")
    print("   - Run: python manage.py update_product_images --create-missing")

def main():
    print("🚀 REC-KIOSK Image Deployment Helper")
    print("="*50)
    
    # Check prerequisites
    if not check_media_folder():
        return
    
    print("\n🔍 Checking git status...")
    has_changes = check_git_status()
    
    if not has_changes:
        print("\n✅ No changes to deploy!")
        return
    
    # Try automatic deployment
    print("\n🤖 Attempting automatic deployment...")
    
    if git_add_and_commit():
        if git_push():
            print("\n🎉 Automatic deployment successful!")
            print("   Render should automatically detect the changes and redeploy")
            print("   Wait a few minutes for deployment to complete")
            print("\n🧪 Test your images:")
            print("   https://rec-kiosk.onrender.com/media/products/bagel.jpg")
            return
        else:
            print("\n⚠️  Git push failed, showing manual steps...")
    else:
        print("\n⚠️  Git commit failed, showing manual steps...")
    
    # Show manual steps
    show_deployment_steps()

if __name__ == "__main__":
    main()
