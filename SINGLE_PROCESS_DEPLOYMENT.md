# 🎯 Single Process Deployment - Changes Summary

## What Changed?

Your project has been updated to run **both frontend and backend from a single process**, making it perfect for deployment platforms that provide only one terminal/process (Railway, Render, Heroku, etc.).

## Architecture Overview

### Before (Two Processes)
- ❌ Frontend: Separate SvelteKit server
- ❌ Backend: Fastify API server
- ❌ Problem: Most free-tier platforms only support one process

### After (Single Process) ✅
- ✅ Backend: Fastify server that serves BOTH:
  - API routes (`/chat/*`, `/health`)
  - Frontend static files (HTML, CSS, JS)
- ✅ Solution: One process = Easy deployment everywhere!

## How It Works

### Development Mode (`npm run dev`)
- Frontend runs on port 5173 (Vite dev server with hot reload)
- Backend runs on port 3000 (Fastify API)
- Frontend proxies `/api/*` requests to backend
- **You still get fast hot reload in development!**

### Production Mode (`npm start`)
1. Build process:
   - Frontend builds to `frontend/build/` (static files)
   - Backend builds to `backend/dist/` (compiled TypeScript)

2. Runtime:
   - Only backend starts (Fastify on port 3000)
   - Backend serves API routes: `/chat/*`, `/health`
   - Backend serves frontend files: `/`, `/index.html`, `/assets/*`
   - **Everything from one URL!**

## Files Modified

### 1. **backend/package.json**
- Added: `@fastify/static` dependency

### 2. **backend/src/index.ts**
- Added: Static file serving in production
- Added: SPA fallback routing (serves index.html for non-API routes)
- Logic: Only activates when `NODE_ENV=production`

### 3. **frontend/svelte.config.js**
- Changed: `adapter-auto` → `adapter-static`
- Reason: Builds to static files that Fastify can serve

### 4. **frontend/src/lib/api.ts**
- Updated: Uses relative URLs in production (same origin)
- Updated: Uses `/api` proxy in development

### 5. **package.json** (root)
- Added: `postinstall` script for dependency management
- Updated: Build order (frontend first, then backend)

### 6. Deployment Configs
- **railway.json**: Simplified to `npm start`
- **render.yaml**: Single service configuration
- **Procfile**: Changed to `npm start`
- **Dockerfile**: Builds both, runs one process

## Commands

### Development
```bash
npm run dev        # Runs both frontend & backend separately
npm run dev:backend
npm run dev:frontend
```

### Production Build
```bash
npm run build      # Builds frontend → then backend
```

### Production Start
```bash
npm start          # Starts only backend (serves everything)
```

## Deployment URLs

With this setup, you get **ONE URL** for everything:

```
https://your-app.railway.app/          → Frontend UI
https://your-app.railway.app/chat/message  → Backend API
https://your-app.railway.app/health    → Health check
```

No more CORS issues! Same origin for frontend and backend.

## Environment Variables Simplified

### Required
```bash
GEMINI_API_KEY=your-key-here
NODE_ENV=production
```

### Optional (auto-set by platforms)
```bash
PORT=3000              # Auto-set by Railway, Render, etc.
HOST=0.0.0.0          # For container deployments
```

### Removed (no longer needed)
```bash
❌ CORS_ORIGIN         # Same origin, no CORS needed
❌ PUBLIC_API_URL      # Same origin, no separate URL
```

## Testing Locally

### Test Development Mode
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

### Test Production Mode
```bash
# Build everything
npm run build

# Start in production mode
NODE_ENV=production npm start

# Visit: http://localhost:3000
# Both UI and API work from same URL!
```

## Deployment Steps (Simplified)

1. **Install dependencies** (if not already done):
   ```bash
   cd backend
   npm install @fastify/static
   cd ..
   npm install
   ```

2. **Commit changes**:
   ```bash
   git add .
   git commit -m "Single process deployment"
   git push
   ```

3. **Deploy to Railway** (or any platform):
   - Connect GitHub repo
   - Add `GEMINI_API_KEY` env var
   - That's it! Platform runs `npm install && npm run build && npm start`

4. **Access your app**:
   - Visit your platform URL (e.g., `https://yourapp.railway.app`)
   - Everything works from one URL!

## Benefits

✅ **Simpler Deployment**: One service instead of two  
✅ **Lower Costs**: One dyno/instance instead of two  
✅ **No CORS Issues**: Same origin for frontend and backend  
✅ **Easier URLs**: One domain instead of two  
✅ **Faster**: No cross-origin requests in production  
✅ **Better Security**: No CORS wildcards needed  

## Development Experience

**No changes to your development workflow!**

- Still get hot reload for frontend (Vite dev server)
- Still get auto-restart for backend (tsx watch)
- Still use `npm run dev` like before
- Production build is automatic

## Rollback

If you need to revert to separate services:

1. Change `frontend/svelte.config.js` back to `adapter-auto`
2. Remove static file serving from `backend/src/index.ts`
3. Update deployment configs to deploy separately
4. Add `CORS_ORIGIN` and `PUBLIC_API_URL` back

But you won't need to - this setup is better for most use cases!

## Next Steps

1. ✅ Install the new dependency: `cd backend && npm install`
2. ✅ Test locally: `npm run build && NODE_ENV=production npm start`
3. ✅ Commit and push: `git add . && git commit -m "Deploy" && git push`
4. ✅ Deploy to Railway/Render following QUICKSTART.md

---

**Questions?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions!
