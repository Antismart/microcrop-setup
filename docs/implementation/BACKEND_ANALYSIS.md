# Backend Directory Analysis - USSD & Dashboard Requirements

**Date**: December 1, 2025  
**Context**: Analyzing backend/ directory for USSD (farmers) and Dashboard (cooperatives/admins)

---

## 🎯 Key Insight

The `backend/` directory is a **Node.js/Express backend** that is **DIFFERENT** from `data-processor/` (Python FastAPI backend). Here's the breakdown:

### Two Separate Backends! ⚠️

1. **`data-processor/`** (Python FastAPI)
   - **Purpose**: Weather & satellite data processing for CRE workflow
   - **Users**: Chainlink CRE (internal only)
   - **Stack**: Python 3.10, FastAPI, Celery, TimescaleDB
   - **Status**: ✅ Recently refactored and ready to deploy

2. **`backend/`** (Node.js/Express) 
   - **Purpose**: Farmer-facing USSD app + Admin/Coop dashboard APIs
   - **Users**: Farmers (via USSD), Cooperatives, Admins (via web dashboard)
   - **Stack**: Node.js 18, Express.js, Prisma, PostgreSQL, RabbitMQ, Redis
   - **Status**: ⚠️ Needs review - may overlap with data-processor

---

## 📊 Backend Directory Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── ussd.controller.js        # USSD flow handler
│   │   │   ├── farmer.controller.js      # Farmer profile/plots
│   │   │   ├── policy.controller.js      # Policy CRUD
│   │   │   ├── claim.controller.js       # Claims management
│   │   │   ├── admin.controller.js       # Admin operations
│   │   │   ├── auth.controller.js        # Authentication
│   │   │   └── payment.controller.js     # M-Pesa via Swypt
│   │   ├── routes/
│   │   │   ├── ussd.routes.js            # POST /api/ussd
│   │   │   ├── farmer.routes.js          # /api/farmer/*
│   │   │   ├── policy.routes.js          # /api/policy/*
│   │   │   ├── claim.routes.js           # /api/claim/*
│   │   │   ├── admin.routes.js           # /api/admin/*
│   │   │   ├── auth.routes.js            # /api/auth/*
│   │   │   └── payment.routes.js         # /api/payment/*
│   │   └── middlewares/
│   │       ├── auth.middleware.js        # JWT verification
│   │       └── role.middleware.js        # Role-based access
│   ├── services/
│   │   ├── ussd.service.js               # USSD business logic
│   │   ├── africastalking.service.js     # Africa's Talking integration
│   │   ├── swypt.service.js              # M-Pesa payments
│   │   ├── weather.service.js            # WeatherXM integration
│   │   ├── satellite.service.js          # Satellite data
│   │   └── blockchain.service.js         # Smart contract calls
│   ├── workers/
│   │   ├── index.js                      # Worker entry point
│   │   ├── weather.worker.js             # Weather data fetching
│   │   ├── satellite.worker.js           # Satellite processing
│   │   └── claim.worker.js               # Claim processing
│   ├── models/                           # Prisma models
│   ├── config/                           # Configuration
│   ├── utils/                            # Utilities
│   └── server.js                         # Express app
├── prisma/
│   └── schema.prisma                     # Database schema
├── package.json                          # Node.js dependencies
├── docker-compose.yml                    # Local services
└── README.md                             # Backend documentation
```

---

## 🔍 What Does This Backend Do?

### 1. USSD Interface for Farmers 📱

**Service Code**: `*384*12345#` (Africa's Talking)

**Features**:
- ✅ Farmer registration (name, ID, county, sub-county)
- ✅ Buy insurance via USSD menu
- ✅ Check policy status
- ✅ View claim status
- ✅ Add new plots
- ✅ M-Pesa payment integration (Swypt)

**Flow Example**:
```
Farmer dials: *384*12345#
  ↓
Welcome to MicroCrop Insurance!
1. Buy Insurance
2. Check Policy
3. Claim Status
4. My Account
5. Add Plot
  ↓
Farmer selects plot, coverage, pays via M-Pesa
  ↓
Policy created on-chain
```

**Key Files**:
- `USSD_FLOW.md` - Complete USSD flow documentation
- `src/api/controllers/ussd.controller.js` - USSD handler
- `src/services/africastalking.service.js` - SMS/USSD integration

### 2. Admin & Cooperative Dashboard APIs 🖥️

**Purpose**: Web dashboard for cooperatives and administrators

**Admin Features**:
- View all policies
- Manage claims (approve/reject)
- View farmer profiles
- Monitor weather data
- Manage payouts
- System analytics

