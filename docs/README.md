# MicroCrop Platform Documentation

Welcome to the MicroCrop Platform documentation. This is the central documentation hub for the entire parametric crop insurance platform.

## 📚 Documentation Structure

### Project Components

Each component has its own comprehensive documentation:

- **[Dashboard](../dashboard/docs/README.md)** - Next.js 16 frontend with subdomain routing
- **[Backend](../backend/docs/README.md)** - Express.js REST API with integrations
- **[Data Processor](../data-processor/docs/README.md)** - Python FastAPI + Celery workers for data processing
- **[Smart Contracts](../Contracts/docs/README.md)** - Solidity contracts on Base L2
- **[CRE Workflow](../cre-workflow/README.md)** - Chainlink Functions automated workflows

### Root Documentation

#### Deployment (`docs/deployment/`)
Production deployment guides and configuration.

- **[Deployment Guide](deployment/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Quick Deploy](deployment/QUICK_DEPLOY.md)** - Fast deployment guide
- **[Railway Deploy](deployment/RAILWAY_DEPLOY.md)** - Deploy to Railway
- **[Managed Platform Deployment](deployment/MANAGED_PLATFORM_DEPLOYMENT.md)** - Managed platform setup
- **fly.toml** - Fly.io configuration
- **railway.json** - Railway configuration
- **render.yaml** - Render.com configuration

#### Implementation (`docs/implementation/`)
Technical implementation details and progress reports.

- **[Authentication Complete](implementation/AUTHENTICATION_COMPLETE.md)** - Auth system completion
- **[Authentication Flow Fixed](implementation/AUTHENTICATION_FLOW_FIXED.md)** - Auth flow fixes
- **[Backend Analysis](implementation/BACKEND_ANALYSIS.md)** - Backend architecture analysis
- **[Backend Subdomain Updates](implementation/BACKEND_SUBDOMAIN_UPDATES.md)** - Subdomain implementation
- **[Cleanup Complete](implementation/CLEANUP_COMPLETE.md)** - Code cleanup report
- **[Contract Review Complete](implementation/CONTRACT_REVIEW_COMPLETE.md)** - Smart contract review
- **[CRE Architecture](implementation/CRE_ARCHITECTURE.md)** - Chainlink Functions architecture
- **[CRE Implementation Summary](implementation/CRE_IMPLEMENTATION_SUMMARY.md)** - CRE completion
- **[Data Processor Analysis](implementation/DATA_PROCESSOR_ANALYSIS.md)** - Data processor architecture
- **[Environment & Errors Resolved](implementation/ENV_AND_ERRORS_RESOLVED.md)** - Environment fixes
- **[ERR_BLOCKED_BY_CLIENT Fix](implementation/ERR_BLOCKED_BY_CLIENT_FIX.md)** - CORS issue resolution
- **[ERR_BLOCKED_BY_CLIENT Resolution](implementation/ERR_BLOCKED_BY_CLIENT_RESOLUTION.md)** - Complete resolution
- **[Infrastructure Migration Complete](implementation/INFRASTRUCTURE_MIGRATION_COMPLETE.md)** - Infra migration
- **[Infrastructure Directory Analysis](implementation/INFRA_DIRECTORY_ANALYSIS.md)** - Infra analysis
- **[Subdomain Architecture Diagram](implementation/SUBDOMAIN_ARCHITECTURE_DIAGRAM.md)** - Subdomain design
- **[Subdomain Implementation Complete](implementation/SUBDOMAIN_IMPLEMENTATION_COMPLETE.md)** - Subdomain completion
- **[Subdomain Routing Update](implementation/SUBDOMAIN_ROUTING_UPDATE.md)** - Routing implementation

#### Integrations (`docs/integrations/`)
Third-party service integration documentation.

- **[Planet Labs Integration](integrations/PLANET_LABS_INTEGRATION.md)** - Satellite imagery integration
- **[Planet Integration Complete](integrations/PLANET_INTEGRATION_COMPLETE.md)** - Planet completion status
- **[Swypt Integration](integrations/swypt.md)** - Mobile payment integration
- **[WeatherXM Integration](integrations/weatherxm.md)** - Weather data integration

#### Guides (`docs/guides/`)
Getting started guides and quick references.

- **[Quick Start](guides/QUICK_START.md)** - Get started quickly
- **[Complete Checklist](guides/COMPLETE_CHECKLIST.md)** - Production readiness checklist
- **[CRE README](guides/README_CRE.md)** - Chainlink Functions guide
- **[Backend Context](guides/backend-context.md)** - Backend overview
- **[Contracts Context](guides/contracts.md)** - Smart contracts overview
- **[Data Processor Context](guides/data-processor.md)** - Data processor overview
- **[Frontend Context](guides/frontend.md)** - Frontend overview
- **[Infrastructure Context](guides/infra.md)** - Infrastructure overview

#### Archive (`docs/archive/`)
Deprecated and historical documentation.

