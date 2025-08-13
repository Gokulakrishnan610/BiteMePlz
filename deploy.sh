#!/bin/bash

echo "🚀 REC-KIOSK Deployment Script"
echo "================================"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if we have a remote repository
if ! git remote get-url origin &> /dev/null; then
    echo "❌ No remote repository found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    exit 1
fi

echo "✅ Git repository found"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  You have uncommitted changes. Please commit them first:"
    echo "   git add ."
    echo "   git commit -m 'Your commit message'"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📋 Deployment Checklist:"
echo "========================"
echo "1. ✅ Backend configuration files created"
echo "2. ✅ Frontend configuration updated"
echo "3. ✅ Deployment guide created"
echo ""
echo "📝 Next Steps:"
echo "=============="
echo "1. Push your code to GitHub:"
echo "   git push origin main"
echo ""
echo "2. Create a Render account: https://render.com"
echo ""
echo "3. Create a new Web Service on Render:"
echo "   - Connect your GitHub repository"
echo "   - Root Directory: REC-KIOSK/backend"
echo "   - Build Command: ./build.sh"
echo "   - Start Command: gunicorn rec_kiosk.wsgi:application --bind 0.0.0.0:\$PORT"
echo ""
echo "4. Add environment variables in Render:"
echo "   - SECRET_KEY (generate a strong one)"
echo "   - DEBUG=False"
echo "   - ALLOWED_HOSTS (your-app-name.onrender.com)"
echo "   - DATABASE_URL (Render will provide)"
echo "   - CORS_ALLOWED_ORIGINS (your frontend domain)"
echo "   - RAZORPAY_KEY_ID"
echo "   - RAZORPAY_KEY_SECRET"
echo ""
echo "5. Create a PostgreSQL database on Render"
echo ""
echo "6. Deploy your frontend to Vercel/Netlify/Render"
echo ""
echo "📚 For detailed instructions, see: DEPLOYMENT_GUIDE.md"
echo ""
echo "🔧 Generate a strong SECRET_KEY:"
echo "python -c \"import secrets; print(secrets.token_urlsafe(50))\"" 
echo ""
echo "�� Happy deploying!"
