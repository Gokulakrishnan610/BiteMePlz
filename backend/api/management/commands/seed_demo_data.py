"""
Management command: seed_demo_data
Creates a demo shop, shop admin user, and products with images from media/products/.
Images are uploaded to the configured storage backend (Azure Blob or local).
"""
from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
from django.conf import settings
from api.models import User, Shop, Product
import os
import datetime


DEMO_ADMIN_EMAIL = 'shopAdmin@gmail.com'
DEMO_ADMIN_PASSWORD = 'shopAdmin@123'
DEMO_ADMIN_NAME = 'Demo Shop Admin'

DEMO_SHOP = {
    'name': 'REC Canteen',
    'description': 'Main canteen of REC College',
    'location': 'REC Campus, Main Building',
}

# Map product name -> (display_name, price, category, stock, description)
PRODUCTS = [
    ('americano',        'Americano',            60,  'beverages',   50, 'Strong black coffee'),
    ('bagel',            'Bagel',                40,  'breakfast',   30, 'Fresh baked bagel'),
    ('beef-noodles',     'Beef Noodles',         90,  'food',        25, 'Spicy beef noodles'),
    ('blue-pen',         'Blue Pen',             10,  'stationery', 100, 'Ball point blue pen'),
    ('cappuccino',       'Cappuccino',           70,  'beverages',   40, 'Creamy cappuccino'),
    ('chai-tea',         'Chai Tea',             30,  'beverages',   60, 'Masala chai tea'),
    ('cheesecake',       'Cheesecake',           80,  'snacks',      20, 'Classic cheesecake slice'),
    ('cheetos',          'Cheetos',              30,  'snacks',      80, 'Crunchy cheese puffs'),
    ('chicken-burger',   'Chicken Burger',      100,  'food',        30, 'Crispy chicken burger'),
    ('chicken-noodles',  'Chicken Noodles',      85,  'food',        25, 'Stir-fried chicken noodles'),
    ('chicken-nuggets',  'Chicken Nuggets',      80,  'snacks',      40, '6-piece chicken nuggets'),
    ('chicken-wings',    'Chicken Wings',        90,  'food',        30, 'Spicy chicken wings'),
    ('chicken-wrap',     'Chicken Wrap',         85,  'food',        25, 'Grilled chicken wrap'),
    ('chocolate-cake',   'Chocolate Cake',       70,  'snacks',      20, 'Rich chocolate cake slice'),
    ('coca-cola',        'Coca Cola',            40,  'beverages',  100, '330ml can'),
    ('coffee-cake',      'Coffee Cake',          65,  'snacks',      20, 'Coffee flavoured cake'),
    ('croissant',        'Croissant',            50,  'breakfast',   30, 'Buttery croissant'),
    ('danish-pastry',    'Danish Pastry',        55,  'breakfast',   25, 'Sweet danish pastry'),
    ('doritos-nacho-cheese', 'Doritos Nacho Cheese', 35, 'snacks',  80, 'Nacho cheese flavour'),
    ('eraser',           'Eraser',                5,  'stationery', 200, 'White rubber eraser'),
    ('espresso',         'Espresso',             50,  'beverages',   50, 'Double shot espresso'),
    ('french-fries',     'French Fries',         60,  'snacks',      40, 'Crispy salted fries'),
    ('fried-rice',       'Fried Rice',           80,  'food',        30, 'Egg fried rice'),
    ('green-tea',        'Green Tea',            40,  'beverages',   60, 'Refreshing green tea'),
    ('hot-chocolate',    'Hot Chocolate',        65,  'beverages',   40, 'Creamy hot chocolate'),
    ('iced-coffee',      'Iced Coffee',          70,  'beverages',   40, 'Cold brew iced coffee'),
    ('kung-pao-chicken', 'Kung Pao Chicken',    100,  'food',        20, 'Spicy kung pao chicken'),
    ('latte',            'Latte',                70,  'beverages',   40, 'Smooth milk latte'),
    ('milkshake',        'Milkshake',            80,  'beverages',   30, 'Thick creamy milkshake'),
    ('mocha',            'Mocha',                75,  'beverages',   40, 'Chocolate mocha coffee'),
    ('notebook-a4',      'Notebook A4',          60,  'stationery',  50, 'A4 ruled notebook'),
    ('onion-rings',      'Onion Rings',          55,  'snacks',      40, 'Crispy onion rings'),
    ('pencil-set',       'Pencil Set',           25,  'stationery', 100, 'Set of 6 pencils'),
    ('pepsi',            'Pepsi',                40,  'beverages',  100, '330ml can'),
    ('pizza-slice',      'Pizza Slice',          70,  'food',        30, 'Cheesy pizza slice'),
    ('pringles-original','Pringles Original',    60,  'snacks',      60, 'Original flavour crisps'),
    ('sandwich',         'Sandwich',             60,  'food',        30, 'Club sandwich'),
    ('soft-serve-ice-cream', 'Soft Serve Ice Cream', 50, 'snacks',  40, 'Vanilla soft serve'),
    ('spring-rolls',     'Spring Rolls',         60,  'snacks',      30, 'Crispy vegetable spring rolls'),
    ('sprite',           'Sprite',               40,  'beverages',  100, '330ml can'),
    ('sweet-and-sour-chicken', 'Sweet & Sour Chicken', 95, 'food',  20, 'Classic sweet and sour'),
    ('vanilla-latte',    'Vanilla Latte',        75,  'beverages',   40, 'Vanilla flavoured latte'),
]