**Cooperative Features**:
- Onboard farmers
- Purchase bulk policies
- Track claims for members
- View aggregated data

**Key Routes**:
- `POST /api/admin/policies` - Create bulk policies
- `GET /api/admin/claims` - List all claims
- `PATCH /api/admin/claims/:id/approve` - Approve claim
- `GET /api/admin/analytics` - System metrics
- `GET /api/farmer/:id` - Farmer profile

### 3. Payment Integration (M-Pesa) 💰

**Provider**: Swypt (M-Pesa API wrapper)

**Features**:
- STK Push for policy payments
- Payment verification
- Refunds (for claim payouts in KES)
- Transaction history

**Key Files**:
- `SWYPT_INTEGRATION.md` - Swypt documentation
- `src/services/swypt.service.js` - Payment service

### 4. Weather & Satellite Data 🌦️

**Weather**: WeatherXM API integration  
**Satellite**: Spexi (old) → Need to integrate Planet Labs

**Purpose**: 
- Fetch weather data for farmer locations
- Track rainfall, temperature, humidity
- Store historical data for claims

**Note**: This overlaps with `data-processor/` - needs consolidation!

---

## ⚠️ Overlap Analysis: Backend vs Data-Processor

### Weather Data Fetching

**Backend (Node.js)**:
- `src/services/weather.service.js` - Fetches WeatherXM data
- `src/workers/weather.worker.js` - Background weather fetching
- Stores in PostgreSQL via Prisma

**Data-Processor (Python)**:
- `src/integrations/weatherxm_client.py` - Fetches WeatherXM data
- `src/workers/weather_tasks.py` - Celery tasks for weather
- Stores in TimescaleDB

**Verdict**: ❌ **DUPLICATE** - Need to consolidate

### Satellite Data

**Backend (Node.js)**:
- `src/services/satellite.service.js` - Old Spexi integration
- `src/workers/satellite.worker.js` - Process images

**Data-Processor (Python)**:
- `src/integrations/planet_client.py` - Planet Labs integration
- `src/workers/planet_tasks.py` - Celery tasks for biomass

**Verdict**: ⚠️ **Backend is OUTDATED** - Use data-processor Planet integration

### Smart Contract Interaction

**Backend (Node.js)**:
- `src/services/blockchain.service.js` - Ethers.js integration
- Creates policies, reads policy data

**Data-Processor (Python)**:
- Uses Web3.py for read-only queries
- CRE workflow handles payout submissions

**Verdict**: ✅ **BOTH NEEDED** - Backend creates policies, CRE handles payouts

---

## 🎯 Recommended Architecture

