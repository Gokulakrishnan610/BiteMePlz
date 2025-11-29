# Student Activity Logging - Test Guide

## ✅ System Status
- **StudentLog Model**: ✓ Created and migrated
- **API Endpoints**: ✓ Available at `/api/student-logs/`
- **Admin Panel**: ✓ Available at `/kisok-ac-back-office/student-logs`
- **Student Users**: ✓ 6 students in database

## 🧪 Manual Testing Steps

### 1. Login as Student
1. Go to student login page
2. Login with any student account
3. **Expected**: Login action logged automatically (backend)

### 2. View Shops
1. After login, you'll see the shops page
2. **Expected**: "view_shops" action logged (frontend)

### 3. View Products
1. Click on any shop
2. **Expected**: "view_products" action logged with shop name (frontend)

### 4. Add to Cart
1. Click "Add to Cart" on any product
2. **Expected**: "add_to_cart" action logged with product name and quantity (frontend)

### 5. Remove from Cart
1. Remove a product completely from cart
2. **Expected**: "remove_from_cart" action logged (frontend)

### 6. Place Order
1. Go to cart and place an order
2. Complete payment (balance or Razorpay)
3. **Expected**: "place_order" action logged with order number and amount (backend)

### 7. View Order
1. Go to "My Orders"
2. Click on any order to view details
3. **Expected**: "view_order" action logged with order number (frontend)

### 8. View Profile
1. Click on profile/account
2. **Expected**: "view_profile" action logged (frontend)

### 9. Logout
1. Click logout
2. **Expected**: "logout" action logged (frontend)

## 📊 View Logs in Admin Panel

1. Login as admin
2. Navigate to: `/kisok-ac-back-office/student-logs`
3. You should see all logged activities

### Admin Panel Features:
- **Filter by Action**: Select specific action types
- **Date Range**: Filter by start and end date
- **Search**: Search by student name or roll number
- **Export CSV**: Download logs as CSV file
- **View Details**: Click eye icon for full log details

## 🔍 Verify Logs

### Using Django Shell:
```bash
cd backend
python manage.py shell
```

```python
from api.models import StudentLog

# Count total logs
print(f"Total logs: {StudentLog.objects.count()}")

# View recent logs
for log in StudentLog.objects.order_by('-created_at')[:10]:
    print(f"{log.created_at} | {log.user.name} | {log.action} | {log.description}")

# Count by action
from django.db.models import Count
actions = StudentLog.objects.values('action').annotate(count=Count('action'))
for a in actions:
    print(f"{a['action']}: {a['count']}")
```

### Using Status Check Script:
```bash
cd backend
python check_logging_status.py
```

## 📝 What Gets Logged

Each log entry contains:
- **User**: Student who performed the action
- **Action**: Type of action (login, view_shops, add_to_cart, etc.)
- **Description**: Human-readable description
- **Shop**: Related shop (if applicable)
- **Order**: Related order (if applicable)
- **Product**: Related product (if applicable)
- **Metadata**: Additional data (quantity, amount, etc.)
- **IP Address**: User's IP address
- **User Agent**: Browser/device information
- **Timestamp**: When the action occurred

## 🐛 Troubleshooting

### No logs appearing?
1. Check browser console for errors
2. Verify you're logged in as a **student** (not admin/shopAdmin)
3. Check network tab for POST requests to `/api/student-logs/`
4. Verify backend server is running

### Logs not showing in admin panel?
1. Make sure you're logged in as admin
2. Check the URL: `/kisok-ac-back-office/student-logs`
3. Try refreshing the page
4. Check browser console for errors

### Frontend logging not working?
1. Check if `studentLogger.ts` is imported correctly
2. Verify user role is 'student' in localStorage
3. Check network tab for failed requests

## ✨ Current Implementation Status

| Action | Status | Location |
|--------|--------|----------|
| Login | ✅ Implemented | Backend (urls.py) |
| Logout | ✅ Implemented | Frontend (AuthContext.tsx) |
| View Shops | ✅ Implemented | Frontend (HomePage.tsx) |
| View Products | ✅ Implemented | Frontend (ShopPage.tsx) |
| Add to Cart | ✅ Implemented | Frontend (ShopPage.tsx) |
| Remove from Cart | ✅ Implemented | Frontend (ShopPage.tsx) |
| Place Order | ✅ Implemented | Backend (views.py) |
| View Order | ✅ Implemented | Frontend (OrderDetailsPage.tsx) |
| View Profile | ✅ Implemented | Frontend (ProfilePage.tsx) |
| Cancel Order | 📋 Ready (not integrated) | - |
| Add Balance | 📋 Ready (not integrated) | - |
| Update Profile | 📋 Ready (not integrated) | - |
| View Transactions | 📋 Ready (not integrated) | - |

## 🎯 Success Criteria

The system is working correctly if:
1. ✅ Student can perform actions without errors
2. ✅ Logs appear in admin panel after actions
3. ✅ Logs contain correct information (user, action, timestamp)
4. ✅ Filtering and search work in admin panel
5. ✅ CSV export works
6. ✅ No errors in browser console
7. ✅ Actions don't block or slow down user experience

---

**Note**: All logging is designed to be non-blocking and fail silently. Even if logging fails, it won't affect the user experience.
