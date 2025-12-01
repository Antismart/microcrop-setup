# 🚀 Render Deployment Guide - MicroCrop Data Processor

## ✅ Fixed Issue: Docker Image Not Found

The deployment was failing with:
```
error: failed to solve: osgeo/gdal:ubuntu-full-3.8.3: not found
```

### ✅ What Was Fixed

1. **Removed GDAL Dependency**
   - Changed from: `osgeo/gdal:ubuntu-full-3.8.3` (unavailable/outdated)
   - Changed to: `python:3.11-slim-bookworm` (official, stable)
   - **Why**: You're using Planet Labs API, no raw satellite processing needed

2. **Simplified Dockerfile**
   - Removed unnecessary GDAL, GEOS, PROJ libraries
   - Minimal dependencies: just PostgreSQL client and build tools
   - Faster builds, smaller image size

---

## 🚀 Deployment Steps

### **Option 1: Deploy via Render Dashboard** (Recommended)

#### **Step 1: Create Web Service**

1. **Go to Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `Antismart/microcrop-setup`
4. Configure:
   ```
   Name: microcrop-data-processor
   Region: Oregon (or closest to your users)
   Branch: main
   Root Directory: data-processor
   Runtime: Docker
   Build Command: (leave empty - Docker handles it)
   Start Command: (leave empty - uses CMD from Dockerfile)
   Plan: Starter ($7/month)
   ```

#### **Step 2: Configure Environment Variables**

Add these in **Environment** tab:

```bash
# ============ Required - Application ============
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# ============ Required - Database ============
DATABASE_URL=postgresql://user:password@host:5432/database
TIMESCALE_URL=postgresql://user:password@host:5432/database

# ============ Required - Redis ============
REDIS_URL=redis://user:password@host:6379/0

# ============ Required - Celery ============
CELERY_BROKER_URL=redis://user:password@host:6379/1
CELERY_RESULT_BACKEND=redis://user:password@host:6379/2

# ============ Required - API Authentication ============
# Generate: openssl rand -hex 32
BACKEND_API_TOKEN_SECRET=your-secret-key-at-least-32-characters-long
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
ADMIN_EMAIL=admin@microcrop.io

# ============ Required - WeatherXM ============
WEATHERXM_API_KEY=your_weatherxm_api_key
WEATHERXM_API_URL=https://pro.weatherxm.com/api/v1

# ============ Required - Planet Labs ============
PLANET_API_KEY=your_planet_api_key
PLANET_API_URL=https://api.planet.com/data/v1
PLANET_SUBSCRIPTIONS_URL=https://api.planet.com/subscriptions/v1
GCS_BUCKET_NAME=your-gcs-bucket
GCS_CREDENTIALS={"type": "service_account", "project_id": "your-project"}

# ============ Required - IPFS (Pinata) ============
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=your-gateway.mypinata.cloud
API_KEY=your_pinata_api_key
API_SECRET=your_pinata_api_secret

# ============ Required - Blockchain ============
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
BLOCKCHAIN_CHAIN_ID=8453
POLICY_MANAGER_CONTRACT=0xYourPolicyManagerAddress
TREASURY_CONTRACT=0xYourTreasuryAddress

# ============ Optional - API Configuration ============
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
```

#### **Step 3: Create PostgreSQL Database** (If not already created)

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   ```
   Name: microcrop-db
   Plan: Starter ($7/month)
   PostgreSQL Version: 15
   ```
3. **Copy the Internal Database URL**
4. Use for both `DATABASE_URL` and `TIMESCALE_URL`

#### **Step 4: Create Redis Instance** (If not already created)

1. In Render Dashboard, click **"New +"** → **"Redis"**
2. Configure:
   ```
   Name: microcrop-redis
   Plan: Starter ($5/month)
   ```
3. **Copy the Internal Redis URL**
4. Use for `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` (with different db numbers)

---

### **Option 2: Deploy via Docker Compose** (Self-hosted)

If you want to deploy on your own server:

```bash
# Navigate to data-processor
cd data-processor

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 🔍 Verifying Deployment

### **Step 1: Check Health Endpoint**

```bash
curl https://your-data-processor.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-01T15:00:00.000Z",
  "database": "connected",
  "redis": "connected",
  "services": {
    "weather": "operational",
    "planet": "operational",
    "ipfs": "operational"
  }
}
```

### **Step 2: Check Logs**

In Render Dashboard:
1. Go to your service
2. Click **"Logs"** tab
3. Look for:
   ```
   INFO:     Application startup complete
   INFO:     Uvicorn running on http://0.0.0.0:8000
   Connected to database
   Connected to Redis
   ```

### **Step 3: Test API Endpoints**

```bash
# Test authentication
curl -X POST https://your-data-processor.onrender.com/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Test weather endpoint (with token)
curl https://your-data-processor.onrender.com/api/weather/stations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🐛 Troubleshooting Common Issues

### **Issue 1: Docker Build Fails - Base Image Not Found**

**Error**:
```
osgeo/gdal:ubuntu-full-3.8.3: not found
```