def upload_image_to_storage(local_path: str, storage_path: str) -> str:
    """Upload a local image file to default_storage and return its URL."""
    if not os.path.exists(local_path):
        return ''
    with open(local_path, 'rb') as f:
        content = ContentFile(f.read())
    # Delete existing to avoid duplicate suffixes
    if default_storage.exists(storage_path):
        default_storage.delete(storage_path)
    saved_path = default_storage.save(storage_path, content)
    if hasattr(default_storage, 'url'):
        return default_storage.url(saved_path)
    return f'/media/{saved_path}'


class Command(BaseCommand):
    help = 'Seed demo shop, admin user, and products with images'

    def handle(self, *args, **options):
        # 1. Create shop admin user
        admin_user, created = User.objects.get_or_create(
            email=DEMO_ADMIN_EMAIL,
            defaults={
                'username': DEMO_ADMIN_EMAIL,
                'name': DEMO_ADMIN_NAME,
                'role': 'shopAdmin',
                'is_verified': True,
                'is_staff': False,
                'is_superuser': False,
            }
        )
        if created:
            admin_user.set_password(DEMO_ADMIN_PASSWORD)
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created shop admin: {DEMO_ADMIN_EMAIL}'))
        else:
            self.stdout.write(self.style.WARNING(f'Shop admin already exists: {DEMO_ADMIN_EMAIL}'))

        # 2. Create shop
        now = timezone.now()
        shop, shop_created = Shop.objects.get_or_create(
            name=DEMO_SHOP['name'],
            defaults={
                'description': DEMO_SHOP['description'],
                'location': DEMO_SHOP['location'],
                'shop_admin': admin_user,
                'is_active': True,
                'is_open': True,
                'final_validity_time': now.replace(hour=17, minute=0, second=0, microsecond=0),
                'next_opening_time': now.replace(hour=8, minute=0, second=0, microsecond=0),
                'qr_validity_minutes': 20,
                'disabled_categories': [],
            }
        )
        if shop_created:
            # Link admin to shop
            admin_user.shop = shop
            admin_user.save()
            self.stdout.write(self.style.SUCCESS(f'Created shop: {shop.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Shop already exists: {shop.name}'))

        # 3. Create products with images
        media_products_dir = os.path.join(settings.MEDIA_ROOT, 'products')
        created_count = 0
        skipped_count = 0

        for slug, name, price, category, stock, description in PRODUCTS:
            if Product.objects.filter(name=name, shop=shop).exists():
                skipped_count += 1
                continue

            # Upload image to storage
            local_image = os.path.join(media_products_dir, f'{slug}.jpg')
            storage_path = f'products/{slug}.jpg'
            image_url = upload_image_to_storage(local_image, storage_path)

            Product.objects.create(
                name=name,
                description=description,
                price=price,
                stock=stock,
                stock_mode='stock',
                category=category,
                shop=shop,
                is_available=True,
                image=image_url,
            )
            created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. Created {created_count} products, skipped {skipped_count} existing.'
        ))
        self.stdout.write(self.style.SUCCESS(
            f'\nDemo credentials:\n  Shop: {shop.name}\n  Email: {DEMO_ADMIN_EMAIL}\n  Password: {DEMO_ADMIN_PASSWORD}'
        ))
