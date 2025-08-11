# REC-KIOSK

A comprehensive kiosk management system for REC (Rajalakshmi Engineering College) with QR code-based ordering and payment system.

## 🚀 Recent Migration

This project has been migrated from **Express.js with Supabase** to **Django with SQLite** while maintaining all functionality.

## 🏗️ Architecture

- **Backend**: Django 4.2.7 with Django REST Framework
- **Database**: SQLite (migrated from Supabase)
- **Frontend**: React with TypeScript and Vite
- **Authentication**: JWT tokens
- **File Upload**: Django media handling
- **QR Code**: Python qrcode library

## 📁 Project Structure

```
REC-KIOSK/
├── backend/                 # Django backend
│   ├── api/                # Django app with models, views, serializers
│   ├── rec_kiosk/          # Django project settings
│   ├── manage.py           # Django management script
│   ├── requirements.txt    # Python dependencies
│   └── setup.py           # Setup script for initial configuration
├── frontend/               # React frontend
│   ├── src/               # React source code
│   ├── package.json       # Node.js dependencies
│   └── vite.config.ts     # Vite configuration
└── README.md              # This file
```

## 🛠️ Setup Instructions

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd REC-KIOSK/backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create environment variables:**
   Create a `.env` file in the backend directory:
   ```
   SECRET_KEY=django-insecure-your-secret-key-here-change-in-production
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   ```

4. **Run the setup script:**
   ```bash
   python setup.py
   ```
   This will:
   - Run database migrations
   - Create a superuser
   - Create sample data for testing

5. **Start the Django server:**
   ```bash
   python manage.py runserver
   ```
   The backend will be available at `http://localhost:8000`

6. **Background jobs (Celery + Redis)**

   This project uses Celery for automated tasks like expiring orders and handling wallet refunds per your multi-shop constraints.

   - Install and run Redis (no Docker):
     - Windows (Chocolatey, run PowerShell as Administrator):
       - Install: `choco install redis-64 -y`
        -path:`C:\Users\asiva\Downloads\Redis-x64-3.0.504`
       - Start: `\redis-server.exe`
       - Test: `redis-cli ping` → should return `PONG`
     - Or via WSL (Ubuntu):
       - `sudo apt update && sudo apt install -y redis-server`
       - `sudo service redis-server start`
       - `redis-cli ping`

   - Start Celery (Windows PowerShell):
     - From backend folder:
       - `cd D:\REC-KIOSK\backend`
       - Set env (one-time per session):
         - `$env:DJANGO_SETTINGS_MODULE='rec_kiosk.settings'`
       - Worker (Windows uses solo pool):
         - `celery -A rec_kiosk worker -l info -P solo`
       - Beat (scheduler):
         - `celery -A rec_kiosk beat -l info`

   - Alternatively, from repo root:
     - Worker: `celery -A backend.rec_kiosk worker -l info -P solo`
     - Beat: `celery -A backend.rec_kiosk beat -l info`

   Notes:
   - Broker URL is `redis://localhost:6379/0` (configured in `backend/rec_kiosk/settings.py`).
   - The beat schedule is defined in `backend/rec_kiosk/celery.py` and runs every minute.
   - Refund logic: For multi-shop orders, each shop’s order expires independently; wallet refunds are applied only to unverified, expired siblings paid by wallet.

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd REC-KIOSK/frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

## 🔑 Default Credentials

After running the setup script, you can use these default accounts:

- **Admin**: `admin@rec-kiosk.com` / `admin123`
- **Shop Admin**: `shopadmin@rec-kiosk.com` / `shopadmin123`

## 📋 Features

### User Management
- User registration and authentication
- Role-based access control (Admin, Shop Admin, Student)
- Profile management
- Balance management

### Shop Management
- Shop creation and management
- Shop status (open/closed)
- QR validity time configuration
- Shop admin assignment

### Product Management
- Product creation and management
- Image upload support
- Price management
- Availability status

### Order System
- QR code generation for orders
- Order tracking and verification
- Payment processing
- Order expiration handling

### Analytics
- Student spending analytics
- Transaction history
- Shop activity logs

## 🔌 API Endpoints

The Django backend provides the same API structure as the original Express.js backend:

- `POST /api/users/register/` - User registration
- `POST /api/users/login/` - User login
- `GET /api/users/profile/` - Get user profile
- `PUT /api/users/update_profile/` - Update user profile

- `GET /api/shops/` - List shops
- `POST /api/shops/` - Create shop
- `POST /api/shops/{id}/toggle_open/` - Toggle shop status

- `GET /api/products/` - List products
- `POST /api/products/` - Create product
- `GET /api/products/?shop_id={id}` - Get products by shop

- `GET /api/orders/` - List orders
- `POST /api/orders/` - Create order
- `POST /api/orders/{id}/verify/` - Verify order
- `POST /api/orders/{id}/pay/` - Pay for order

- `GET /api/transactions/` - List transactions
- `POST /api/transactions/` - Create transaction

- `GET /api/shop-logs/` - List shop logs
- `POST /api/shop-logs/` - Create shop log

- `GET /api/student-analytics/my_analytics/` - Get user analytics

- `POST /api/upload/single/` - Upload image

## 🗄️ Database Schema

The Django models replicate the original Supabase schema:

- **User**: Custom user model with roles and balance
- **Shop**: Shop information and configuration
- **Product**: Product details and pricing
- **Order**: Order management with QR codes
- **Transaction**: Financial transaction tracking
- **ShopLog**: Activity logging
- **StudentAnalytics**: User analytics

## 🔄 Migration Notes

### Key Changes from Express.js to Django:

1. **Database**: Supabase PostgreSQL → SQLite
2. **Authentication**: JWT tokens (same structure)
3. **File Upload**: Express multer → Django media handling
4. **API Structure**: Same endpoints, compatible response format
5. **QR Generation**: Node.js qrcode → Python qrcode

### Frontend Compatibility:

- All existing frontend code works without changes
- API response format maintained for compatibility
- File upload endpoints updated to match Django structure
- Proxy configuration updated for Django port (8000)

## 🚀 Deployment

### Backend Deployment
1. Set `DEBUG=False` in production
2. Use a production database (PostgreSQL recommended)
3. Configure static and media file serving
4. Set up proper CORS settings

### Frontend Deployment
1. Build the frontend: `npm run build`
2. Serve the `dist` folder
3. Configure API proxy for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 