**Solution**: ✅ Already fixed! Now using `python:3.11-slim-bookworm`

If you see this error, ensure you've pulled the latest code:
```bash
git pull origin main
```

---

### **Issue 2: Database Connection Failed**

**Error**:
```
psycopg2.OperationalError: could not connect to server
```

**Solution**:
1. **Check DATABASE_URL format**:
   ```
   postgresql://user:password@host:port/database
   ```
2. **Ensure SSL is enabled** (Render PostgreSQL requires SSL):
   ```
   DATABASE_URL=postgresql://...?sslmode=require
   ```
3. **Use Internal Database URL** from Render

---

### **Issue 3: Redis Connection Failed**

**Error**:
```
redis.exceptions.ConnectionError: Error connecting to Redis
```

**Solution**:
1. **Check REDIS_URL format**:
   ```
   redis://default:password@host:port/0
   ```
2. **Verify Redis instance is running**
3. **Use Internal Redis URL** from Render

---

### **Issue 4: Planet Labs API Errors**

**Error**:
```
401 Unauthorized: Invalid API key
```

**Solution**:
1. **Verify Planet API key**: https://www.planet.com/account/
2. **Check key has proper permissions**:
   - Data API access
   - Subscriptions API access
3. **Ensure GCS credentials are valid JSON**

---

### **Issue 5: IPFS Upload Fails**

**Error**:
```
pinata.exceptions.PinataException: Unauthorized
```

**Solution**:
1. **Get Pinata JWT**: https://app.pinata.cloud/developers/api-keys
2. **Verify JWT has upload permissions**
3. **Check gateway URL** (no https://, just domain)

---

## 📊 Service Architecture

### **Main API Service** (Port 8000)
- FastAPI application
- REST endpoints for weather, biomass, plots
- JWT authentication
- Health checks

### **Celery Workers** (Background)
- Weather data processing
- Biomass data processing
- Damage assessment
- IPFS uploads

### **Celery Beat** (Scheduler)
- Scheduled weather updates
- Scheduled biomass checks
- Plot health monitoring

---

## 🔄 Deploy Multiple Services

If you want to run API and workers separately:

### **Service 1: API** (data-processor-api)
```
Name: microcrop-data-processor-api
Docker Command: uvicorn src.api.app:app --host 0.0.0.0 --port 8000
```

### **Service 2: Celery Worker** (data-processor-worker)
```
Name: microcrop-data-processor-worker
Docker Command: celery -A src.workers.celery_app worker --loglevel=info
Instance Type: Background Worker
```

### **Service 3: Celery Beat** (data-processor-scheduler)
```
Name: microcrop-data-processor-beat
Docker Command: celery -A src.workers.celery_app beat --loglevel=info
Instance Type: Background Worker
```

---

## 🔐 Security Best Practices

### **1. API Keys & Secrets**
- ✅ Never commit `.env` files
- ✅ Use Render's encrypted environment variables
- ✅ Rotate API keys every 90 days

### **2. Database Security**
- ✅ Use strong passwords
- ✅ Enable SSL connections
- ✅ Regular backups

### **3. API Security**
- ✅ JWT token authentication required
- ✅ Rate limiting enabled (1000 requests/minute)
- ✅ Input validation with Pydantic

### **4. CORS Configuration**
Update allowed origins in `src/api/app.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://microcrop-backend.onrender.com",
        "https://your-frontend.vercel.app",
    ],
)
```

---

## 📈 Scaling

### **Vertical Scaling** (More Resources)
1. Dashboard → Settings → Plan
2. Upgrade to **Standard** ($25/month) or **Pro** ($85/month)

### **Horizontal Scaling** (Multiple Instances)
1. Dashboard → Settings → Scaling
2. Increase **Instance Count**
3. Render handles load balancing

### **Worker Scaling**
Increase Celery worker concurrency:
```bash
CELERY_WORKER_CONCURRENCY=8
```

---

## 🔗 Connect to Backend

### **Update Backend Environment Variables**

In your backend service (Node.js):
```bash
DATA_PROCESSOR_URL=https://microcrop-data-processor.onrender.com
DATA_PROCESSOR_API_TOKEN=your_jwt_token_from_data_processor
```

### **Test Connection**

From backend:
```bash
curl https://microcrop-data-processor.onrender.com/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 Additional Resources

- [Render Docker Documentation](https://render.com/docs/docker)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Celery Production Guide](https://docs.celeryq.dev/en/stable/userguide/deployment.html)
- [Data Processor API Documentation](./docs/api/README.md)

---

## 🆘 Still Having Issues?

1. **Check Render Status**: https://status.render.com
2. **Review deployment logs**: Dashboard → Logs
3. **Test Docker build locally**:
   ```bash
   cd data-processor
   docker build -t data-processor .
   docker run -p 8000:8000 --env-file .env data-processor
   ```
4. **Contact Render Support**: https://render.com/support

---

**Last Updated**: December 1, 2025  
**Status**: ✅ Docker Image Fixed - Ready for Deployment  
**Note**: GDAL removed, using Planet Labs API for biomass data
