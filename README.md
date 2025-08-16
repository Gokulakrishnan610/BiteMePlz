# REC Kiosk

A comprehensive campus food ordering and management system with QR code-based ordering, real-time analytics, and multi-role user management.

## Features

### Admin Features
- **Shop Management**: Create, edit, and manage campus shops
- **User Management**: Manage students, shop admins, and sub-admins
- **Analytics Dashboard**: Comprehensive sales and order analytics
- **Financial Reports**: Detailed financial tracking and reporting
- **Shop Admin Password Management**: Change passwords for all shop admin users
- **System Logs**: Track all system activities and changes

### Shop Admin Features
- **Product Management**: Add, edit, and manage shop products
- **Order Management**: Process and verify student orders
- **QR Code Generation**: Generate QR codes for order verification
- **Sub-Admin Management**: Create and manage sub-shop admins
- **Analytics**: Shop-specific performance metrics

### Student Features
- **Order Placement**: Browse shops and place orders
- **QR Code Orders**: Scan QR codes to place orders
- **Wallet System**: Manage account balance and payments
- **Order History**: Track all past orders and transactions

## New Feature: Shop Admin Password Management

### Overview
Administrators can now change passwords for all shop admin users directly from the admin interface. This feature provides enhanced security and administrative control over shop access by allowing admins to set custom passwords.

### How to Use

#### From Django Admin Interface
1. Navigate to Django Admin → Shops
2. Select a shop from the list
3. Use the "Change shop admin password" action from the dropdown
4. Enter your desired new password (minimum 6 characters)
5. The password will be updated immediately

#### From Frontend Admin Interface
1. **Shops List Page**: Click the key icon (🔑) on any shop card
2. **Shop Details Page**: Use the "Change Password" button in the header
3. **Edit Shop Page**: Use the "Change Password" button in the header

### Security Features
- **Custom Password Input**: Administrators can set specific passwords instead of random generation
- **Password Validation**: Minimum 6 characters required
- **Action Logging**: All password changes are logged with admin details
- **Admin-Only Access**: Only superusers can change shop admin passwords
- **Immediate Effect**: New passwords take effect immediately
- **Forgot Password Compatibility**: Shop admins can still use the forgot password feature even after their passwords are changed by administrators
- **Password Reset Monitoring**: Admins can view password reset status and recent password change history

### Technical Implementation
- **Backend API**: `/api/users/change_shop_admin_password/` endpoint
- **Request Format**: `{"shop_id": "uuid", "new_password": "custom_password"}`
- **Admin Actions**: Django admin bulk actions and custom views with password forms
- **Frontend Integration**: React components with password input fields and confirmation dialogs
- **Audit Trail**: Comprehensive logging via ShopLog model

### Forgot Password Functionality
The forgot password feature remains fully functional for all users, including shop admins whose passwords have been changed by administrators:

- **Request Reset**: `/api/users/forgot-password/` - Send OTP to user's email
- **Verify OTP**: `/api/users/verify-reset-otp` - Verify the OTP code
- **Reset Password**: `/api/users/reset-password` - Set new password using reset token
- **Resend OTP**: `/api/users/resend-reset-otp` - Resend OTP if expired

This ensures that shop admins can always regain access to their accounts through the standard password reset process, regardless of how their passwords were originally set or changed.

### Password Reset Monitoring (New Feature)
Administrators can now monitor password reset activities and view the status of password reset requests:

#### From Django Admin Interface
1. **Shop Management**: 
   - Select a shop and use "View Password Reset Info" action
   - View current password reset status (OTP/Token active/inactive)
   - See recent password change history
   - Access password change forms directly

2. **User Management**:
   - Select any user and use "View Password Reset Info" action
   - View individual user's password reset status
   - For shop admins: see associated shop's password change logs

#### Information Displayed
- **Current Status**: Whether reset OTP or token is currently active
- **Recent Changes**: History of password changes with timestamps and admin details
- **User Details**: Shop admin information and associated shop details
- **Quick Actions**: Direct links to change passwords or return to admin sections

This feature provides comprehensive visibility into password management activities while maintaining security by not exposing actual passwords.

## Installation and Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL (recommended) or SQLite

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Create a `.env` file in the backend directory:
```env
SECRET_KEY=your_secret_key
DEBUG=True
DATABASE_URL=your_database_url
EMAIL_HOST=your_email_host
EMAIL_PORT=587
EMAIL_HOST_USER=your_email
EMAIL_HOST_PASSWORD=your_password
```

## API Documentation

### Authentication
- JWT-based authentication
- Role-based access control (admin, shopAdmin, student)
- Session-based authentication for parent users

### Key Endpoints
- `/api/users/` - User management
- `/api/shops/` - Shop management
- `/api/products/` - Product management
- `/api/orders/` - Order processing
- `/api/transactions/` - Financial transactions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 