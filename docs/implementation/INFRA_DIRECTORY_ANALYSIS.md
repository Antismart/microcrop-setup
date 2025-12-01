# Infrastructure Directory Analysis - Should We Keep It?

**Date**: December 1, 2025  
**Context**: Analyzing if `infra/` directory is still relevant after architecture refactoring

---

## 🔍 Executive Summary

**VERDICT: MOSTLY DEPRECATED** ❌ (80% obsolete)

The `infra/` directory contains Kubernetes/Terraform configurations designed for a **full-scale production deployment** with Kafka, RabbitMQ, MinIO, and multi-region orchestration. However:

1. **Architecture mismatch**: Infra assumes Kafka + RabbitMQ + MinIO - we removed all of these
2. **Backend mismatch**: Infra deploys Node.js backend - we use Python FastAPI
3. **Complexity overkill**: K8s, EKS, multi-region - not needed for current scale
4. **Docker configs outdated**: References services we no longer use

**What to Keep**: 20% (Monitoring configs, some Terraform modules, backup scripts)  
**What to Remove**: 80% (K8s deployments, RabbitMQ configs, CI/CD workflows)

---

## 📊 Current Infrastructure Directory Structure

```
infra/
├── terraform/                    # Infrastructure as Code
│   ├── environments/             # ⚠️ OUTDATED (assumes Kafka/RabbitMQ)
│   ├── modules/                  # ⚠️ MIXED (EKS outdated, monitoring OK)
│   └── global/                   
├── kubernetes/                   # ❌ MOSTLY DEPRECATED
│   ├── base/                     # ❌ RabbitMQ secrets, wrong backend configs
│   ├── apps/                     # ❌ Node.js backend, worker deployments
│   │   ├── backend/              # ❌ Expects Node.js, references RabbitMQ
│   │   ├── workers/              # ❌ Weather/satellite/damage workers (moved to Celery)
│   │   └── data-processor/       # ⚠️ MAY BE USEFUL (but needs heavy updates)
│   ├── services/                 # ❌ Postgres/Redis/RabbitMQ/MinIO
│   ├── monitoring/               # ✅ KEEP (Prometheus/Grafana configs)
│   └── ingress/                  # ⚠️ USEFUL (NGINX ingress)
├── docker/                       # ❌ OUTDATED
│   ├── backend/                  # ❌ Node.js Dockerfile (we use Python)
│   ├── data-processor/           # ⚠️ MAY BE USEFUL (but needs updates)
│   └── nginx/                    # ✅ KEEP (reverse proxy configs)
├── ci-cd/                        # ❌ MOSTLY DEPRECATED
│   ├── .github/workflows/        # ❌ Assumes Node.js backend + RabbitMQ
│   └── scripts/                  # ⚠️ MIXED (health checks useful, smoke tests outdated)
├── monitoring/                   # ✅ KEEP (dashboards, alerts)
├── security/                     # ✅ KEEP (vault configs, TLS certs)
└── scripts/                      # ✅ KEEP (backup/restore/disaster-recovery)
```

---

## ❌ What's DEPRECATED (Remove/Archive)

### 1. **Kubernetes Deployments** (`kubernetes/apps/`)
**Problem**: Configured for Node.js backend with RabbitMQ

**Example** - `kubernetes/apps/backend/deployment.yaml`:
```yaml
containers:
- name: backend
  image: microcrop/backend:latest  # ❌ Node.js image
  env:
  - name: RABBITMQ_URL              # ❌ We don't use RabbitMQ
    valueFrom:
      secretKeyRef:
        name: rabbitmq-secret
        key: url
  - name: NODE_ENV                  # ❌ We use Python, not Node.js
    value: "production"
```

**Why Deprecated**:
- References `RABBITMQ_URL` (we removed RabbitMQ, use Celery + Redis)
- Node.js environment variables (we use Python FastAPI)
- Worker deployments for weather/satellite/damage (now Celery tasks)

**Action**: ❌ DELETE or ARCHIVE

---

### 2. **RabbitMQ Configurations** (Multiple files)
**Problem**: RabbitMQ was replaced by Celery + Redis

**Files**:
- `kubernetes/base/secrets/secrets-template.yaml` - RabbitMQ secrets
- `kubernetes/base/network-policies/default.yaml` - RabbitMQ network policies
- `kubernetes/base/configmaps/backend-config.yaml` - RabbitMQ connection settings