- **infra-deprecated-20251201/** - Deprecated infrastructure documentation

## 🚀 Quick Start

1. **Choose Your Component**: Select the component you want to work with
2. **Read Component Docs**: Navigate to the component's docs folder
3. **Follow Setup Guide**: Each component has its own setup guide
4. **Deploy**: Use deployment guides for production deployment

## 🏗️ Platform Architecture

```
MicroCrop Platform
├── Dashboard (Next.js)          → Frontend UI
│   ├── network.* subdomain      → Cooperative portal
│   └── portal.* subdomain       → Admin portal
│
├── Backend (Express.js)         → REST API
│   ├── Farmer management
│   ├── Policy management
│   ├── Claim management
│   └── Integrations (IPFS, WeatherXM, Swypt)
│
├── Data Processor (Python)      → Background processing
│   ├── Satellite imagery analysis (Planet Labs)
│   ├── Weather data processing (WeatherXM)
│   ├── Damage assessment (ML/AI)
│   └── Automated verification
│
├── Smart Contracts (Solidity)   → On-chain insurance (Optional)
│   ├── Policy contracts (Base L2)
│   ├── Claim contracts (Base L2)
│   └── USDC integration
│
└── CRE Workflow (Chainlink)     → Automated workflows
    ├── Claim verification
    ├── Data aggregation
    └── Oracle integration
```

## 🔑 Key Features

### Off-Chain Core (Default Mode)
- Full-featured parametric insurance platform
- No blockchain required for core functionality
- Traditional database (PostgreSQL)
- API-based integrations

### On-Chain Extension (Optional)
- Smart contract-based insurance
- USDC payments on Base L2
- Decentralized claim verification
- Chainlink Functions automation

## 📊 Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: Radix UI + Tailwind CSS 4
- **State**: Zustand + TanStack Query
- **Auth**: JWT with role-based access

### Backend
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Storage**: Pinata/IPFS
- **Queue**: Redis + RabbitMQ

### Data Processing
- **Framework**: FastAPI (Python)
- **Workers**: Celery
- **ML/AI**: TensorFlow/PyTorch
- **Storage**: TimescaleDB + MinIO

### Blockchain (Optional)
- **Network**: Base L2
- **Token**: USDC
- **Framework**: Foundry (Solidity)
- **Oracles**: Chainlink Functions

## 🔗 External Integrations

### Satellite Imagery
- **Provider**: Planet Labs
- **Use Case**: Crop monitoring, damage detection
- **Data**: High-resolution satellite imagery, NDVI

### Weather Data
- **Provider**: WeatherXM
- **Use Case**: Weather-based triggers, claim verification
- **Data**: Real-time weather station data

### Mobile Payments
- **Provider**: Swypt
- **Use Case**: Farmer premium payments, payouts
- **Data**: USSD-based payment processing

### Decentralized Storage
- **Provider**: Pinata/IPFS
- **Use Case**: Document storage, evidence storage
- **Data**: Policy documents, claim evidence

## 🔐 Environment Variables

See each component's `.env.example` for specific variables:

- **Dashboard**: `dashboard/.env.example`
- **Backend**: `backend/.env.example`
- **Data Processor**: `data-processor/.env.example`
- **Contracts**: `Contracts/.env.example`
- **CRE Workflow**: `cre-workflow/.env.example`

## 🧪 Testing

Each component has its own testing approach:

- **Dashboard**: Jest + React Testing Library + Playwright (E2E)
- **Backend**: Jest + Supertest (API testing)
- **Data Processor**: Pytest + Coverage
- **Contracts**: Foundry test suite
- **CRE Workflow**: Chainlink simulation

## 🚀 Deployment Options

### Development
- Local development with Docker Compose
- Individual component development
- Hot reload enabled

### Staging
- Railway (recommended for staging)
- Render (full-stack deployment)
- Fly.io (global deployment)

### Production
- Vercel (Dashboard)
- Railway/Render (Backend + Data Processor)
- Base L2 (Smart Contracts)
- Managed PostgreSQL (Database)

## 📝 Documentation Standards

### Component Documentation
Each component maintains:
1. **README.md** - Overview and quick start
2. **docs/setup/** - Installation and configuration
3. **docs/implementation/** - Technical details
4. **docs/guides/** - How-to guides
5. **docs/api/** - API documentation (if applicable)

### Root Documentation
Central hub for:
1. **Cross-component** - Integration documentation
2. **Deployment** - Production deployment guides
3. **Architecture** - System design documentation
4. **Progress** - Implementation progress reports

## 🔄 Development Workflow

1. **Local Setup**: Set up all components locally
2. **Feature Development**: Work on individual components
3. **Integration Testing**: Test component interactions
4. **Staging Deployment**: Deploy to staging environment
5. **QA Testing**: Comprehensive testing on staging
6. **Production Deployment**: Deploy to production

## 📞 Support

For questions or issues:
1. Check component-specific documentation
2. Review integration guides
3. Check deployment documentation
4. Review implementation details

## 🎯 Project Status

**Current Version**: 1.0.0  
**Status**: Production Ready (95%)  
**Last Updated**: December 1, 2025

### Completion Status
- ✅ Dashboard: 100% (A grade)
- ✅ Backend: 100% (Fully functional)
- ✅ Data Processor: 100% (Workers operational)
- ✅ Smart Contracts: 90% (Ready for testnet)
- ✅ CRE Workflow: 100% (Automated verification)
- ⏳ Testing: 60% (Manual tests complete, automated tests pending)
- ⏳ Documentation: 100% (Comprehensive docs)

### Next Steps
1. Write automated tests (Jest + Playwright)
2. Deploy to staging environment
3. Complete security audit (smart contracts)
4. Deploy to production

## 🌟 Key Highlights

- **Modular Architecture**: Each component is independent
- **Blockchain Optional**: Works without blockchain
- **Automated Verification**: Chainlink Functions automation
- **Real-time Data**: Satellite + weather integration
- **Mobile-First**: USSD payment integration for farmers
- **Scalable**: Horizontal scaling support
- **Well-Documented**: 100+ documentation files

---

**Repository**: [Antismart/microcrop-setup](https://github.com/Antismart/microcrop-setup)  
**License**: Proprietary  
**Contact**: Project maintainers
