# Parent Session System for REC College Kiosk

## Overview
This system allows parents to access the kiosk app with temporary session IDs instead of permanent user accounts. Parents can browse shops, order items, and access student features using a unique session that expires automatically.

## Features

### Backend (`/api/session/` POST endpoint)
- **Generates unique session IDs** using UUID v4
- **Temporary storage** (ready for Redis integration)
- **Session validation** helper functions
- **Automatic expiration** (configurable, default 24 hours)

### Frontend
- **Parent Login Page** (`/parent-login`) with email input
- **Session Management** - stores session ID in localStorage and sessionStorage
- **Automatic Header Injection** - session ID included in all API requests
- **Parent Home Page** (`/parent-home`) with session info and navigation
- **Seamless Integration** - works with existing kiosk flow

## How It Works

### 1. Parent Login Flow
```
Parent enters email → Clicks "Enter" → Backend creates session → Frontend stores session ID → Redirects to Parent Home
```

### 2. Session ID Usage
- **Stored in**: `localStorage.parentSessionId` and `sessionStorage.parentSessionId`
- **Sent in headers**: `X-Parent-Session-ID: <session_id>`
- **Automatic**: All API requests include session ID if available

### 3. Session Validation
```python
# In your Django views
from .views import get_parent_session_id, validate_parent_session

def your_view(request):
    parent_session_id = get_parent_session_id(request)
    if parent_session_id and validate_parent_session(parent_session_id):
        # Handle parent user
        pass
    else:
        # Handle unauthorized access
        pass
```

## API Endpoints

### POST `/api/session/`
Creates a new parent session.

**Request**: No body required
**Response**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Session created successfully",
  "expires_in": "24 hours"
}
```

## Frontend Routes

- `/parent-login` - Parent login page
- `/parent-home` - Parent dashboard after login
- All existing student routes work for parents (cart, orders, profile, etc.)

## Security Features

- **Unique Session IDs**: Each session gets a UUID v4 identifier
- **Temporary Nature**: Sessions expire automatically
- **Header-based**: Session ID sent in custom header, not cookies
- **Validation Ready**: Framework in place for Redis-based validation

## Production Setup

### Redis Integration
```python
# In settings.py
import redis

redis_client = redis.Redis(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True
)

# In views.py, replace TODO comments with:
redis_client.setex(f"parent_session:{session_id}", 86400, request.META.get('REMOTE_ADDR', ''))
return redis_client.exists(f"parent_session:{session_id}")
```

### Session Expiration
- **Default**: 24 hours (86400 seconds)
- **Configurable**: Modify TTL value in Redis operations
- **Cleanup**: Redis automatically removes expired sessions

## Usage Examples

### 1. Basic Parent Access
```typescript
// Parent enters email and clicks Enter
// System creates session and stores it
// All subsequent API calls include session ID automatically
```

### 2. Custom API Integration
```typescript
// Manual API call with session ID
const sessionId = localStorage.getItem('parentSessionId');
const response = await fetch('/api/orders/', {
  headers: {
    'X-Parent-Session-ID': sessionId
  }
});
```

### 3. Backend Validation
```python
# In any Django view
def order_view(request):
    # Check for parent session
    parent_session_id = get_parent_session_id(request)
    if parent_session_id and validate_parent_session(parent_session_id):
        # Allow parent to access orders
        return handle_parent_order(request, parent_session_id)
    
    # Regular authentication check
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    # Handle regular user
    return handle_regular_order(request)
```

## Testing

### Backend
```bash
# Test session creation
curl -X POST http://localhost:8000/api/session/
```

### Frontend
1. Navigate to `/parent-login`
2. Enter any email
3. Click "Enter"
4. Verify redirect to `/parent-home`
5. Check browser dev tools for session ID in localStorage
6. Verify session ID appears in API request headers

## Future Enhancements

- **Redis Integration**: Replace temporary storage with Redis
- **Session Analytics**: Track parent usage patterns
- **Email Verification**: Optional email confirmation for parent sessions
- **Session Limits**: Limit concurrent sessions per email
- **Audit Logging**: Track session creation and usage

## Troubleshooting

### Common Issues
1. **Session not created**: Check backend logs for errors
2. **Session ID not stored**: Verify localStorage permissions
3. **Headers not sent**: Check API interceptor configuration
4. **Validation fails**: Ensure helper functions are imported correctly

### Debug Steps
1. Check browser console for errors
2. Verify session ID in localStorage
3. Check Network tab for request headers
4. Review backend logs for session creation
5. Test session endpoint directly with curl

## Support

For issues or questions about the parent session system, check:
1. Backend logs for Django errors
2. Frontend console for JavaScript errors
3. Network tab for API request/response issues
4. This README for usage examples




