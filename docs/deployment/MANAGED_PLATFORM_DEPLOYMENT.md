# MicroCrop Managed Platform Deployment Guide

**Last Updated**: December 1, 2025  
**Recommended Platforms**: Render, Railway, or Fly.io  
**Cost**: $50-150/month total (vs $593/month with Kubernetes)

---

## 🎯 Why Managed Platforms?

After refactoring to **Python FastAPI + Celery + Planet Labs**, we eliminated Kafka, RabbitMQ, and MinIO. This means:

✅ **No Kubernetes needed** - Platform handles orchestration  
✅ **Auto-scaling built-in** - Scales based on traffic  
✅ **Managed databases** - PostgreSQL, Redis included  
✅ **Zero DevOps overhead** - No K8s, no EKS, no node management  
✅ **71% cost reduction** - $50-150/month vs $593/month  

---

## 📊 Platform Comparison

| Feature | Render | Railway | Fly.io |
|---------|--------|---------|--------|
| **Best For** | Simple setup, good UI | Developer experience | Global edge deployment |
| **Cost/Month** | $70-120 | $50-100 | $80-150 |
| **PostgreSQL** | ✅ Managed | ✅ Managed | ✅ Managed (external) |
| **Redis** | ✅ Managed | ✅ Managed | ✅ Managed (Upstash) |
| **Auto-scaling** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Cron Jobs** | ✅ Yes | ⚠️ External (cron-job.org) | ✅ Machines |
| **Free Tier** | ✅ 750 hours/month | ✅ $5 credit/month | ✅ Limited |
| **TimescaleDB** | ⚠️ Extension manual | ⚠️ Extension manual | ⚠️ External (Timescale Cloud) |
| **Region** | US, EU | US, EU | Global (25+ regions) |

**Recommendation**: 
- **Render** - Easiest setup, best for getting started quickly
- **Railway** - Cheapest, great DX, good for MVP/staging
- **Fly.io** - Best for production with global users (Kenya + international)

---

## 🚀 Option 1: Deploy to Render (Recommended for Simplicity)

### Architecture on Render
```
┌─────────────────────────────────────────────────────────────┐
│                     Render Dashboard                         │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐    ┌────────┐    ┌────────┐
    │Backend │    │Celery  │    │Celery  │
    │  API   │    │Worker  │    │  Beat  │
    │FastAPI │    │(Tasks) │    │(Cron)  │
    └───┬────┘    └───┬────┘    └───┬────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │Postgres│  │ Redis  │  │ Timescale│
    │ (Render)│ │(Render)│  │  Cloud   │
    └────────┘  └────────┘  └──────────┘
```

### Step 1: Create PostgreSQL Database

**Option A: Render PostgreSQL** (Simple, but no TimescaleDB extension)
```bash
# In Render Dashboard:
1. New → PostgreSQL
2. Name: microcrop-db
3. Plan: Starter ($7/month) or Pro ($20/month)
4. Region: Oregon (closest to Kenya users via Cloudflare)
5. PostgreSQL Version: 15
```

**Option B: Timescale Cloud** (Recommended for time-series data)
```bash
# At cloud.timescale.com:
1. Create account
2. New Service → Time-series optimized
3. Plan: 2GB storage ($25/month)
4. Region: AWS us-east-1
5. Copy connection string: postgresql://user:pass@host:port/db?sslmode=require
```

### Step 2: Create Redis Instance

```bash
# In Render Dashboard:
1. New → Redis
2. Name: microcrop-redis
3. Plan: Starter ($7/month, 100MB) or Pro ($20/month, 1GB)
4. Maxmemory Policy: allkeys-lru (for caching)
5. Copy Redis URL: redis://red-xxxxx:6379
```

### Step 3: Deploy Backend API

**Create `render.yaml`** in project root:

```yaml
# render.yaml - Complete Render configuration
services:
  # Backend API (Python FastAPI)
  - type: web
    name: microcrop-backend-api
    runtime: python
    region: oregon
    plan: starter  # $7/month (upgrade to standard $25/month for production)
    branch: main
    rootDir: data-processor
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn src.api.app:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.10
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: microcrop-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: microcrop-redis
          property: connectionString
      - key: PLANET_API_KEY
        sync: false  # Set manually in dashboard
      - key: GCS_BUCKET_NAME
        sync: false
      - key: GCS_CREDENTIALS
        sync: false
      - key: BACKEND_API_TOKEN_SECRET
        generateValue: true  # Auto-generate secure secret
      - key: WEATHERXM_API_KEY
        value: 154184a5-6634-405b-b237-b7d1e83557d3
      - key: PINATA_JWT
        sync: false
      - key: BLOCKCHAIN_RPC_URL
        value: https://mainnet.base.org
      - key: BLOCKCHAIN_CHAIN_ID
        value: 8453
    healthCheckPath: /health
    autoDeploy: true

  # Celery Worker (Background tasks)
  - type: worker
    name: microcrop-celery-worker
    runtime: python
    region: oregon
    plan: starter  # $7/month
    branch: main
    rootDir: data-processor
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A src.workers.celery_app worker --loglevel=info --concurrency=2
    envVars:
      - key: PYTHON_VERSION
        value: 3.10
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: microcrop-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: microcrop-redis
          property: connectionString
      - key: CELERY_BROKER_URL
        fromService:
          type: redis
          name: microcrop-redis
          property: connectionString
      - key: CELERY_RESULT_BACKEND
        fromService:
          type: redis
          name: microcrop-redis
          property: connectionString
      - key: PLANET_API_KEY
        sync: false
      - key: GCS_BUCKET_NAME
        sync: false
      - key: GCS_CREDENTIALS
        sync: false
      - key: BACKEND_API_TOKEN_SECRET
        sync: false
    autoDeploy: true

  # Celery Beat (Scheduled tasks)
  - type: worker
    name: microcrop-celery-beat
    runtime: python
    region: oregon
    plan: starter  # $7/month
    branch: main
    rootDir: data-processor
    buildCommand: pip install -r requirements.txt
    startCommand: celery -A src.workers.celery_app beat --loglevel=info
    envVars:
      - key: PYTHON_VERSION
        value: 3.10
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: microcrop-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: microcrop-redis
          property: connectionString
      - key: CELERY_BROKER_URL
        fromService:
          type: redis
          name: microcrop-redis
          property: connectionString
      - key: PLANET_API_KEY
        sync: false
      - key: GCS_BUCKET_NAME
        sync: false
      - key: GCS_CREDENTIALS
        sync: false
    autoDeploy: true

databases:
  - name: microcrop-db
    databaseName: microcrop
    user: microcrop
    plan: starter  # $7/month (100GB storage)
    region: oregon
    ipAllowList: []  # Empty = allow all (Render services auto-whitelisted)
```

### Step 4: Deploy CRE Workflow

**Option A: Render Static Site** (if pre-built)
```yaml
# Add to render.yaml
  - type: web
    name: microcrop-cre-workflow
    runtime: static
    branch: main
    rootDir: cre-workflow
    buildCommand: bun install && bun run build
    staticPublishPath: ./dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

**Option B: External (Recommended)** - Deploy CRE to Chainlink DON
```bash
# CRE workflow runs on Chainlink's infrastructure, not Render
# Just needs BACKEND_API_URL environment variable
```

### Step 5: Deploy from GitHub

```bash
# 1. Push code to GitHub
git add .
git commit -m "Add Render deployment configuration"
git push origin main

# 2. In Render Dashboard:
- New → Blueprint
- Connect GitHub repository: Antismart/microcrop-setup
- Select render.yaml
- Click "Apply"

# 3. Set manual environment variables:
- PLANET_API_KEY: (from planet.com)
- GCS_BUCKET_NAME: your-bucket-name
- GCS_CREDENTIALS: {"type": "service_account", ...}
- PINATA_JWT: (from pinata.cloud)

# 4. Trigger deployment
- Render auto-deploys on git push
```

### Step 6: Run Database Migration

```bash
# Get shell access to backend service
render shell microcrop-backend-api

# Run migration
psql $DATABASE_URL -f migrations/001_planet_subscriptions.sql

# Exit
exit
```

### Step 7: Generate CRE Authentication Token

```bash
# In backend shell
python src/api/auth.py

