# Frontend Deployment Guide

## ✅ API URLs Updated

The frontend has been updated to use your deployed backend:
- **Production API URL**: `https://kisokrec.onrender.com`
- **Development**: Still uses localhost for development

## 🚀 Deploy Frontend

### Option 1: Vercel (Recommended - 3 minutes)

1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `REC-KIOSK/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click "Deploy"

### Option 2: Netlify (Alternative)

1. Go to [Netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click "New site from Git"
4. Import your repository
5. Configure:
   - **Base directory**: `REC-KIOSK/frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Click "Deploy site"

### Option 3: Render Static Site

1. Go to [Render.com](https://render.com)
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `rec-kiosk-frontend`
   - **Root Directory**: `REC-KIOSK/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

## 🔧 Environment Variables

The frontend will automatically use the correct API URL:
- **Development**: Uses localhost (via Vite proxy)
- **Production**: Uses `https://kisokrec.onrender.com`

## 📋 Pre-deployment Checklist

- [ ] API URLs updated ✅
- [ ] Backend deployed on Render ✅
- [ ] Frontend code pushed to GitHub
- [ ] Choose deployment platform (Vercel/Netlify/Render)

## 🎉 After Deployment

1. Your frontend will be live at the provided URL
2. Test the application functionality
3. Verify API calls are working
4. Check if data is loading properly

## 🔍 Testing

After deployment, test these features:
- [ ] User registration/login
- [ ] Shop browsing
- [ ] Product viewing
- [ ] Cart functionality
- [ ] Payment flow (if configured)

## 🆘 Troubleshooting

If API calls fail:
1. Check if backend is running on Render
2. Verify CORS settings in backend
3. Check browser console for errors
4. Ensure environment variables are set correctly