### Keep Both Backends, But Clarify Roles

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                 │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Farmers   │  │ Cooperatives │  │     Admins      │   │
│  │   (USSD)    │  │  (Dashboard) │  │  (Dashboard)    │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬────────┘   │
└─────────┼────────────────┼────────────────────┼────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend (Node.js/Express)                       │
│            Primary User-Facing Backend                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     USSD     │  │  Farmer API  │  │  Admin API   │     │
│  │ Africa's     │  │  REST/Graph  │  │  REST/Graph  │     │
│  │  Talking     │  │     QL       │  │     QL       │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
│  ┌────────────────────────┼──────────────────────┐         │
│  │ Services               │                      │         │
│  │  • M-Pesa (Swypt)      │                      │         │
│  │  • SMS (Africa's Talking)                    │         │
│  │  • Policy Creation (Smart Contracts)          │         │
│  │  • Farmer Management                          │         │
│  └───────────────────────────────────────────────┘         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │   PostgreSQL (Prisma ORM)   │
            │  • Farmers                  │
            │  • Policies                 │
            │  • Claims                   │
            │  • Plots                    │
            │  • Transactions             │
            └─────────────────────────────┘
                          │
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│           Data-Processor (Python/FastAPI)                    │
│           Backend API for CRE Workflow                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Weather    │  │    Biomass   │  │   Internal   │     │
│  │  WeatherXM   │  │ Planet Labs  │  │     API      │     │
│  │     API      │  │     API      │  │  (CRE only)  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
│  ┌────────────────────────┼──────────────────────┐         │
│  │ Celery Workers         │                      │         │
│  │  • Fetch weather data (daily)                 │         │
│  │  • Fetch biomass data (daily)                 │         │
│  │  • Monitor subscriptions                      │         │
│  └───────────────────────────────────────────────┘         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │ TimescaleDB (Time-Series)   │
            │  • Weather observations     │
            │  • Biomass data cache       │
            │  • Subscription history     │
            └─────────────────────────────┘
                          │
                          │ HTTP API
                          ▼
            ┌─────────────────────────────┐
            │   Chainlink CRE Workflow    │
            │  • Fetch weather + biomass  │
            │  • Calculate damage         │
            │  • Submit payouts           │
            └─────────────────────────────┘
```

---

## ✅ What Each Backend Should Do

### Backend (Node.js) - **User-Facing**

**KEEP** ✅:
- USSD interface for farmers (Africa's Talking)
- Farmer registration and profile management
- Policy purchase flow (user-initiated)
- Admin dashboard APIs
- Cooperative dashboard APIs
- M-Pesa payment integration (Swypt)
- SMS notifications
- Farmer plot management
- Policy metadata storage (PostgreSQL + Prisma)

**REMOVE/DEPRECATE** ❌:
- Weather data fetching workers (use data-processor)
- Satellite image processing (use data-processor Planet integration)
- Damage calculation (handled by CRE workflow)
- Automated claim processing (handled by CRE workflow)

**UPDATE** ⚠️:
- Keep `blockchain.service.js` for policy creation
- Call `data-processor` API for weather/biomass data (when needed for UI)
- Remove RabbitMQ workers (use simpler job queue or cron)

### Data-Processor (Python) - **CRE Workflow Support**

**KEEP** ✅:
- WeatherXM data fetching (Celery tasks)
- Planet Labs biomass monitoring (Celery tasks)
- Internal API endpoints (CRE only)
- TimescaleDB for time-series data
- JWT authentication for CRE workflow

**ADD** 🆕:
- Read-only API endpoints for backend (weather/biomass data for UI)
- Policy status endpoint (read from smart contracts)

---

## 📋 Migration Plan

### Phase 1: Consolidate Weather Data (Week 1)

**Action**: Remove weather workers from Node.js backend

1. **Delete** from backend/:
   - `src/workers/weather.worker.js`
   - `src/services/weather.service.js` (keep wrapper for API calls)

2. **Update** backend to call data-processor:
   ```javascript
   // src/services/weather.service.js (new)
   const axios = require('axios');
   
   class WeatherService {
     async getPlotWeather(plotId) {
       // Call data-processor API
       const response = await axios.get(
         `${process.env.DATA_PROCESSOR_URL}/api/weather/${plotId}`,
         { headers: { Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}` } }
       );
       return response.data;
     }
   }
   ```

3. **Add** to data-processor:
   ```python
   # src/api/routes/weather.py
   @router.get("/weather/{plot_id}")
   async def get_plot_weather(
       plot_id: int,
       days: int = 30,
       current_user: Dict = Depends(get_current_user)  # Allow backend access
   ):
       # Return weather data for UI display
       return await weather_service.get_plot_weather(plot_id, days)
   ```

### Phase 2: Update Satellite Integration (Week 2)

**Action**: Remove old Spexi integration, use Planet Labs

1. **Delete** from backend/:
   - `src/workers/satellite.worker.js`
   - `src/services/satellite.service.js`

2. **Update** backend to call data-processor:
   ```javascript
   // src/services/biomass.service.js (new)
   class BiomassService {
     async getPlotBiomass(plotId) {
       const response = await axios.get(
         `${process.env.DATA_PROCESSOR_URL}/api/planet/biomass/${plotId}`,
         { headers: { Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN}` } }
       );
       return response.data;
     }
   }
   ```

### Phase 3: Simplify Backend Infrastructure (Week 3)

**Action**: Remove RabbitMQ, simplify job queue

1. **Remove** RabbitMQ:
   - Delete RabbitMQ from `docker-compose.yml`
   - Remove `amqplib` from `package.json`
   - Delete `src/workers/index.js` (worker system)

2. **Replace** with simple cron jobs (if needed):
   ```javascript
   // src/jobs/index.js
   const cron = require('node-cron');
   
   // Daily policy status sync (if needed)
   cron.schedule('0 0 * * *', async () => {
     await syncPolicyStatuses();
   });
   ```

3. **Or** use Bull (simpler Redis-based queue):
   ```javascript
   const Queue = require('bull');
   const notificationQueue = new Queue('notifications', process.env.REDIS_URL);
   
   // Process SMS notifications
   notificationQueue.process(async (job) => {
     await sendSMS(job.data);
   });
   ```

### Phase 4: Deploy Both Backends (Week 4)

**Backend (Node.js)**:
```bash
# Deploy to Render/Railway/Fly.io
# Smaller instance (USSD + API is lightweight)
# Cost: $7-25/month
```

**Data-Processor (Python)**:
```bash
# Already configured for deployment
# See render.yaml, fly.toml, RAILWAY_DEPLOY.md
# Cost: $34-59/month
```

**Total**: $41-84/month for both backends

---

## 💰 Cost Impact of Two Backends

### Option A: Keep Both (Recommended)

| Service | Provider | Monthly Cost |
|---------|----------|--------------|
| **Backend (Node.js)** | Railway Starter | $7-15 |
| **Data-Processor (Python)** | Railway | $34-59 |
| PostgreSQL (shared) | Railway | Included |
| Redis (shared) | Railway | Included |
| **Total** | | **$41-74/month** |

**Benefits**:
- USSD works out of the box
- Admin dashboard APIs ready
- Farmer management + M-Pesa integrated
- Separate scaling (USSD vs data processing)

### Option B: Merge Into Python (Complex)

**Challenges**:
- Africa's Talking SDK is Python (exists, but less mature)
- USSD flow is complex state machine (easier in Node.js with existing code)
- M-Pesa Swypt integration (would need rewrite)
- Prisma ORM vs SQLAlchemy (different patterns)
- 2-3 weeks of rewrite work

**Benefit**:
- One backend (saves $7-15/month)

**Verdict**: ❌ Not worth the effort for $7-15/month savings

---

## 🚀 Recommended Action Plan

### Immediate (This Week)

1. ✅ **Keep both backends** (Node.js + Python)
2. ✅ **Define clear responsibilities**:
   - Node.js: USSD, farmer management, admin APIs, M-Pesa
   - Python: Weather/biomass data processing, CRE support
3. ✅ **Remove duplicate workers** from Node.js backend
4. ✅ **Update Node.js to call data-processor APIs** for weather/biomass

### Short-term (This Month)

1. Deploy Node.js backend to Railway/Render ($7-15/month)
2. Configure Africa's Talking USSD webhook → Node.js backend
3. Test USSD flow end-to-end
4. Deploy admin dashboard (Next.js) → Vercel (free)
5. Connect dashboard to Node.js backend APIs

### Long-term (Next 3 Months)

1. Remove RabbitMQ from Node.js backend
2. Optimize job queues (use Bull with Redis)
3. Add read-only weather/biomass endpoints to data-processor for UI
4. Monitor costs and performance
5. Scale independently as needed

---

## 📝 Files to Create/Update

### 1. Backend Deployment Config

**Create**: `backend/render.yaml`
```yaml
services:
  - type: web
    name: microcrop-backend-ussd
    runtime: node
    plan: starter  # $7/month
    buildCommand: npm install && npm run prisma:generate
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: microcrop-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: microcrop-redis
          property: connectionString
      - key: DATA_PROCESSOR_URL
        value: https://microcrop-data-processor.fly.dev
      - key: INTERNAL_API_TOKEN
        sync: false  # Set manually
      - key: AFRICASTALKING_API_KEY
        sync: false
      - key: SWYPT_API_KEY
        sync: false