# Copy output token
# Add to cre-workflow environment:
# BACKEND_API_TOKEN=eyJhbGc...
```

### Monthly Cost Breakdown (Render)

| Service | Plan | Cost |
|---------|------|------|
| Backend API | Starter (512MB RAM) | $7 |
| Celery Worker | Starter | $7 |
| Celery Beat | Starter | $7 |
| PostgreSQL | Starter (100GB) | $7 |
| Redis | Starter (100MB) | $7 |
| **OR** Timescale Cloud | 2GB storage | $25 |
| **Total (Render DB)** | | **$35/month** |
| **Total (Timescale DB)** | | **$53/month** |

**Production (upgrade plans)**:
| Service | Plan | Cost |
|---------|------|------|
| Backend API | Standard (2GB RAM) | $25 |
| Celery Worker | Standard | $25 |
| Celery Beat | Starter | $7 |
| PostgreSQL | Pro (256GB, HA) | $50 |
| Redis | Pro (1GB) | $20 |
| **Total** | | **$127/month** |

---

## 🚂 Option 2: Deploy to Railway (Cheapest)

### Architecture on Railway
```
Railway Project: microcrop
├── backend-api (Web)
├── celery-worker (Worker)
├── celery-beat (Worker)
├── postgres (Database)
└── redis (Database)
```

### Step 1: Install Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
railway init
# Project name: microcrop-backend
```

### Step 2: Create `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "uvicorn src.api.app:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 3: Add Services via CLI

```bash
# Add PostgreSQL
railway add --database postgres
# Creates DATABASE_URL automatically

# Add Redis
railway add --database redis
# Creates REDIS_URL automatically

# Link services
railway link

# Set environment variables
railway variables set PLANET_API_KEY=your_key_here
railway variables set GCS_BUCKET_NAME=your_bucket
railway variables set BACKEND_API_TOKEN_SECRET=$(openssl rand -hex 32)
railway variables set WEATHERXM_API_KEY=154184a5-6634-405b-b237-b7d1e83557d3
railway variables set BLOCKCHAIN_RPC_URL=https://mainnet.base.org
railway variables set BLOCKCHAIN_CHAIN_ID=8453

# Deploy backend API
railway up

# Add Celery worker
railway service create celery-worker
railway variables set SERVICE_NAME=celery-worker
railway run celery -A src.workers.celery_app worker --loglevel=info --concurrency=2

# Add Celery beat
railway service create celery-beat
railway run celery -A src.workers.celery_app beat --loglevel=info
```

### Step 4: Set Up Cron Jobs (for Celery Beat)

**Option A: Use cron-job.org** (Free, external)
```bash
# Create cron jobs at cron-job.org:
1. Every 6 hours: curl https://your-backend.railway.app/internal/tasks/check-subscriptions
2. Daily 2 AM: curl https://your-backend.railway.app/internal/tasks/fetch-biomass
3. Daily 3 AM: curl https://your-backend.railway.app/internal/tasks/cancel-expired
```

**Option B: Railway Cron Plugin** ($5/month)
```bash
railway plugin add cron
# Configure in Railway dashboard
```

### Monthly Cost Breakdown (Railway)

| Usage | Cost |
|-------|------|
| Starter Plan | $5/month (included $5 credit) |
| Backend API (~$0.02/hour) | ~$15/month |
| Celery Worker (~$0.01/hour) | ~$7/month |
| Celery Beat (~$0.01/hour) | ~$7/month |
| PostgreSQL (1GB storage) | Free (in $5 plan) |
| Redis (100MB) | Free (in $5 plan) |
| **Total** | **~$34/month** |

**With Timescale Cloud** (recommended):
- Railway services: $34/month
- Timescale Cloud: $25/month
- **Total: $59/month**

---

## ✈️ Option 3: Deploy to Fly.io (Best for Global Scale)

### Architecture on Fly.io
```
Fly.io Apps
├── microcrop-backend-api (Web, 3 regions)
├── microcrop-celery-worker (Machine)
└── microcrop-celery-beat (Machine)

External Services
├── Timescale Cloud (PostgreSQL)
├── Upstash Redis (Global edge)
└── Fly.io Volumes (optional)
```

### Step 1: Install Fly CLI

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
fly launch --no-deploy
# App name: microcrop-backend-api
# Region: Johannesburg (closest to Kenya)
```

### Step 2: Create `fly.toml`

```toml
# fly.toml - Backend API configuration
app = "microcrop-backend-api"
primary_region = "jnb"  # Johannesburg

[build]
  builder = "paketobuildpacks/builder:base"
  buildpacks = ["gcr.io/paketo-buildpacks/python"]

[env]
  PORT = "8000"
  ENVIRONMENT = "production"
  PYTHON_VERSION = "3.10"
  BLOCKCHAIN_RPC_URL = "https://mainnet.base.org"
  BLOCKCHAIN_CHAIN_ID = "8453"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  interval = "30s"
  timeout = "5s"
  grace_period = "10s"
  method = "GET"
  path = "/health"

