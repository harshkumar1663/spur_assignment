# 🚀 Quick Start - Deployment Guide

This is a condensed guide to get your project deployed quickly. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📝 Architecture Note

**Single Process Deployment**: This project runs both frontend and backend from a single process. The backend (Fastify) serves both the API routes AND the frontend static files. This makes deployment to platforms with single-process limitations (Railway, Render, Heroku) much easier!

- **Development**: Frontend (Vite) and backend run separately for hot reload
- **Production**: Backend serves everything (API + static frontend files)

## Prerequisites

- Node.js 18+
- Google Gemini API Key ([Get it here](https://makersuite.google.com/app/apikey))
- Git repository (for cloud deployments)

## 🎯 Fastest Deployment Options

### Option 1: Railway (Recommended - 5 minutes)

1. Go to [Railway.app](https://railway.app) and sign up
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Add environment variables in Railway dashboard:
   ```
   GEMINI_API_KEY=your-key-here
   NODE_ENV=production
   ```
5. Done! Railway auto-builds and deploys

**Your app URL**: `https://your-app.railway.app`  
**Both frontend UI and API available at the same URL!**

### Option 2: Render (Blueprint - 7 minutes)

1. Go to [Render.com](https://render.com) and sign up
2. Click **"Blueprints"** → **"New Blueprint Instance"**
3. Connect your GitHub repo
4. Render reads `render.yaml` automatically
5. Add `GEMINI_API_KEY` in the backend service settings
6. Deploy!

### Option 3: Docker (Self-hosted)

```bash
# Build
docker build -t spur-assignment .

# Run
docker run -d -p 3000:3000 \
  -e GEMINI_API_KEY=your-key-here \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=* \
  spur-assignment
```

## 🔧 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure backend
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 3. Start development servers (from root)
cd ..
npm run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## 🧪 Quick Test After Deployment

```bash
# Test health endpoint
curl https://your-app-url/health

# Test chat
curl -X POST https://your-app-url/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

## 📋 Environment Variables Checklist

### Backend (Required)
- ✅ `GEMINI_API_KEY` - Your Google Gemini API key
- ✅ `NODE_ENV` - Set to `production`
- ✅ `PORT` - Usually `3000`
- ✅ `CORS_ORIGIN` - Set to `*` or your frontend URL

### Frontend (Optional for production)
- `PUBLIC_API_URL` - Your backend URL (only if deploying separately)

## 🆘 Common Issues

**Backend won't start?**
- Check `GEMINI_API_KEY` is set correctly
- Verify Node.js version is 18+
- Check logs for specific errors

**Frontend can't connect?**
- Verify `CORS_ORIGIN` includes your frontend URL
- Check `PUBLIC_API_URL` is set correctly (if deploying separately)
- Ensure backend is running and accessible

**Database errors?**
- SQLite file needs write permissions
- For Docker, mount a volume: `-v ./data:/app/backend/data`

## 📚 More Information

- [Full Deployment Guide](./DEPLOYMENT.md) - Detailed instructions for all platforms
- [Original README](./README.md) - Project architecture and development info

## 💰 Cost Estimates

- **Railway**: Free tier ($5 credit/month) → ~$5-10/month
- **Render**: Free tier (sleeps after 15min) → $7/month for always-on
- **Docker/VPS**: ~$4-6/month (DigitalOcean, etc.)

---

Need help? Check the logs on your deployment platform's dashboard!
