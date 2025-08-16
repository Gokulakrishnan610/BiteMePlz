# 🖼️ REC-KIOSK Image Upload & Deployment Guide

This guide will help you upload all your product images from the frontend to the backend and deploy them to Render.

## 📋 Prerequisites

- Python 3.7+ installed
- `requests` library installed (`pip install requests`)
- Access to your Render backend
- Git repository set up (for automatic deployment)

## 🚀 Quick Start

### Step 1: Download Images from Frontend
```bash
cd REC-KIOSK/backend
python upload_images.py
```

This script will:
- Download all product images from your Netlify frontend
- Save them to `media/products/` folder
- Show progress and results

### Step 2: Deploy to Render
```bash
python deploy_images.py
```

This script will:
- Check git status
- Commit and push media files
- Provide manual deployment steps if needed

### Step 3: Update Database (Optional)
```bash
python manage.py update_product_images --create-missing
```

This command will:
- Update existing products with new image paths
- Create new products for images that don't have products
- Categorize products automatically

## 📁 What Gets Uploaded

The following images will be downloaded and uploaded:

#### ☕ Coffee & Beverages
- americano.jpg, cappuccino.jpg, latte.jpg, espresso.jpg
- chai-tea.jpg, hot-chocolate.jpg, iced-coffee.jpg
- vanilla-latte.jpg, mocha.jpg, green-tea.jpg, milkshake.jpg

#### 🍔 Food Items
- bagel.jpg, sandwich.jpg, pizza-slice.jpg, chicken-burger.jpg
- french-fries.jpg, croissant.jpg, danish-pastry.jpg
- coffee-cake.jpg, chocolate-cake.jpg, cheesecake.jpg
- beef-noodles.jpg, chicken-noodles.jpg, fried-rice.jpg
- kung-pao-chicken.jpg, sweet-and-sour-chicken.jpg
- chicken-wings.jpg, chicken-nuggets.jpg, chicken-wrap.jpg
- spring-rolls.jpg, onion-rings.jpg, soft-serve-ice-cream.jpg

#### 🍿 Snacks & Drinks
- coca-cola.jpg, pepsi.jpg, sprite.jpg
- doritos-nacho-cheese.jpg, cheetos.jpg, pringles-original.jpg

#### ✏️ Stationery
- blue-pen.jpg, pencil-set.jpg, eraser.jpg, notebook-a4.jpg

## 🔧 Manual Steps (if scripts fail)

### Option 1: Manual File Upload to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your backend service
3. Go to "Files" tab
4. Upload the entire `media` folder
5. Restart the service

### Option 2: Git Manual Push
```bash
git add media/
git commit -m "Add product images"
git push origin main
```

## 🧪 Testing

After deployment, test these URLs:
- `https://rec-kiosk.onrender.com/media/products/bagel.jpg`
- `https://rec-kiosk.onrender.com/media/products/americano.jpg`
- `https://rec-kiosk.onrender.com/media/products/cappuccino.jpg`

## 📊 Database Integration

### Product Model Updates
The `update_product_images` command will:
- Update existing products with correct image paths
- Create new products for missing images
- Automatically categorize products
- Set default prices and stock levels

### Image Paths in Database
Images will be stored with paths like:
- `products/bagel.jpg`
- `products/americano.jpg`
- `products/cappuccino.jpg`

## 🚨 Troubleshooting

### Images Not Downloading
- Check internet connection
- Verify Netlify URLs are accessible
- Check if `requests` library is installed

### Deployment Fails
- Ensure you're in the correct directory
- Check git repository setup
- Verify Render service is running

### Images Not Loading After Deployment
- Wait 5-10 minutes for Render to redeploy
- Check Render service logs
- Verify media folder structure

### Database Issues
- Ensure Django models are migrated
- Check if shops exist in database
- Verify database connection

## 📝 File Structure After Upload

```
backend/
├── media/
│   └── products/
│       ├── americano.jpg
│       ├── bagel.jpg
│       ├── cappuccino.jpg
│       ├── latte.jpg
│       └── ... (all other images)
├── upload_images.py
├── deploy_images.py
├── manage.py
└── ...
```

## 🔄 Updating Images

To add new images later:
1. Place new images in `media/products/`
2. Run `python manage.py update_product_images --create-missing`
3. Deploy using `python deploy_images.py`

## 📞 Support

If you encounter issues:
1. Check the error messages in the scripts
2. Verify all prerequisites are met
3. Check Render service logs
4. Ensure Django media serving is configured correctly

## 🎯 Expected Results

After successful completion:
- ✅ All product images downloaded from Netlify
- ✅ Images stored in backend `media/products/` folder
- ✅ Images accessible via `/media/products/` URLs
- ✅ Database updated with correct image paths
- ✅ Frontend can display images from backend
- ✅ Images working in production on Render

---

**Happy uploading! 🎉**