[[services]]
  protocol = "tcp"
  internal_port = 8000

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[processes]
  app = "uvicorn src.api.app:app --host 0.0.0.0 --port 8000"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

[deploy]
  strategy = "rolling"
```

### Step 3: Set Up Databases

**PostgreSQL - Timescale Cloud** (Recommended)
```bash
# At cloud.timescale.com:
1. Create Time-series optimized service ($25/month)
2. Copy connection string
3. Set in Fly:
fly secrets set DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
```

**Redis - Upstash** (Global edge, generous free tier)
```bash
# At upstash.com:
1. Create Redis database (Global region)
2. Copy connection string
3. Set in Fly:
fly secrets set REDIS_URL="redis://user:pass@host:port"
```

### Step 4: Set Secrets

```bash
fly secrets set \
  PLANET_API_KEY="your_key" \
  GCS_BUCKET_NAME="your_bucket" \
  BACKEND_API_TOKEN_SECRET="$(openssl rand -hex 32)" \
  WEATHERXM_API_KEY="154184a5-6634-405b-b237-b7d1e83557d3" \
  PINATA_JWT="your_jwt"

# Secrets for GCS credentials (JSON)
fly secrets set GCS_CREDENTIALS='{"type":"service_account",...}'
```

### Step 5: Deploy Backend API

```bash
# Deploy to Johannesburg (closest to Kenya)
fly deploy --region jnb

# Scale to multiple regions (optional, for global users)
fly regions add iad  # US East (Virginia)
fly regions add ams  # Europe (Amsterdam)

# Scale instances
fly scale count 2  # Run 2 instances minimum
```

### Step 6: Deploy Celery Worker (Fly Machine)

```bash
# Create worker machine
fly machine run \
  --name celery-worker \
  --region jnb \
  --env ENVIRONMENT=production \
  --env CELERY_WORKER=true \
  --cmd "celery -A src.workers.celery_app worker --loglevel=info --concurrency=2" \
  --dockerfile Dockerfile

# Create beat machine
fly machine run \
  --name celery-beat \
  --region jnb \
  --env ENVIRONMENT=production \
  --env CELERY_BEAT=true \
  --cmd "celery -A src.workers.celery_app beat --loglevel=info" \
  --dockerfile Dockerfile
```

### Monthly Cost Breakdown (Fly.io)

| Service | Plan | Cost |
|---------|------|------|
| Backend API (2 instances, 512MB) | Shared CPU | ~$15/month |
| Celery Worker (1 instance) | Shared CPU | ~$7/month |
| Celery Beat (1 instance) | Shared CPU | ~$7/month |
| Timescale Cloud (2GB) | Time-series | $25/month |
| Upstash Redis (Global, 10K cmds/day) | Free tier | $0 |
| **Total** | | **~$54/month** |

**Production (multi-region)**:
| Service | Plan | Cost |
|---------|------|------|
| Backend API (6 instances, 3 regions) | Shared CPU | ~$45/month |
| Celery Workers (3 instances) | Shared CPU | ~$21/month |
| Celery Beat (1 instance) | Shared CPU | ~$7/month |
| Timescale Cloud (10GB, HA) | Time-series | $50/month |
| Upstash Redis (1M cmds/day) | Pro | $10/month |
| **Total** | | **~$133/month** |

---

## 🔄 Migration from Old Infrastructure

### What Changed?

**Old Architecture** (infra/ directory):
```
EKS Cluster → Node.js Backend → RabbitMQ → Kafka → MinIO
Cost: $593/month
```

**New Architecture** (managed platforms):
```
Managed Platform → Python Backend → Celery + Redis → Planet API
Cost: $50-150/month (71-87% savings)
```

### Services Removed
- ❌ Kubernetes (EKS) - $223/month saved
- ❌ RabbitMQ - $100/month saved
- ❌ Kafka - $200/month saved
- ❌ MinIO - $50/month saved

### Services Kept (Simplified)
- ✅ PostgreSQL → Timescale Cloud or managed DB
- ✅ Redis → Platform-managed or Upstash
- ✅ Backend API → Python FastAPI (was Node.js)
- ✅ Workers → Celery (was custom RabbitMQ consumers)

---

## 🌍 Recommended Architecture by Use Case

### Development/MVP (Start Here)
**Platform**: Railway  
**Cost**: $34-59/month  
**Why**: Cheapest, fastest setup, great DX  
```bash
railway up  # One command deployment
```

### Staging/Testing
**Platform**: Render  
**Cost**: $35-53/month  
**Why**: Free SSL, good UI, easy rollbacks  
```yaml
# render.yaml handles everything
```

### Production (Kenya + Global Users)
**Platform**: Fly.io  
**Cost**: $54-133/month  
**Why**: Global edge, multi-region, closest to Kenya (Johannesburg)  
```bash
# Deploy to 3 regions
fly regions add jnb iad ams
```

### Enterprise (100K+ Users)
**Platform**: Fly.io + Cloudflare  
**Cost**: $200-400/month  
**Why**: Auto-scaling, DDoS protection, global CDN  
```bash
# Scale automatically
fly autoscale set min=5 max=20
```

---

## 📋 Post-Deployment Checklist

### Backend API
- [ ] Health check responding: `curl https://your-backend.fly.dev/health`
- [ ] API docs accessible: `https://your-backend.fly.dev/docs`
- [ ] Database connected: Check logs for migration success
- [ ] Redis connected: Check cache operations
- [ ] Authentication working: Generate CRE token

