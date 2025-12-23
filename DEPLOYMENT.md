# Deployment Guide

This guide covers deploying the Spur Assignment project to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:
- A Google Gemini API key (get it from https://makersuite.google.com/app/apikey)
- Git repository initialized and committed
- Node.js 18+ installed locally for testing

## Environment Variables

### Backend Required Variables
```
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
GEMINI_API_KEY=your-actual-api-key-here
CORS_ORIGIN=*  # or your specific frontend URL
LOG_LEVEL=info
```

### Frontend Required Variables
None required for Vercel (UI calls same-origin `/api/*`).

Optional (for other hosts):
```
PUBLIC_API_URL=your-backend-url-here
```

---

## Option 1: Deploy to Railway (Recommended - Easiest)

Railway offers a great free tier and automatic deployments.

### Steps:

1. **Sign up at [Railway.app](https://railway.app)**

2. **Create a new project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select your repository

3. **Configure Backend**
   - Railway will auto-detect your Node.js project
   - Go to Variables tab and add:
     ```
     GEMINI_API_KEY=your-key-here
     NODE_ENV=production
     PORT=3000
     CORS_ORIGIN=*
     ```

4. **Deploy**
   - Railway will automatically build and deploy
   - Copy your backend URL (e.g., `https://your-app.railway.app`)

5. **Configure Frontend** (if deploying separately)
   - Create another service for the frontend
   - Add environment variable:
     ```
     PUBLIC_API_URL=https://your-backend.railway.app
     ```

6. **Access Your App**
   - Backend: `https://your-backend.railway.app`
   - Frontend: Deploy separately or access via backend

---

## Option 2: Deploy to Render

Render offers free hosting with automatic SSL.

### Steps:

1. **Sign up at [Render.com](https://render.com)**

2. **Create a Blueprint**
   - Go to Blueprints
   - Click "New Blueprint Instance"
   - Connect your GitHub repository
   - Render will use the `render.yaml` configuration file

3. **Configure Environment Variables**
   - In the Render dashboard, go to your backend service
   - Add environment variables:
     ```
     GEMINI_API_KEY=your-key-here
     ```

4. **Deploy**
   - Render automatically builds and deploys both services
   - Wait for deployment to complete (3-5 minutes)

5. **Access Your App**
   - Backend: `https://spur-assignment-backend.onrender.com`
   - Frontend: `https://spur-assignment-frontend.onrender.com`

**Note:** Free tier services sleep after 15 minutes of inactivity. First request may take 30-60 seconds to wake up.

---

## Option 3: Deploy to Vercel (Single URL)

Vercel hosts both the static SvelteKit frontend and the serverless API routes under `/api/*`.

### Steps (Repository Root)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Environment Variables (Project Settings)**
   ```
   GEMINI_API_KEY=your-key-here   # or OPENAI_API_KEY
   ```

4. **Database on Vercel**
   - Uses SQLite stored in `/tmp` (ephemeral). Data may reset on cold starts/redeploys.
   - For durability, provide `DATABASE_URL` (Postgres) and adapt the DB layer.

### Local Preview

Use Vercel dev to run both frontend and API together:
```bash
vercel dev
```

### Vercel Build Errors with better-sqlite3

If you see native build failures for `better-sqlite3` mentioning C++20, V8 API, or missing prebuilt binaries while Vercel uses Node 24, pin Node to 20.x:

1. Ensure the root `package.json` contains:
   ```json
   {
     "engines": { "node": "20.x" }
   }
   ```
2. Also set the backend `package.json` engines to `"20.x"`.
3. Redeploy from the repository root:
   ```bash
   vercel --prod
   ```

Why: Vercel may default to Node 24, which triggers a source build of `better-sqlite3` against newer V8 headers requiring C++20. Pinning to Node 20 uses available prebuilt binaries and avoids compilation.

### Monorepo Settings (IMPORTANT)

If you previously set the project Root Directory to `frontend`, Vercel will look for the build output inside `frontend/build` and ignore the root-level serverless `api/` directory. To deploy frontend and API together from this monorepo:

1. Project Root Directory: set to repository root `/` (not `frontend`).
2. Output Directory: `build`.
3. Build Command: `npm run build -w frontend`.
4. Functions: auto-detected from `/api/**/*.ts` (configured in `vercel.json`).

Symptoms when Root Directory is `frontend`:
- Build logs show `Wrote site to "../build"` but Vercel errors with "No Output Directory named \"build\"" because it searches in `frontend/build`.
- Serverless routes under `/api` are not deployed.

Alternative (if you must keep Root Directory = `frontend`):
- Move `api/` into `frontend/api/` and change the SvelteKit adapter output back to `build` (no `../`). This deploys, but splits code and is less clean for this repo.

---

## Option 4: Deploy with Docker

For VPS or any Docker-compatible platform (DigitalOcean, AWS, Google Cloud).

### Steps:

1. **Build Docker Image**
   ```bash
   docker build -t spur-assignment .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e GEMINI_API_KEY=your-key-here \
     -e NODE_ENV=production \
     -e CORS_ORIGIN=* \
     --name spur-app \
     spur-assignment
   ```

3. **Or use Docker Compose**
   Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - GEMINI_API_KEY=your-key-here
         - NODE_ENV=production
         - CORS_ORIGIN=*
       volumes:
         - ./backend/data:/app/backend/data
       restart: unless-stopped
   ```

   Deploy:
   ```bash
   docker-compose up -d
   ```

---

## Option 5: Heroku

### Steps:

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create spur-assignment
   ```

3. **Add Environment Variables**
   ```bash
   heroku config:set GEMINI_API_KEY=your-key-here
   heroku config:set NODE_ENV=production
   heroku config:set CORS_ORIGIN=*
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Open Your App**
   ```bash
   heroku open
   ```

---

## Post-Deployment Checklist

After deploying to any platform:

1. ✅ **Test Health Endpoint**
   ```bash
   curl https://your-backend-url/health
   ```

2. ✅ **Test Root Endpoint**
   ```bash
   curl https://your-backend-url/
   ```

3. ✅ **Test Chat API**
   ```bash
   curl -X POST https://your-backend-url/chat/message \
     -H "Content-Type: application/json" \
     -d '{"conversationId":"test-123","content":"Hello"}'
   ```

4. ✅ **Check Logs**
   - Railway: Check logs in dashboard
   - Render: View logs in service dashboard
   - Heroku: `heroku logs --tail`

5. ✅ **Monitor Performance**
   - Check response times
   - Monitor error rates
   - Watch memory usage

---

## Troubleshooting

### Common Issues:

1. **"Cannot connect to backend"**
   - Check CORS_ORIGIN is set correctly
   - Verify backend is running: `/health` endpoint
   - Check frontend PUBLIC_API_URL matches backend URL

2. **"Database errors"**
   - Ensure `data/` directory exists and is writable
   - For Docker, use volume mounting
   - For serverless, consider using PostgreSQL instead of SQLite

3. **"LLM errors"**
   - Verify GEMINI_API_KEY is set correctly
   - Check API quota in Google Cloud Console
   - Review backend logs for detailed errors

4. **"Build failures"**
   - Ensure Node.js version is 18+
   - Check all dependencies in package.json
   - Run `npm install` and `npm run build` locally first

---

## Production Best Practices

1. **Security**
   - Never commit `.env` files with real keys
   - Use platform-specific secret management
   - Set specific CORS_ORIGIN (not `*`) in production
   - Enable HTTPS (automatic on Railway, Render, Vercel)

2. **Database**
   - For production, consider PostgreSQL instead of SQLite
   - Regular backups if using SQLite
   - Use volume mounting in Docker

3. **Monitoring**
   - Set up error tracking (e.g., Sentry)
   - Monitor API usage and costs
   - Set up uptime monitoring (e.g., UptimeRobot)

4. **Performance**
   - Enable response caching
   - Use CDN for static assets
   - Consider Redis for session management

---

## Cost Estimates

- **Railway**: Free tier (512MB RAM, $5 credit/month), then ~$5-10/month
- **Render**: Free tier (limited, sleeps after 15min), paid starts at $7/month
- **Vercel**: Free tier generous for frontend, serverless backend limitations
- **Heroku**: ~$7/month (Eco plan), was free previously
- **DigitalOcean**: $4-6/month (droplet)

---

## Quick Deploy Commands Summary

```bash
# Railway
railway login
railway init
railway up

# Render
# Use render.yaml (already configured)

# Vercel
vercel --prod

# Heroku
heroku create
git push heroku main

# Docker
docker build -t spur-assignment .
docker run -p 3000:3000 -e GEMINI_API_KEY=your-key spur-assignment
```

---

For questions or issues, check the logs on your platform's dashboard first!
