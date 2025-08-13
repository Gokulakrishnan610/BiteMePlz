# REC-KIOSK Deployment Guide for Render

This guide will help you deploy the REC-KIOSK application on Render.com.

## Prerequisites

1. A Render.com account
2. A GitHub repository with your code
3. Razorpay account for payment processing
4. Redis service (can be added via Render)

## Backend Deployment

### 1. Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Select the repository containing your REC-KIOSK code

### 2. Configure the Web Service

**Basic Settings:**
- **Name**: `rec-kiosk-backend` (or your preferred name)
- **Environment**: `Python 3`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `REC-KIOSK/backend`
- **Build Command**: `./build.sh`
- **Start Command**: `gunicorn rec_kiosk.wsgi:application --bind 0.0.0.0:$PORT`

### 3. Environment Variables

Add these environment variables in the Render dashboard:

```bash
# Django Settings
SECRET_KEY=your-super-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-app-name.onrender.com,localhost,127.0.0.1

# Database (Render will provide this)
DATABASE_URL=postgresql://...

# CORS Settings
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com,http://localhost:3000,http://localhost:5173

# Razorpay Settings
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-secret-key

# Redis (if using Redis service)
REDIS_URL=redis://your-redis-url
```

### 4. Create a PostgreSQL Database

1. In Render dashboard, click "New +" and select "PostgreSQL"
2. Choose a plan (Free tier available for testing)
3. Note the connection details
4. The `DATABASE_URL` will be automatically set in your web service

### 5. Create a Redis Service (Optional)

1. In Render dashboard, click "New +" and select "Redis"
2. Choose a plan
3. Note the connection URL
4. Add `REDIS_URL` to your web service environment variables

## Frontend Deployment

### Option 1: Deploy as Static Site on Render

1. Create a new "Static Site" service
2. Configure:
   - **Name**: `rec-kiosk-frontend`
   - **Root Directory**: `REC-KIOSK/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### Option 2: Deploy on Vercel/Netlify

#### Vercel Deployment:
1. Go to [Vercel](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `REC-KIOSK/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

#### Netlify Deployment:
1. Go to [Netlify](https://netlify.com)
2. Import your GitHub repository
3. Configure:
   - **Base directory**: `REC-KIOSK/frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

### 3. Frontend Environment Variables

Create a `.env.production` file in the frontend directory:

```bash
VITE_API_BASE_URL=https://your-backend-app-name.onrender.com
```

Or set environment variables in your deployment platform.

## Configuration Files

### Backend Files Created:

1. **`build.sh`** - Build script for Render
2. **`Procfile`** - Process definition for Render
3. **`runtime.txt`** - Python version specification
4. **Updated `settings.py`** - Production-ready settings
5. **Updated `requirements.txt`** - All necessary dependencies

### Frontend Configuration:

Update your API base URL in the frontend to point to your deployed backend:

```typescript
// In your API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://your-backend-app-name.onrender.com';
```

## Deployment Steps

### 1. Backend Deployment

1. Push your code to GitHub
2. Create the web service on Render
3. Add environment variables
4. Deploy and wait for build to complete
5. Test the API endpoints

### 2. Frontend Deployment

1. Update the API base URL to point to your deployed backend
2. Deploy to your chosen platform
3. Test the application

### 3. Post-Deployment

1. Create a superuser for Django admin:
   ```bash
   python manage.py createsuperuser
   ```

2. Set up initial data:
   - Create shops
   - Add products
   - Configure payment settings

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check the build logs in Render
   - Ensure all dependencies are in `requirements.txt`
   - Verify Python version in `runtime.txt`

2. **Database Connection Issues**:
   - Verify `DATABASE_URL` is set correctly
   - Check if PostgreSQL service is running
   - Ensure migrations are applied

3. **CORS Issues**:
   - Update `CORS_ALLOWED_ORIGINS` with your frontend domain
   - Check if frontend URL is correct

4. **Static Files Not Loading**:
   - Ensure `whitenoise` is configured
   - Check `STATIC_ROOT` and `STATIC_URL` settings

### Environment Variables Checklist:

- [ ] `SECRET_KEY`
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS`
- [ ] `DATABASE_URL`
- [ ] `CORS_ALLOWED_ORIGINS`
- [ ] `RAZORPAY_KEY_ID`
- [ ] `RAZORPAY_KEY_SECRET`
- [ ] `REDIS_URL` (if using Redis)

## Security Considerations

1. **Never commit sensitive data** to your repository
2. **Use environment variables** for all secrets
3. **Enable HTTPS** (Render provides this automatically)
4. **Set DEBUG=False** in production
5. **Use strong SECRET_KEY**

## Monitoring

1. **Render Dashboard**: Monitor logs and performance
2. **Django Admin**: Access via `/admin/` endpoint
3. **Health Checks**: Set up monitoring endpoints

## Cost Optimization

1. **Free Tier**: Use Render's free tier for testing
2. **Auto-sleep**: Free services sleep after inactivity
3. **Database**: Choose appropriate PostgreSQL plan
4. **Redis**: Only if you need real-time features

## Support

If you encounter issues:

1. Check Render's documentation
2. Review build logs
3. Test locally first
4. Check environment variables
5. Verify all services are running

---

**Note**: This deployment guide assumes you're using the standard REC-KIOSK structure. Adjust paths and configurations as needed for your specific setup.