### Celery Workers
- [ ] Worker processes running: Check platform logs
- [ ] Tasks executing: Monitor Celery logs
- [ ] Beat scheduler running: Check cron job execution
- [ ] Planet API calls working: Check subscription tasks
- [ ] Database writes successful: Verify biomass_data_cache

### CRE Workflow
- [ ] Backend API accessible: Test `/api/planet/biomass/{plot_id}`
- [ ] Authentication working: Test with internal token
- [ ] Damage calculation: Run `bun run simulate`
- [ ] Smart contract interaction: Verify payout submissions

### Monitoring
- [ ] Set up uptime monitoring: UptimeRobot or similar
- [ ] Configure error tracking: Sentry integration
- [ ] Set up alerts: Email/Slack for failures
- [ ] Monitor costs: Set budget alerts on platform

---

## 🆘 Troubleshooting

### Issue: `pip install` fails on Render
**Solution**: Add `runtime.txt` with Python version:
```bash
echo "python-3.10.0" > runtime.txt
git commit -am "Add Python runtime"
git push
```

### Issue: Database connection timeout
**Solution**: Check DATABASE_URL has `?sslmode=require`:
```bash
railway variables set DATABASE_URL="postgresql://...?sslmode=require"
```

### Issue: Celery tasks not running
**Solution**: Verify CELERY_BROKER_URL and CELERY_RESULT_BACKEND set:
```bash
# Should both point to Redis
echo $CELERY_BROKER_URL
echo $CELERY_RESULT_BACKEND
```

### Issue: Out of memory errors
**Solution**: Upgrade to larger instance:
```bash
# Render: Upgrade to Standard (2GB)
# Railway: Will auto-scale (pay per use)
# Fly.io: fly scale memory 1024
```

### Issue: CRE can't reach backend API
**Solution**: Verify BACKEND_API_URL and authentication token:
```bash
# In cre-workflow/.env
BACKEND_API_URL=https://your-backend.fly.dev
BACKEND_API_TOKEN=eyJhbGc...  # From python src/api/auth.py
```

---

## 🎯 Summary

| Platform | Best For | Cost | Complexity | Deploy Time |
|----------|----------|------|------------|-------------|
| **Render** | Getting started | $35-127 | ⭐ Easy | 10 min |
| **Railway** | MVP/Budget | $34-59 | ⭐⭐ Easy | 5 min |
| **Fly.io** | Production/Global | $54-133 | ⭐⭐⭐ Medium | 15 min |

**All platforms are 71-91% cheaper than Kubernetes ($593/month)**

### Quick Start Command

**Render**:
```bash
git add render.yaml
git commit -m "Add Render config"
git push
# Then connect in Render dashboard
```

**Railway**:
```bash
railway init
railway up
```

**Fly.io**:
```bash
fly launch
fly deploy
```

---

**Next Steps**:
1. Choose your platform (recommend starting with **Railway** for simplicity)
2. Create deployment config file (render.yaml, railway.json, or fly.toml)
3. Set up managed databases (Timescale Cloud + platform Redis)
4. Deploy backend API + workers
5. Run database migration
6. Generate CRE authentication token
7. Deploy CRE workflow with backend API URL
8. Test end-to-end: Policy → Weather + Biomass → Damage → Payout

**Total setup time**: 30-60 minutes  
**Monthly cost**: $34-133 (vs $593 with K8s)  
**Maintenance**: Near zero (platform handles everything)

🚀 **Ready to deploy!**
