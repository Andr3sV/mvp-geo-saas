# Deployment Guide

## Prerequisites

- Railway account (or alternative hosting platform)
- Inngest account
- Supabase project
- API keys for AI providers

## Railway Deployment

### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository

### Step 2: Configure Root Directory

**Important**: Set the root directory to `backend-orchestrator/backend-orchestrator`

1. Go to Project Settings
2. Under "Root Directory", enter: `backend-orchestrator/backend-orchestrator`
3. Save changes

### Step 3: Configure Environment Variables

Go to Variables tab and add:

```env
# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers (At least one required)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CLAUDE_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Server (Optional)
PORT=3000
```

**Where to find**:
- Supabase: Project Settings → API
- OpenAI: https://platform.openai.com/api-keys
- Gemini: https://aistudio.google.com/app/apikey
- Claude: https://console.anthropic.com/settings/keys
- Perplexity: https://www.perplexity.ai/settings/api

### Step 4: Deploy

Railway will automatically:
1. Detect the Dockerfile
2. Build the Docker image
3. Deploy the container
4. Expose the service

Wait for deployment to complete (check Deployments tab).

### Step 5: Get Public URL

1. Go to Settings → Networking
2. Enable "Public Networking"
3. Copy the generated domain (e.g., `https://your-app.up.railway.app`)

## Inngest Setup

### Step 1: Create Inngest App

1. Go to [Inngest Dashboard](https://app.inngest.com)
2. Click "Create App"
3. Enter app name (e.g., "Prompt Analysis Orchestrator")

### Step 2: Sync Functions

1. Go to "Getting Started" → "Sync your app"
2. Enter your Railway URL: `https://your-app.up.railway.app/api/inngest`
3. Click "Sync app here"
4. Verify functions appear:
   - `schedule-daily-analysis`
   - `process-single-prompt`
   - `test-function`
   - `manual-schedule-analysis`

### Step 3: Verify Sync

1. Go to "Functions" tab
2. Click on a function
3. Verify it shows as "Synced" with green status

## Verification

### 1. Health Check

```bash
curl https://your-app.up.railway.app/
# Should return: "Prompt Analysis Orchestrator Running"
```

### 2. Test Function

In Inngest Dashboard:
1. Go to "Functions" → "test-function"
2. Click "Invoke"
3. Send event: `test/ping` with empty data
4. Check Runs tab for execution

### 3. Check Logs

In Railway:
1. Go to Deployments tab
2. Click on latest deployment
3. View logs for any errors

## Troubleshooting

### Functions Not Appearing

**Problem**: Functions don't show up after sync

**Solutions**:
1. Verify URL is correct: `https://your-domain.com/api/inngest`
2. Check Railway logs for errors
3. Verify all dependencies installed correctly
4. Check Inngest dashboard for sync errors

### "Not found" Error

**Problem**: Inngest returns "Not found" when syncing

**Solutions**:
1. Ensure endpoint is `/api/inngest` (not `/inngest`)
2. Check that server is running (health check works)
3. Verify Elysia server started correctly
4. Check Railway logs for startup errors

### Environment Variable Errors

**Problem**: Functions fail with "Missing environment variable"

**Solutions**:
1. Verify all required variables in Railway
2. Check variable names (case-sensitive)
3. Redeploy after adding variables
4. Check logs for specific missing variable

### Rate Limit Errors

**Problem**: Getting 429 errors from AI APIs

**Solutions**:
1. Check rate limits match your API tier
2. Reduce concurrency limit
3. Verify rate limiter is working (check logs)
4. Consider upgrading API tier

### Database Connection Errors

**Problem**: Can't connect to Supabase

**Solutions**:
1. Verify `SUPABASE_URL` is correct
2. Check `SUPABASE_SERVICE_ROLE_KEY` is valid
3. Verify Supabase project is active
4. Check network connectivity from Railway

## Production Checklist

- [ ] All environment variables configured
- [ ] Railway deployment successful
- [ ] Public URL accessible
- [ ] Health check endpoint works
- [ ] Inngest sync completed
- [ ] Functions visible in Inngest dashboard
- [ ] Test function executes successfully
- [ ] Cron schedule configured correctly
- [ ] Rate limits match API tier
- [ ] Concurrency limit matches Inngest plan
- [ ] Monitoring set up
- [ ] Logs accessible

## Alternative Deployment Platforms

### Fly.io

1. Install Fly CLI
2. Run `fly launch`
3. Configure environment variables
4. Deploy: `fly deploy`

### Render

1. Create new Web Service
2. Connect GitHub repository
3. Set root directory: `backend-orchestrator/backend-orchestrator`
4. Configure environment variables
5. Deploy

### AWS/GCP/Azure

Use container services:
- AWS ECS
- Google Cloud Run
- Azure Container Instances

Build and push Docker image to registry, then deploy to container service.

## Monitoring Production

### Railway Metrics

- CPU usage
- Memory usage
- Network traffic
- Request count

### Inngest Metrics

- Function execution count
- Success/failure rates
- Average execution time
- Event throughput

### Application Logs

Monitor for:
- Error patterns
- Rate limit hits
- Slow queries
- API failures

## Updating Deployment

### Rolling Updates

Railway automatically:
1. Builds new Docker image
2. Creates new container
3. Routes traffic to new container
4. Terminates old container

**Zero downtime** updates.

### Rollback

If deployment fails:
1. Go to Deployments tab
2. Find last working deployment
3. Click "Redeploy"

### Environment Variable Updates

1. Update variables in Railway
2. Redeploy service
3. Verify changes in logs

## Scaling

### Vertical Scaling (Railway)

1. Go to Settings → Resources
2. Increase CPU/Memory allocation
3. Restart service

### Horizontal Scaling

For multiple instances:
1. Deploy multiple services
2. Configure load balancer
3. Implement Redis-based rate limiting
4. Use connection pooling for database

## Backup & Recovery

### Database Backups

Supabase handles automatic backups. Configure retention in Supabase dashboard.

### Configuration Backup

Export environment variables:
```bash
# Save to secure location
railway variables export > env-backup.json
```

### Recovery Procedure

1. Restore database from backup (if needed)
2. Deploy service from latest commit
3. Restore environment variables
4. Verify functions sync with Inngest
5. Test with manual trigger

