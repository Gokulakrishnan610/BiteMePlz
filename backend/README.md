# REC-KIOSK Django Backend

This is the Django backend for the REC-KIOSK application, migrated from Express.js with Supabase to Django with SQLite.

## Setup Instructions

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Create environment variables:**
   Create a `.env` file in the backend directory with:
   ```
   SECRET_KEY=django-insecure-your-secret-key-here-change-in-production
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   ```

3. **Run migrations:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

4. **Create superuser:**
   ```bash
   python manage.py createsuperuser
   ```

5. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

## API Endpoints

The API follows the same structure as the original Express.js backend:

- `/api/users/` - User management
- `/api/shops/` - Shop management
- `/api/products/` - Product management
- `/api/orders/` - Order management
- `/api/transactions/` - Transaction management
- `/api/shop-logs/` - Shop logs
- `/api/student-analytics/` - Student analytics

## Database

The application uses SQLite as the database, which is stored in `db.sqlite3` in the backend directory.

## Features

- JWT authentication
- QR code generation for orders
- File upload support
- Role-based access control
- Transaction management
- Analytics tracking 