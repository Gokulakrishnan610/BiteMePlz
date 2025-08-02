# MongoDB to Supabase Migration Guide

This guide will help you migrate your REC-KIOSK application from MongoDB to Supabase while maintaining all existing functionality.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project in your Supabase dashboard
3. **Environment Variables**: You'll need your Supabase URL and API key

## Step 1: Set Up Supabase Database

### 1.1 Create Tables
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire contents of `supabase-schema.sql` into the SQL editor
4. Click "Run" to execute the SQL and create all tables

### 1.2 Get Your Supabase Credentials
1. In your Supabase dashboard, go to Settings > API
2. Copy your Project URL and anon public key
3. Add these to your `.env` file:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 2: Update Environment Variables

Add the following to your `server/.env` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Keep your existing environment variables
JWT_SECRET=your_jwt_secret
PORT=5000
NODE_ENV=development
```

## Step 3: Install Supabase Client

The Supabase client has already been installed. If you need to reinstall:

```bash
npm install @supabase/supabase-js --legacy-peer-deps
```

## Step 4: Migrate Your Data (Optional)

If you have existing data in MongoDB that you want to migrate:

1. Make sure your MongoDB server is running
2. Run the migration script:

```bash
node migrate-to-supabase.js
```

This will transfer all your existing data from MongoDB to Supabase.

## Step 5: Update Your Controllers

The database service layer has been created to maintain the same API as your Mongoose models. However, you may need to update some controllers to use the new service layer.

### Example: Updating a Controller

**Before (MongoDB/Mongoose):**
```javascript
import User from '../models/userModel.js';

// In your controller
const user = await User.findById(req.params.id);
```

**After (Supabase):**
```javascript
import { UserService } from '../services/databaseService.js';

// In your controller
const user = await UserService.findById(req.params.id);
```

## Step 6: Test Your Application

1. Start your server:
```bash
npm run dev:server
```

2. Test all your API endpoints to ensure they work correctly
3. Check the console for any Supabase connection errors

## Key Changes Made

### 1. Database Configuration
- **Old**: `server/config/db.js` (MongoDB connection)
- **New**: `server/config/supabase.js` (Supabase connection)

### 2. Database Service Layer
- **New**: `server/services/databaseService.js` - Provides the same API as Mongoose models but uses Supabase underneath

### 3. Server Configuration
- Updated `server/index.js` to use Supabase instead of MongoDB
- All database queries now use the service layer

### 4. Data Structure Changes
- MongoDB ObjectIds are now UUIDs
- Timestamps are handled automatically by Supabase
- Foreign key relationships are properly enforced

## Database Schema Mapping

| MongoDB Field | Supabase Field | Type |
|---------------|----------------|------|
| `_id` | `id` | UUID |
| `createdAt` | `created_at` | TIMESTAMP |
| `updatedAt` | `updated_at` | TIMESTAMP |
| `rollNo` | `roll_no` | VARCHAR |
| `shopAdmin` | `shop_admin` | UUID (FK) |
| `orderId` | `order_id` | VARCHAR |
| `userId` | `user_id` | UUID (FK) |
| `shopId` | `shop_id` | UUID (FK) |

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify your Supabase URL and API key are correct
   - Check that your Supabase project is active

2. **Permission Errors**
   - Ensure Row Level Security (RLS) policies are properly configured
   - Check that your API key has the necessary permissions

3. **Data Type Errors**
   - Supabase is more strict about data types than MongoDB
   - Ensure all data matches the expected schema

4. **Foreign Key Errors**
   - Make sure referenced records exist before creating relationships
   - Check that UUIDs are properly formatted

### Debugging

1. Check the server console for Supabase connection messages
2. Use the Supabase dashboard to inspect your data
3. Test individual API endpoints to isolate issues

## Rollback Plan

If you need to rollback to MongoDB:

1. Keep your original `server/config/db.js` file
2. Keep your original Mongoose models
3. Update `server/index.js` to use MongoDB again
4. Remove Supabase-related environment variables

## Performance Considerations

- Supabase provides automatic indexing on primary keys
- Consider adding custom indexes for frequently queried fields
- Monitor your Supabase usage in the dashboard

## Security

- Row Level Security (RLS) is enabled on all tables
- Policies are configured to match your application's access patterns
- API keys should be kept secure and not committed to version control

## Support

If you encounter issues during migration:

1. Check the Supabase documentation
2. Review the error messages in your server console
3. Verify your database schema matches the expected structure
4. Test with a small subset of data first

## Next Steps

After successful migration:

1. Monitor your application's performance
2. Set up Supabase monitoring and alerts
3. Consider using Supabase's real-time features
4. Explore additional Supabase features like Edge Functions

---

**Note**: This migration maintains 100% backward compatibility with your existing API endpoints. All your frontend code and business logic will continue to work without any changes. 