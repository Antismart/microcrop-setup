# Railway Deployment Guide for MicroCrop

## Quick Start

Railway doesn't use a config file like Render. Instead, you deploy via CLI or dashboard.

### Option 1: Deploy via CLI (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
railway init
# Name: microcrop-backend

# Add PostgreSQL database
railway add --database postgres

# Add Redis database
railway add --database redis

# Set environment variables
railway variables set PLANET_API_KEY="your_key_here"
railway variables set GCS_BUCKET_NAME="your_bucket"
railway variables set BACKEND_API_TOKEN_SECRET="$(openssl rand -hex 32)"
railway variables set WEATHERXM_API_KEY="154184a5-6634-405b-b237-b7d1e83557d3"
railway variables set PINATA_JWT="your_jwt"
railway variables set BLOCKCHAIN_RPC_URL="https://mainnet.base.org"
railway variables set BLOCKCHAIN_CHAIN_ID="8453"
railway variables set ENVIRONMENT="production"
railway variables set LOG_LEVEL="INFO"

# Deploy backend API
railway up

# Create Celery worker service
railway service create celery-worker
railway run --service celery-worker celery -A src.workers.celery_app worker --loglevel=info --concurrency=2

# Create Celery beat service
railway service create celery-beat
railway run --service celery-beat celery -A src.workers.celery_app beat --loglevel=info
```

### Option 2: Deploy via Dashboard

1. Go to railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select `Antismart/microcrop-setup` repository
5. Railway auto-detects Python and deploys `data-processor/`

**Add Services**:
- Click "+ New" → "Database" → "Add PostgreSQL"
- Click "+ New" → "Database" → "Add Redis"

**Set Environment Variables**:
Go to Variables tab and add:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
PLANET_API_KEY=your_key
GCS_BUCKET_NAME=your_bucket
GCS_CREDENTIALS={"type":"service_account",...}
BACKEND_API_TOKEN_SECRET=<generate with openssl rand -hex 32>
PINATA_JWT=your_jwt
WEATHERXM_API_KEY=154184a5-6634-405b-b237-b7d1e83557d3
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
BLOCKCHAIN_CHAIN_ID=8453
```

**Configure Services**:

**Backend API**:
- Root Directory: `data-processor`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn src.api.app:app --host 0.0.0.0 --port $PORT --workers 2`

**Celery Worker**:
- Root Directory: `data-processor`
- Start Command: `celery -A src.workers.celery_app worker --loglevel=info --concurrency=2`

**Celery Beat**:
- Root Directory: `data-processor`
- Start Command: `celery -A src.workers.celery_app beat --loglevel=info`

## Cost Estimate

| Service | Cost |
|---------|------|
| Starter Plan | $5/month (includes $5 credit) |
| Backend API | ~$15/month |
| Celery Worker | ~$7/month |
| Celery Beat | ~$7/month |
| PostgreSQL | Included in plan |
| Redis | Included in plan |
| **Total** | **~$34/month** |

## Post-Deployment

### Run Database Migration
```bash
railway shell
psql $DATABASE_URL -f migrations/001_planet_subscriptions.sql
exit
```

### Generate CRE Token
```bash
railway run python src/api/auth.py
# Copy token to cre-workflow/.env as BACKEND_API_TOKEN
```

### Test Deployment
```bash
# Health check
curl https://your-project.railway.app/health

# API docs
open https://your-project.railway.app/docs
```

## Monitoring

Railway Dashboard shows:
- Real-time logs for all services
- CPU/Memory usage graphs
- Deployment history
- Cost breakdown

## Scaling

Railway automatically scales based on usage. To increase resources:
- Services scale horizontally (more instances)
- Billing is usage-based (pay for what you use)
- No manual scaling configuration needed