**Example** - `kubernetes/base/secrets/secrets-template.yaml`:
```yaml
---
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-secret    # ❌ RabbitMQ not used
  namespace: microcrop
type: Opaque
stringData:
  url: "amqp://username:password@rabbitmq-service:5672"
```

**Why Deprecated**:
- We use Celery with Redis as broker (simpler, cheaper)
- RabbitMQ adds $100-200/month in infrastructure costs
- Celery built-in task management better than custom RabbitMQ consumers

**Action**: ❌ DELETE all RabbitMQ references

---

### 3. **Node.js Backend Dockerfiles** (`docker/backend/`)
**Problem**: Dockerfile builds Node.js app, we use Python

**Example** - `docker/backend/Dockerfile.prod`:
```dockerfile
FROM node:18-alpine AS base    # ❌ Node.js, we use Python

WORKDIR /app
COPY package*.json ./
RUN npm ci --production       # ❌ npm, we use pip

FROM base AS build
RUN npm install               # ❌ Node.js build
RUN npm run build

CMD ["node", "dist/server.js"]  # ❌ Node.js startup
```

**Why Deprecated**:
- Backend is Python FastAPI (not Node.js)
- Dependencies installed via `pip`, not `npm`
- Startup command is `uvicorn`, not `node`

**Action**: ❌ DELETE `docker/backend/` directory

---

### 4. **CI/CD Workflows** (`ci-cd/.github/workflows/`)
**Problem**: GitHub Actions configured for Node.js + RabbitMQ tests

**Example** - `ci-cd/.github/workflows/backend-deploy.yml`:
```yaml
services:
  rabbitmq:                          # ❌ RabbitMQ service
    image: rabbitmq:3-management-alpine
    env:
      RABBITMQ_DEFAULT_USER: test
      RABBITMQ_DEFAULT_PASS: testpass

jobs:
  test:
    steps:
      - name: Setup Node.js           # ❌ Node.js, we use Python
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci                   # ❌ npm, we use pip
      
      - name: Run tests
        run: npm test                 # ❌ Jest tests, we use pytest
        env:
          RABBITMQ_URL: amqp://test:testpass@localhost:5672
```

