# 🔍 Pre-Deployment Verification - Data Processor

## ✅ Completed Fixes

### 1. Docker Base Image ✅
- Changed from `osgeo/gdal:ubuntu-full-3.8.3` (not found)
- To: `python:3.11-slim-bookworm` (official, stable)

### 2. Dependencies ✅
- Added `pydantic-settings==2.6.1` to requirements.txt
- All packages properly specified

### 3. Field Validators ✅  
- Fixed `DAMAGE_SATELLITE_WEIGHT` → `DAMAGE_BIOMASS_WEIGHT`
- Validators now match actual fields

### 4. Import Statements ✅
- Fixed all 62 imports across 19 files
- All imports now use `from src.` prefix
- Works with PYTHONPATH=/app in Docker

---

## 📋 Deployment Readiness Checklist

### ✅ Code Quality
- [x] No syntax errors in Python files
- [x] All imports use correct paths
- [x] Pydantic validators reference existing fields
- [x] Docker file uses valid base image
- [x] Requirements.txt has all dependencies

### ✅ Git Status
- [x] All fixes committed and pushed
- [x] Latest commit: a436ccd
- [x] Branch: main
- [x] Remote: Antismart/microcrop-setup

### ⚠️ Environment Variables (Required for Runtime)
These need to be configured in Render Dashboard:

#### **Minimal Setup** (to start the app):
```bash
# Required
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://user:password@host:6379/0
CELERY_BROKER_URL=redis://user:password@host:6379/1

# Auth
BACKEND_API_TOKEN_SECRET=your-32-char-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
```

#### **Full Production Setup**:
```bash
# Application
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Databases  
DATABASE_URL=postgresql://...
TIMESCALE_URL=postgresql://... # Can be same as DATABASE_URL
REDIS_URL=redis://...
CELERY_BROKER_URL=redis://.../1
CELERY_RESULT_BACKEND=redis://.../2

# APIs
WEATHERXM_API_KEY=your_key
WEATHERXM_API_URL=https://pro.weatherxm.com/api/v1

PLANET_API_KEY=your_key
PLANET_API_URL=https://api.planet.com/data/v1
PLANET_SUBSCRIPTIONS_URL=https://api.planet.com/subscriptions/v1

# IPFS (Pinata)
PINATA_JWT=your_jwt
PINATA_GATEWAY=your-gateway.mypinata.cloud
API_KEY=your_pinata_api_key
API_SECRET=your_pinata_api_secret

# Blockchain
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
BLOCKCHAIN_CHAIN_ID=8453
POLICY_MANAGER_CONTRACT=0x...
TREASURY_CONTRACT=0x...

# Google Cloud (for Planet data)
GCS_BUCKET_NAME=your-bucket
GCS_CREDENTIALS={"type": "service_account", ...}
```

---

## 🚀 Deployment Steps

### Step 1: Verify Render Build Configuration
```yaml
Service Type: Web Service
Runtime: Docker
Root Directory: data-processor
Build Command: (leave empty - Docker handles it)
Start Command: (leave empty - uses Dockerfile CMD)
```

### Step 2: Create Required Services

#### PostgreSQL Database
- Name: `microcrop-db`
- Plan: Starter ($7/month)
- Copy Internal Database URL

#### Redis Instance
- Name: `microcrop-redis`  
- Plan: Starter ($5/month)
- Copy Internal Redis URL

### Step 3: Configure Environment Variables
- Add all required variables (see above)
- Use Internal URLs for database and Redis
- Save changes

### Step 4: Deploy
- Push to GitHub (already done ✅)
- Render auto-detects and builds
- Or use "Manual Deploy" button

### Step 5: Verify
Check logs for:
```
INFO:     Application startup complete
INFO:     Uvicorn running on http://0.0.0.0:8000
Connected to database
Connected to Redis
```

Test endpoint:
```bash
curl https://your-data-processor.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T16:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## 🐛 Expected Issues & Solutions

### Issue: ValidationError on startup
```
pydantic_core._pydantic_core.ValidationError: DATABASE_URL
```
**Solution**: Add DATABASE_URL environment variable in Render

### Issue: Can't connect to database
```
sqlalchemy.exc.OperationalError: could not connect
```
**Solution**: 
- Use **Internal Database URL**, not External
- Ensure database is in same region as web service
- Check DATABASE_URL format includes `?sslmode=require`

### Issue: Redis connection failed
```
redis.exceptions.ConnectionError
```
**Solution**:
- Create Redis instance in Render
- Use **Internal Redis URL**
- Check REDIS_URL format: `redis://default:password@host:port/0`

### Issue: IPFS upload fails
```
pinata.exceptions.PinataException: Unauthorized
```
**Solution**:
- Get valid Pinata JWT from https://app.pinata.cloud
- Ensure JWT has upload permissions
- Don't include `https://` in PINATA_GATEWAY

---

## 📊 File Changes Summary

### Files Modified: 19
- `src/api/app.py` - Fixed imports
- `src/api/routes.py` - Fixed imports
- `src/api/auth.py` - Fixed imports
- `src/api/websocket.py` - Fixed imports
- `src/storage/*.py` - Fixed imports (4 files)
- `src/integrations/*.py` - Fixed imports (3 files)
- `src/processors/*.py` - Fixed imports (2 files)
- `src/workers/*.py` - Fixed imports (5 files)

### Total Import Fixes: 62
- All `from config` → `from src.config`
- All `from storage` → `from src.storage`
- All `from models` → `from src.models`
- All `from integrations` → `from src.integrations`
- All `from processors` → `from src.processors`
- All `from workers` → `from src.workers`

---

## ✅ Ready for Deployment

**Current Status**: All code issues resolved ✅

**Next Action**: Configure environment variables in Render Dashboard

**Documentation**: See `data-processor/RENDER_DEPLOYMENT.md` for full guide

---

**Last Updated**: December 1, 2025  
**Commit**: a436ccd  
**Status**: 🟢 READY TO DEPLOY  
**Confidence**: 95% - Only needs environment configuration