```

### 2. Update Backend README

**Update**: `backend/README.md`
```markdown
# MicroCrop Backend (Node.js)

## Purpose
User-facing backend for:
- USSD interface (farmers)
- Admin dashboard APIs
- Cooperative dashboard APIs
- M-Pesa payment integration
- Farmer profile management

## Architecture
This backend focuses on user interactions.
Weather/satellite data processing is handled by `data-processor/` (Python).

## Dependencies
- Node.js 18+
- PostgreSQL (via Prisma)
- Redis (for sessions + job queue)
- Africa's Talking (USSD/SMS)
- Swypt (M-Pesa payments)

## Deployment
See `backend/DEPLOYMENT.md` for deployment instructions.
```

### 3. Backend Deployment Guide

**Create**: `backend/DEPLOYMENT.md`
- Railway deployment steps
- Environment variables
- USSD webhook configuration
- Testing guide

---

## ✅ Summary

### Key Decisions

1. **Keep both backends** ✅
   - Node.js: USSD + farmer/admin APIs
   - Python: Weather/biomass processing + CRE support

2. **Remove duplicate functionality** ❌
   - Delete weather/satellite workers from Node.js
   - Call data-processor APIs instead

3. **Simplify infrastructure** ⚠️
   - Remove RabbitMQ from Node.js backend
   - Use simple cron or Bull (Redis-based queue)

4. **Deploy independently** 🚀
   - Node.js: Railway/Render ($7-15/month)
   - Python: Already configured ($34-59/month)
   - Total: $41-74/month

### Next Steps

1. ⏳ Review backend/ code in detail
2. ⏳ Remove duplicate workers
3. ⏳ Create backend deployment configs
4. ⏳ Test USSD flow
5. ⏳ Deploy both backends
6. ⏳ Connect admin dashboard

**Ready to proceed with backend consolidation!** 🎯
