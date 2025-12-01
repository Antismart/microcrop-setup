# MicroCrop - Parametric Crop Insurance Platform

Blockchain-powered parametric crop insurance for smallholder farmers in Kenya, using real-time weather data, satellite-based crop biomass monitoring, and automated smart contract payouts.

---

## 🌾 What Is MicroCrop?

MicroCrop provides automated crop insurance that:
- **Monitors** weather and crop health via WeatherXM and Planet Labs satellite data
- **Calculates** damage automatically using Chainlink CRE (Compute Runtime Environment)
- **Pays out** instantly via USDC smart contracts on Base blockchain
- **Protects** smallholder farmers from drought, floods, and crop failures

**No manual claims. No inspections. Just automatic protection.**

---

## 🏗️ Architecture

### Two-Backend System

MicroCrop uses a dual-backend architecture for clear separation of concerns:

```
┌────────────────────────────────────────────────────────────────┐
│                      User Interfaces                            │
│     Dashboard (Next.js)  │  USSD (Africa's Talking)            │
└──────────────┬───────────┴──────────────┬──────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│   Smart Contracts        │  │   Node.js Backend            │
│   (Base Blockchain)      │  │   (User-Facing APIs)         │
│                          │  │                              │
│ • PolicyManager          │  │ • USSD Interface            │
│ • Treasury               │  │ • Admin APIs                │
│ • PayoutReceiver         │  │ • Farmer Management         │
└──────────────┬───────────┘  │ • Payment (M-Pesa/Swypt)    │
               │              │ • Damage Assessment         │
               │              │ • Payout Processing         │
               │              └──────────────┬───────────────┘
               │                             │
               ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────────┐
│   Chainlink CRE          │  │   Python Data Processor      │
│   (Compute Runtime Env)  │◄─┤   (Data Processing APIs)     │
│                          │  │                              │
│ • Fetch Weather Data     │  │ • WeatherXM Integration     │
│ • Fetch Biomass Data     │  │ • Planet Labs Integration   │
│ • Calculate Damage       │  │ • Biomass Calculation       │
│ • Trigger Payout         │  │ • Time-series Caching       │
└──────────────────────────┘  │ • CRE Support APIs          │
                              └──────────────┬───────────────┘
                                             │
                              ┌──────────────┼──────────────┐
                              │              │              │
                              ▼              ▼              ▼
                         ┌────────┐    ┌────────┐    ┌────────┐
                         │Postgres│    │ Redis  │    │ Celery │
                         │(shared)│    │(shared)│    │Workers │
                         └────────┘    └────────┘    └────────┘
```

### Responsibilities

**Node.js Backend** (`backend/`)
- USSD interface for farmers
- Admin APIs for cooperatives
- M-Pesa payment processing
- Smart contract interactions
- Damage assessment (business logic)
- Payout processing (business logic)

**Python Data Processor** (`data-processor/`)
- Weather data fetching (WeatherXM)
- Satellite data processing (Planet Labs)
- Biomass proxy calculation
- Time-series data caching
- CRE workflow support APIs

---

## 🚀 Quick Deployment

### Recommended: Managed Platforms (No Kubernetes)

| Platform | Cost | Deploy Time | Best For |
|----------|------|-------------|----------|
| **Railway** | $34-59/mo | 5 min | MVP/Budget |
| **Render** | $35-127/mo | 10 min | Getting started |
| **Fly.io** | $54-133/mo | 15 min | Production/Global |

**Deploy to Railway** (Easiest):
```bash
railway login
railway init
railway up
```

**Deploy to Render**:
```bash
git push origin main  # render.yaml auto-deploys
```

**See**: [MANAGED_PLATFORM_DEPLOYMENT.md](./MANAGED_PLATFORM_DEPLOYMENT.md) for complete guides

---

## 📦 Repository Structure

