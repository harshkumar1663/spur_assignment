# 📋 Production Deployment Checklist

Use this checklist before and after deploying to production.

## Pre-Deployment

### Code & Configuration
- [ ] All code committed to Git repository
- [ ] `.env` files NOT committed (only `.env.example` files)
- [ ] `GEMINI_API_KEY` obtained from Google AI Studio
- [ ] Backend `package.json` has `"start": "node dist/index.js"` script
- [ ] Frontend adapter configured (adapter-auto for most platforms)
- [ ] Build succeeds locally: `npm run build`

### Environment Variables
- [ ] `GEMINI_API_KEY` added to deployment platform
- [ ] `NODE_ENV=production` set
- [ ] `PORT` configured (usually 3000)
- [ ] `HOST=0.0.0.0` set (for container deployments)
- [ ] `CORS_ORIGIN` set appropriately (`*` or specific URL)

### Security
- [ ] Sensitive data removed from code
- [ ] API keys stored in environment variables only
- [ ] CORS origin restricted in production (not `*` if possible)
- [ ] HTTPS enabled (automatic on most platforms)

## Deployment

### Platform Setup
- [ ] Account created on deployment platform
- [ ] GitHub/GitLab repository connected
- [ ] Build command configured: `npm install && npm run build`
- [ ] Start command configured: `npm start` or `cd backend && npm start`
- [ ] Environment variables added in platform dashboard

### Database
- [ ] SQLite data directory writable
- [ ] For Docker: volume mounted for persistence
- [ ] For serverless: consider PostgreSQL instead
- [ ] Backup strategy defined (if needed)

## Post-Deployment Testing

### Basic Health Checks
- [ ] Health endpoint responds: `GET /health`
- [ ] Root endpoint responds: `GET /`
- [ ] Response time < 2 seconds

### API Functionality
- [ ] Create new chat session works
- [ ] Send message receives AI response
- [ ] Load conversation history works
- [ ] Error handling returns proper status codes

### Frontend
- [ ] Frontend loads without errors
- [ ] Chat interface displays correctly
- [ ] Can send and receive messages
- [ ] Error messages display properly
- [ ] No console errors in browser

### Performance & Reliability
- [ ] Response times acceptable (< 3s for LLM responses)
- [ ] No memory leaks after 100+ requests
- [ ] Logs show proper info (not debug) level
- [ ] Error tracking/monitoring set up (optional)

## Test Commands

```bash
# Health check
curl https://your-app-url/health

# Root endpoint
curl https://your-app-url/

# Send a test message
curl -X POST https://your-app-url/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, can you help me?"
  }'

# Load conversation history
curl -X POST https://your-app-url/chat/history \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id-here"
  }'
```

## Monitoring Setup (Optional but Recommended)

- [ ] Error tracking (e.g., Sentry)
- [ ] Uptime monitoring (e.g., UptimeRobot, Pingdom)
- [ ] Log aggregation (e.g., Logtail, Papertrail)
- [ ] Performance monitoring (e.g., New Relic)
- [ ] Cost monitoring for LLM API usage

## Common Issues & Solutions

### Issue: "Cannot connect to backend"
**Solution**: 
- Check backend is running and accessible
- Verify `CORS_ORIGIN` includes your frontend URL
- Check network/firewall settings

### Issue: "Database errors"
**Solution**:
- Ensure data directory exists and is writable
- For Docker, use volume mounting: `-v ./data:/app/backend/data`
- Check disk space on server

### Issue: "LLM timeout or errors"
**Solution**:
- Verify `GEMINI_API_KEY` is correct and active
- Check API quota in Google Cloud Console
- Review rate limits

### Issue: "Build fails"
**Solution**:
- Ensure Node.js version is 18+
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check all dependencies are in package.json

### Issue: "App sleeps after inactivity" (Free tiers)
**Solution**:
- This is expected on free tiers (Render, Railway free)
- First request after sleep takes 30-60 seconds
- Upgrade to paid tier for always-on

## Rollback Plan

If deployment fails or has critical issues:

1. **Immediate**: Revert to previous deployment
   - Railway: Redeploy previous commit
   - Render: Rollback in dashboard
   - Vercel: Promote previous deployment

2. **Investigation**: Check logs for errors
   - Platform dashboard → Logs/Console
   - Look for startup errors, crashes, or exceptions

3. **Fix**: Address issues locally
   - Reproduce error in development
   - Fix and test thoroughly
   - Redeploy

## Success Criteria

Your deployment is successful when:

✅ Health endpoint returns 200 OK
✅ Chat messages receive AI responses
✅ Session persistence works across page reloads
✅ Error handling shows user-friendly messages
✅ Response times < 5 seconds for normal requests
✅ No critical errors in logs
✅ Frontend and backend communicate properly

## Post-Launch

- [ ] Monitor logs for first 24 hours
- [ ] Track error rates and response times
- [ ] Collect user feedback
- [ ] Document any issues and solutions
- [ ] Plan for scaling if needed

---

## Platform-Specific Notes

### Railway
- Auto-deploys on Git push
- Environment variables in Variables tab
- Logs in Deployments section
- Free tier: $5 credit/month

### Render
- Uses `render.yaml` blueprint
- Environment variables per service
- Free tier sleeps after 15min inactivity
- Paid tier: $7/month for always-on

### Vercel
- Best for frontend
- Backend as serverless functions (has limitations)
- Automatic HTTPS and CDN
- Environment variables in Settings

### Docker
- Requires port mapping: `-p 3000:3000`
- Volume mounting for data: `-v ./data:/app/backend/data`
- Environment variables: `-e KEY=value`
- Use docker-compose for easier management

---

**Date Deployed**: _________________

**Deployed By**: _________________

**Platform**: _________________

**Backend URL**: _________________

**Frontend URL**: _________________

**Notes**: _________________

