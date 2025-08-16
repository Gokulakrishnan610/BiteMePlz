from django.core.management.base import BaseCommand
from django.conf import settings
from api.models import Product, Shop
import os
from pathlib import Path

class Command(BaseCommand):
    help = 'Update product images in database after uploading images to media folder'

    def add_arguments(self, parser):
        parser.add_argument(
            '--create-missing',
            action='store_true',
            help='Create products for images that don\'t have corresponding products'
        )

    def handle(self, *args, **options):
        self.stdout.write("🔄 Starting product image database update...")
        
        # Get media products path
        media_products_path = Path(settings.MEDIA_ROOT) / 'products'
        
        if not media_products_path.exists():
            self.stdout.write(self.style.ERROR(f"❌ Media products folder not found: {media_products_path}"))
            self.stdout.write("   Run the upload_images.py script first!")
            return
        
        # Get all image files
        image_files = list(media_products_path.glob("*.jpg")) + list(media_products_path.glob("*.png")) + list(media_products_path.glob("*.webp"))
        
        if not image_files:
            self.stdout.write(self.style.WARNING("⚠️  No image files found in media/products folder"))
            return
        
        self.stdout.write(f"📁 Found {len(image_files)} images in media folder")
        
        # Get or create a default shop
        shop = Shop.objects.first()
        if not shop:
            self.stdout.write(self.style.ERROR("❌ No shops found in database. Create a shop first!"))
            return
        
        self.stdout.write(f"🏪 Using shop: {shop.name}")
        
        updated_count = 0
        created_count = 0
        skipped_count = 0
        
        for image_file in image_files:
            image_name = image_file.name
            image_path = f'products/{image_name}'
            
            # Extract product name from image filename
            product_name = self.extract_product_name(image_name)
            
            # Try to find existing product
            product = Product.objects.filter(name__icontains=product_name).first()
            
            if product:
                # Update existing product's image
                if product.image != image_path:
                    product.image = image_path
                    product.save()
                    self.stdout.write(f"✅ Updated: {product.name} -> {image_path}")
                    updated_count += 1
                else:
                    self.stdout.write(f"⏭️  Skipped: {product.name} (already has correct image)")
                    skipped_count += 1
            elif options['create_missing']:
                # Create new product
                product = Product.objects.create(
                    name=product_name,
                    description=f"Delicious {product_name.lower()}",
                    price=99.99,  # Default price
                    stock=100,
                    image=image_path,
                    category=self.determine_category(image_name),
                    shop=shop
                )
                self.stdout.write(f"🆕 Created: {product_name} -> {image_path}")
                created_count += 1
            else:
                self.stdout.write(f"⚠️  No product found for: {image_name}")
                skipped_count += 1
        
        # Summary
        self.stdout.write("\n" + "="*60)
        self.stdout.write("📊 DATABASE UPDATE SUMMARY")
        self.stdout.write("="*60)
        self.stdout.write(f"✅ Updated products: {updated_count}")
        self.stdout.write(f"🆕 Created products: {created_count}")
        self.stdout.write(f"⏭️  Skipped (no changes): {skipped_count}")
        self.stdout.write(f"📁 Total images processed: {len(image_files)}")
        
        if updated_count > 0 or created_count > 0:
            self.stdout.write(self.style.SUCCESS(f"\n🎉 Database updated successfully!"))
            self.stdout.write(f"   Images are now accessible at:")
            self.stdout.write(f"   https://rec-kiosk.onrender.com/media/products/[filename]")
        else:
            self.stdout.write(self.style.WARNING(f"\n⚠️  No database changes were made."))
            self.stdout.write(f"   Use --create-missing flag to create products for missing images.")

    def extract_product_name(self, filename):
        """Extract product name from image filename"""
        # Remove file extension
        name = filename.rsplit('.', 1)[0]
        
        # Replace underscores and hyphens with spaces
        name = name.replace('_', ' ').replace('-', ' ')
        
        # Capitalize words
        name = ' '.join(word.capitalize() for word in name.split())
        
        return name

    def determine_category(self, filename):
        """Determine product category based on filename"""
        filename_lower = filename.lower()
        
        # Coffee & Beverages
        if any(word in filename_lower for word in ['coffee', 'americano', 'cappuccino', 'latte', 'espresso', 'tea', 'chocolate', 'milkshake']):
            return 'beverages'
        
        # Food
        elif any(word in filename_lower for word in ['burger', 'noodles', 'rice', 'chicken', 'pizza', 'sandwich', 'cake', 'pastry', 'fries', 'wings']):
            return 'food'
        
        # Snacks
        elif any(word in filename_lower for word in ['chips', 'doritos', 'cheetos', 'pringles', 'snack']):
            return 'snacks'
        
        # Stationery
        elif any(word in filename_lower for word in ['pen', 'pencil', 'eraser', 'notebook']):
            return 'stationery'
        
        # Breakfast
        elif any(word in filename_lower for word in ['bagel', 'croissant', 'breakfast']):
            return 'breakfast'
        
        else:
            return 'others'