```
microcrop-setup/
├── Contracts/                  # Smart contracts (Solidity, Foundry)
│   ├── src/                    # Contract source code
│   ├── test/                   # Contract tests
│   └── DEPLOYMENT_GUIDE.md     # Deployment instructions
│
├── cre-workflow/               # Chainlink CRE workflow (TypeScript)
│   ├── src/                    # CRE workflow code
│   └── README.md               # CRE documentation
│
├── backend/                    # Node.js backend (User-facing)
│   ├── src/
│   │   ├── api/                # USSD & Admin APIs
│   │   ├── services/           # Business logic
│   │   ├── workers/            # Background jobs (Bull)
│   │   └── config/             # Configuration
│   ├── render.yaml             # Render deployment
│   ├── DEPLOYMENT.md           # Deployment guide
│   └── BACKEND_CLEANUP_SUMMARY.md  # Architecture cleanup doc
│
├── data-processor/             # Python backend (Data processing)
│   ├── app/
│   │   ├── api/                # FastAPI endpoints
│   │   ├── services/           # Weather, Planet Labs
│   │   ├── workers/            # Celery workers
│   │   └── models/             # Database models
│   ├── render.yaml             # Render deployment
│   └── README.md               # Data processor docs
│
├── dashboard/                  # Farmer web app (Next.js)
│   ├── src/                    # Dashboard source
│   └── README.md               # Dashboard docs
│
├── infra-deprecated-20251201/  # Archived Kubernetes configs
│
├── render.yaml                 # Data processor Render config
├── fly.toml                    # Data processor Fly.io config
├── MANAGED_PLATFORM_DEPLOYMENT.md  # Complete deployment guide
└── BACKEND_ANALYSIS.md         # Backend architecture analysis
```

---

## 💰 Cost Comparison

### Infrastructure Costs

| Component | Kubernetes (Old) | Managed (New) | Savings |
|-----------|------------------|---------------|---------|
| **Node.js Backend** | Included in K8s | $20-31/mo | - |
| **Python Data Processor** | Included in K8s | $34-59/mo | - |
| **PostgreSQL** | $20/mo | $7-10/mo | 50-65% |
| **Redis** | $15/mo | $10/mo | 33% |
| **K8s Cluster** | $558/mo | $0 | 100% |
| **Total** | **$593/mo** | **$54-90/mo** | **82-91%** |

**Annual Savings**: $6,036-6,468/year

### Cost Breakdown by Platform

**Railway** (Cheapest):
- Node.js: $20/mo
- Python: $34/mo
- **Total: $54/month**

**Render** (Best Balance):
- Node.js: $31/mo
- Python: $59/mo
- **Total: $90/month**

**Fly.io** (Global Edge):
- Node.js: $24/mo
- Python: $54/mo
- **Total: $78/month**

---

## 📚 Documentation

### Deployment
- **[MANAGED_PLATFORM_DEPLOYMENT.md](./MANAGED_PLATFORM_DEPLOYMENT.md)** - Complete deployment guide (Render, Railway, Fly.io)
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - One-page quick start
- **[backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md)** - Node.js backend deployment
- **[data-processor/README.md](./data-processor/README.md)** - Python backend deployment

### Architecture
- **[BACKEND_ANALYSIS.md](./BACKEND_ANALYSIS.md)** - Two-backend architecture explained
- **[backend/BACKEND_CLEANUP_SUMMARY.md](./backend/BACKEND_CLEANUP_SUMMARY.md)** - Backend cleanup details
- **[INFRA_DIRECTORY_ANALYSIS.md](./INFRA_DIRECTORY_ANALYSIS.md)** - Why we archived Kubernetes
- **[INFRASTRUCTURE_MIGRATION_COMPLETE.md](./INFRASTRUCTURE_MIGRATION_COMPLETE.md)** - Migration summary

### Components
- **[Contracts/DEPLOYMENT_GUIDE.md](./Contracts/DEPLOYMENT_GUIDE.md)** - Smart contract deployment
- **[cre-workflow/README.md](./cre-workflow/README.md)** - Chainlink CRE setup
- **[dashboard/README.md](./dashboard/README.md)** - Frontend dashboard

---

## 🎯 Key Features

✅ **Fully Automated** - No manual claims  
✅ **Real-time Monitoring** - WeatherXM + Planet Labs  
✅ **Instant Payouts** - USDC on Base L2  
✅ **Cost-Effective** - 71-94% cheaper infrastructure  
✅ **Scalable** - Auto-scaling platforms  

---

**Built with ❤️ for smallholder farmers in Kenya**