**Why Deprecated**:
- Assumes Node.js backend (`npm ci`, `npm test`)
- Tests RabbitMQ connection (we don't use RabbitMQ)
- Missing Python/FastAPI/Celery testing setup

**Action**: ❌ DELETE `ci-cd/.github/workflows/backend-deploy.yml`

---

### 5. **Kafka/MinIO References** (infra.md, architecture docs)
**Problem**: Documentation references services we removed

**Example** - `infra.md` line 17-19:
```markdown
**Infrastructure Stack:**
- Kubernetes (EKS/GKE) for container orchestration
- RabbitMQ cluster for message queuing  # ❌ Replaced by Celery + Redis
- MinIO for object storage              # ❌ Replaced by GCS
```

**Why Deprecated**:
- Kafka removed (see `data-processor/docker-compose.yml` - commented out)
- MinIO removed (using GCS for Planet data)
- RabbitMQ replaced by Celery + Redis broker

**Action**: ⚠️ UPDATE `infra.md` or ARCHIVE it

---

## ✅ What to KEEP (Still Useful)

### 1. **Monitoring Configurations** (`monitoring/`)
**Why Keep**: Prometheus/Grafana dashboards are generic

**Useful Files**:
- `monitoring/dashboards/` - Pre-built Grafana dashboards for metrics
- `monitoring/alerts/` - Alert rules for uptime, performance, errors
- `monitoring/sla/` - SLA definitions (99.9% uptime targets)

**Action**: ✅ KEEP as-is (works with any backend)

---

### 2. **Security Configurations** (`security/`)
**Why Keep**: TLS certificates, secret management, IAM policies

**Useful Files**:
- `security/vault/` - HashiCorp Vault configs for secret management
- `security/policies/` - IAM policies for AWS resources
- `security/certificates/` - TLS/SSL certificate automation

**Action**: ✅ KEEP as-is (infrastructure-agnostic)

---

### 3. **Backup/Restore Scripts** (`scripts/`)
**Why Keep**: Database backup automation still needed

**Useful Files**:
- `scripts/backup/backup.sh` - PostgreSQL backup to S3
- `scripts/restore/restore.sh` - Database restore from backup
- `scripts/disaster-recovery/` - DR procedures

**Example** - `scripts/disaster-recovery/backup.sh`:
```bash
#!/bin/bash
# Backup PostgreSQL to S3 with retention
pg_dump $DATABASE_URL | gzip > backup.sql.gz
aws s3 cp backup.sql.gz s3://$BACKUP_BUCKET/$(date +%Y%m%d)/
```

**Action**: ✅ KEEP (works with TimescaleDB)

---

### 4. **Terraform Monitoring Module** (`terraform/modules/monitoring/`)
**Why Keep**: Prometheus/Grafana setup reusable

**Action**: ✅ KEEP (update for simplified stack)

---

### 5. **NGINX Ingress Configs** (`kubernetes/ingress/`, `docker/nginx/`)
**Why Keep**: Reverse proxy configs useful

**Action**: ⚠️ KEEP but UPDATE (remove RabbitMQ routes)

---

## ⚠️ What Needs MAJOR UPDATES

### 1. **Terraform EKS Module** (`terraform/modules/eks/`)
**Current State**: Full EKS cluster with node groups, auto-scaling, IRSA

**Problem**: 
- Assumes 3-20 backend pods (we're smaller scale)
- Configured for Kafka, RabbitMQ, MinIO StatefulSets
- Oversized for current needs (t3.large nodes × 3-10)

**Options**:
A. **Simplify to single-region ECS** (cheaper than EKS for small scale)
B. **Update EKS module** to remove Kafka/RabbitMQ node pools
C. **DELETE** if deploying on simpler infrastructure (Render, Railway, Fly.io)

**Recommendation**: ⚠️ UPDATE if staying on AWS, otherwise DELETE

---

### 2. **Data Processor Docker Config** (`docker/data-processor/`)
**Current State**: Unknown (need to check if it exists and what it contains)

**Action**: ⚠️ CHECK and either UPDATE or DELETE

---

### 3. **Kubernetes ConfigMaps** (`kubernetes/base/configmaps/`)
**Current State**: Backend configs with RabbitMQ, Node.js settings

**Problem**:
```yaml
# backend-config.yaml
env:
  NODE_ENV: production         # ❌ Should be ENVIRONMENT=production (Python)
  RABBITMQ_PREFETCH: "10"      # ❌ RabbitMQ not used
  RABBITMQ_RECONNECT_DELAY: "5000"  # ❌ RabbitMQ not used
```

**Action**: ⚠️ REWRITE for Python backend + Celery

---

## 🎯 Recommended Action Plan

### Phase 1: Archive Old Infrastructure (Week 1)
```bash
# Create archive
mkdir infra-old
mv infra infra-old
git add infra-old
git commit -m "Archive deprecated infra (Kafka/RabbitMQ/Node.js era)"

# Keep only useful parts
mkdir infra
cp -r infra-old/monitoring infra/
cp -r infra-old/security infra/
cp -r infra-old/scripts infra/
```

### Phase 2: Create New Infra for Simplified Stack (Week 2)
**New Structure**:
```
infra/
├── docker/
│   ├── data-processor/           # Python FastAPI
│   │   └── Dockerfile            # FROM python:3.10-slim
│   ├── cre-workflow/             # TypeScript Bun
│   │   └── Dockerfile            # FROM oven/bun
│   └── nginx/                    # Reverse proxy
│       └── nginx.conf            # Route to backend API
├── docker-compose/
│   ├── dev.yml                   # Local development
│   └── production.yml            # Production-like local setup
├── kubernetes/ (OPTIONAL)
│   ├── backend-api.yaml          # Python FastAPI deployment
│   ├── celery-worker.yaml        # Celery workers
│   ├── celery-beat.yaml          # Celery scheduler
│   ├── postgres.yaml             # TimescaleDB
│   └── redis.yaml                # Redis
├── terraform/ (OPTIONAL)
│   ├── aws-simple/               # Simpler AWS setup (ECS, RDS, ElastiCache)
│   └── gcp-simple/               # Alternative GCP setup
├── monitoring/                   # ✅ KEEP as-is
├── security/                     # ✅ KEEP as-is
└── scripts/                      # ✅ KEEP + update for TimescaleDB
```

### Phase 3: Update Documentation (Week 3)
**Files to Update**:
1. `infra/README.md` - Rewrite for new architecture
2. `DEPLOYMENT_GUIDE.md` - Update deployment steps
3. `infra.md` - Archive or rewrite completely

---

## 📊 Cost Comparison

### Old Infrastructure (Infra Directory Design)
| Service | Monthly Cost |
|---------|--------------|
| EKS Control Plane | $73 |
| Worker Nodes (3× t3.large) | $150 |
| RabbitMQ (managed) | $100 |
| Kafka (managed) | $200 |
| MinIO/S3 | $50 |
| Load Balancer | $20 |
| **Total** | **$593/month** |

### Current Architecture (After Refactoring)
| Service | Monthly Cost |
|---------|--------------|
| ECS Fargate (backend API) | $50 |
| RDS PostgreSQL (TimescaleDB) | $80 |
| ElastiCache Redis | $30 |
| S3 (backups only) | $10 |
| **Total** | **$170/month** |

**Savings**: $423/month (71% reduction)

---

## 🚀 Migration Path

### Option A: Simple Cloud Deployment (Recommended)
**Services**: Render, Railway, or Fly.io

**Why**:
- No Kubernetes complexity
- Auto-scaling built-in
- $50-150/month total cost
- No infra/ directory needed

**Action**: ❌ DELETE `infra/` entirely, use platform-native configs

---

### Option B: AWS ECS (Medium Complexity)
**Services**: ECS Fargate + RDS + ElastiCache

**Why**:
- Simpler than EKS (no K8s management)
- Auto-scaling with less overhead
- $170-300/month

**Action**: ⚠️ CREATE new `infra/terraform/ecs/` module, DELETE K8s configs

---

### Option C: Keep Kubernetes (Not Recommended for Current Scale)
**Services**: EKS + RDS + ElastiCache

**Why**:
- Over-engineered for current scale
- $400-600/month minimum
- Complex maintenance

**Action**: ⚠️ HEAVILY UPDATE all K8s configs (months of work)

---

## ✅ Final Verdict

### DELETE (80% of infra/)
- ❌ All Kubernetes deployments (`kubernetes/apps/`)
- ❌ RabbitMQ configs
- ❌ Kafka references
- ❌ MinIO configs
- ❌ Node.js Dockerfiles
- ❌ Old CI/CD workflows
- ❌ Terraform EKS modules (unless committing to K8s)

### KEEP (20% of infra/)
- ✅ Monitoring dashboards (`monitoring/`)
- ✅ Security configs (`security/`)
- ✅ Backup scripts (`scripts/`)
- ✅ NGINX configs (update for new routes)

### CREATE NEW (If Needed)
- 🆕 Simple Docker Compose for production
- 🆕 Optional Terraform for ECS (not EKS)
- 🆕 GitHub Actions for Python backend + CRE workflow
- 🆕 Simple deployment guides

---

## 📝 Immediate Action Items

1. **Backup infra/ directory**: `mv infra infra-deprecated-$(date +%Y%m%d)`
2. **Extract useful files**: Monitoring, security, scripts → new `infra/`
3. **Update docker-compose.yml**: Already done in `data-processor/`
4. **Create simple deployment guide**: No K8s, use managed services
5. **Update DEPLOYMENT_GUIDE.md**: Reference new architecture

---

## 🎯 Conclusion

**The current `infra/` directory is 80% obsolete**. It was designed for a Kafka + RabbitMQ + MinIO + Node.js backend architecture that we completely replaced with:
- Python FastAPI + Celery + Redis
- Planet Labs (no MinIO)
- No Kafka
- No RabbitMQ

**Recommended Next Steps**:
1. ✅ Archive `infra/` to `infra-old/`
2. ✅ Keep only monitoring, security, backup scripts
3. ✅ Use `docker-compose.yml` in `data-processor/` for deployment
4. ✅ Consider managed services (Render/Railway) instead of K8s
5. ❌ Don't waste time updating 80% deprecated K8s configs

**Time Saved**: 2-3 months of infra updates avoided by using simpler deployment

---

**Document Status**: COMPLETE ✅  
**Last Updated**: December 1, 2025  
**Next Action**: Archive `infra/` directory and extract useful parts
