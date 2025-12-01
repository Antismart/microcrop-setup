# MicroCrop Infrastructure Documentation

> Complete infrastructure-as-code for MicroCrop parametric crop insurance platform

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Directory Structure](#directory-structure)
- [Deployment Guide](#deployment-guide)
- [Monitoring & Observability](#monitoring--observability)
- [Security](#security)
- [Disaster Recovery](#disaster-recovery)
- [Scaling](#scaling)
- [Troubleshooting](#troubleshooting)

## Overview

This infrastructure supports 100,000+ farmers with:
- **High Availability**: Multi-region Kubernetes clusters
- **Auto-scaling**: HPA for backend (3-20 pods) and workers (2-10 pods)
- **Zero-downtime deployments**: Blue-green deployment strategy
- **Comprehensive monitoring**: Prometheus, Grafana, Loki
- **Security**: Network policies, secrets management, TLS/SSL
- **Disaster recovery**: Automated backups to S3 with cross-region replication

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN/DDoS                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS Application Load Balancer                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  NGINX Ingress Controller                    │
│              (Rate limiting, SSL termination)                │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌────────┐    ┌────────┐    ┌────────┐
    │Backend │    │Workers │    │  Data  │
    │  Pods  │    │  Pods  │    │Processor│
    │ (3-20) │    │ (2-10) │    │  Pods  │
    └───┬────┘    └───┬────┘    └───┬────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌──────────┐
    │Postgres│  │ Redis  │  │ RabbitMQ │
    │ Primary│  │Cluster │  │ Cluster  │
    │+Replica│  │        │  │          │
    └────────┘  └────────┘  └──────────┘
```

## Prerequisites

### Required Tools

```bash
# Kubernetes CLI
kubectl version

# Terraform
terraform version  # >= 1.5.0

# AWS CLI
aws --version  # >= 2.13.0

# Helm
helm version  # >= 3.12.0

# Docker
docker version  # >= 24.0.0
```

### AWS Resources

- AWS Account with appropriate permissions
- ECR repositories created
- Route53 hosted zone (optional)
- S3 buckets for backups
- KMS keys for encryption

### Kubernetes Cluster

- EKS cluster (1.28+) or equivalent
- Minimum 3 nodes (t3.large or larger)
- Cluster autoscaler configured
- EBS CSI driver installed

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/microcrop/infrastructure.git
cd infrastructure
```

### 2. Configure AWS Credentials

```bash
aws configure
# OR
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_REGION="us-east-1"
```

### 3. Initialize Terraform

```bash
cd terraform/environments/production
terraform init
```

### 4. Deploy Infrastructure

```bash
# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan
```

### 5. Configure Kubernetes

```bash
# Update kubeconfig
aws eks update-kubeconfig --name microcrop-production --region us-east-1

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### 6. Deploy Application

```bash
# Create namespace
kubectl apply -f ../../kubernetes/base/namespace.yaml

# Create secrets (use secrets-template.yaml as guide)
kubectl apply -f ../../kubernetes/base/secrets/secrets.yaml

# Deploy configmaps
kubectl apply -f ../../kubernetes/base/configmaps/

# Deploy network policies
kubectl apply -f ../../kubernetes/base/network-policies/

# Deploy backend
kubectl apply -f ../../kubernetes/apps/backend/

# Deploy workers
kubectl apply -f ../../kubernetes/apps/workers/

# Deploy ingress
kubectl apply -f ../../kubernetes/ingress/
```

### 7. Verify Deployment

```bash
# Check pods
kubectl get pods -n microcrop

# Check services
kubectl get svc -n microcrop

# Check ingress
kubectl get ingress -n microcrop

# View logs
kubectl logs -f deployment/microcrop-backend -n microcrop
```

## Directory Structure

```
infra/
├── terraform/                    # Infrastructure as Code
│   ├── environments/            # Environment-specific configs
│   │   ├── dev/                # Development environment
│   │   ├── staging/            # Staging environment
│   │   └── production/         # Production environment
│   ├── modules/                # Reusable Terraform modules
│   │   ├── eks/               # EKS cluster module
│   │   ├── rds/               # RDS PostgreSQL module
│   │   ├── redis/             # ElastiCache Redis module
│   │   ├── vpc/               # VPC networking module
│   │   ├── monitoring/        # CloudWatch monitoring
│   │   └── security/          # Security groups, IAM
│   └── global/                # Global resources (S3, Route53)
│
├── kubernetes/                  # Kubernetes manifests
│   ├── base/                   # Base configurations
│   │   ├── namespace.yaml
│   │   ├── configmaps/
│   │   ├── secrets/
│   │   └── network-policies/
│   ├── apps/                   # Application deployments
│   │   ├── backend/
│   │   ├── workers/
│   │   └── data-processor/
│   ├── services/               # Stateful services
│   │   ├── postgres/
│   │   ├── redis/
│   │   └── rabbitmq/
│   ├── monitoring/             # Monitoring stack
│   │   ├── prometheus/
│   │   ├── grafana/
│   │   └── loki/
│   └── ingress/                # Ingress controllers
│
├── docker/                      # Docker configurations
│   ├── backend/
│   │   ├── Dockerfile.prod
│   │   └── Dockerfile.dev
│   ├── data-processor/
│   └── nginx/
│       ├── Dockerfile
│       └── nginx.conf
│
├── ci-cd/                       # CI/CD pipelines
│   ├── .github/workflows/
│   │   ├── backend-deploy.yml
│   │   ├── contracts-deploy.yml
│   │   └── infrastructure.yml
│   └── scripts/
│       ├── smoke-tests.sh
│       └── health-check.sh
│
├── monitoring/                  # Monitoring configs
│   ├── dashboards/             # Grafana dashboards
│   └── alerts/                 # Alert rules
│
├── security/                    # Security configurations
│   ├── vault/                  # HashiCorp Vault
│   └── policies/               # Security policies
│
└── scripts/                     # Utility scripts
    ├── backup/
    ├── restore/
    └── disaster-recovery/
        └── backup.sh
```

## Deployment Guide

### Development Environment

```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply

# Deploy to dev cluster
kubectl config use-context microcrop-dev
kubectl apply -f ../../kubernetes/
```

### Staging Environment

```bash
cd terraform/environments/staging
terraform init
terraform plan
terraform apply

# Deploy to staging
kubectl config use-context microcrop-staging
kubectl apply -f ../../kubernetes/
```

### Production Environment

Production deployments use blue-green strategy:

```bash
# Trigger via GitHub Actions
git push origin main

# Or manually
cd terraform/environments/production
terraform apply

# Blue-green deployment
./ci-cd/scripts/deploy-blue-green.sh
```

## Monitoring & Observability

### Prometheus

Access Prometheus:

```bash
kubectl port-forward -n microcrop-monitoring svc/prometheus-server 9090:80
```

Visit: http://localhost:9090

### Grafana

Access Grafana:

```bash
kubectl port-forward -n microcrop-monitoring svc/grafana 3000:80
```

Visit: http://localhost:3000

Default credentials:
- Username: `admin`
- Password: (stored in secret `grafana-credentials`)

### Loki (Logs)

Query logs via Grafana or LogCLI:

```bash
# Via Grafana Explore tab
# Or using LogCLI
logcli query '{app="backend"}' --since=1h
```

### Key Metrics

- **Request Rate**: `rate(http_requests_total[5m])`
- **Error Rate**: `rate(http_requests_total{status=~"5.."}[5m])`
- **Latency**: `histogram_quantile(0.95, http_request_duration_seconds_bucket)`
- **Pod CPU**: `container_cpu_usage_seconds_total`
- **Pod Memory**: `container_memory_usage_bytes`

### Alerts

Configured alerts:
- High error rate (>5% for 5min)
- High latency (p95 >1s for 5min)
- Pod memory >90%
- Pod CPU >90%
- Database connection failures
- Redis unavailable

## Security

### Network Policies

All pods have network policies enforcing least-privilege:

```bash
# View network policies
kubectl get networkpolicies -n microcrop
```

### Secrets Management

**Development**: Kubernetes secrets
**Production**: AWS Secrets Manager or HashiCorp Vault

```bash
# Create secret from file
kubectl create secret generic backend-secrets \
  --from-env-file=.env.production \
  -n microcrop

# Or use sealed-secrets
kubeseal < secrets.yaml > sealed-secrets.yaml
kubectl apply -f sealed-secrets.yaml
```

### TLS/SSL

Certificates managed by cert-manager:

```bash
# Check certificates
kubectl get certificates -n microcrop
kubectl describe certificate microcrop-tls -n microcrop
```

### RBAC

```bash
# View service accounts
kubectl get serviceaccounts -n microcrop

# View role bindings
kubectl get rolebindings -n microcrop
```

## Disaster Recovery

### Automated Backups

Backups run daily at 2 AM UTC via CronJob:

```bash
# View backup jobs
kubectl get cronjobs -n microcrop

# View backup history
kubectl get jobs -n microcrop | grep backup

# Trigger manual backup
kubectl create job manual-backup-$(date +%Y%m%d) \
  --from=cronjob/backup-cronjob -n microcrop
```

### Manual Backup

```bash
# Run backup script
./scripts/disaster-recovery/backup.sh

# Verify in S3
aws s3 ls s3://microcrop-backups/
```

### Restore from Backup

```bash
# List available backups
aws s3 ls s3://microcrop-backups/

# Download backup
aws s3 cp s3://microcrop-backups/20251107_020000/ ./restore/ --recursive

# Extract backup
tar -xzf 20251107_020000.tar.gz

# Restore PostgreSQL
pg_restore -h <host> -U <user> -d microcrop postgres_20251107_020000.dump

# Restore Redis
redis-cli -h <host> -a <password> --rdb redis_20251107_020000.rdb

# Restore Kubernetes configs
kubectl apply -f k8s_resources_20251107_020000.yaml
```

## Scaling

### Horizontal Pod Autoscaling

Backend scales 3-20 pods based on CPU/memory:

```bash
# View HPA status
kubectl get hpa -n microcrop

# Describe HPA
kubectl describe hpa backend-hpa -n microcrop
```

### Cluster Autoscaling

EKS cluster autoscaler adds/removes nodes automatically:

```bash
# View cluster autoscaler logs
kubectl logs -f deployment/cluster-autoscaler -n kube-system
```

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment microcrop-backend --replicas=10 -n microcrop

# Scale workers
kubectl scale deployment microcrop-workers --replicas=5 -n microcrop
```

## Troubleshooting

### Pod Issues

```bash
# Check pod status
kubectl get pods -n microcrop

# Describe pod
kubectl describe pod <pod-name> -n microcrop

# View logs
kubectl logs <pod-name> -n microcrop

# Exec into pod
kubectl exec -it <pod-name> -n microcrop -- /bin/sh
```

### Service Issues

```bash
# Check services
kubectl get svc -n microcrop

# Test service connectivity
kubectl run test-pod --image=curlimages/curl -it --rm -- \
  curl http://backend-service.microcrop.svc.cluster.local/health
```

### Ingress Issues

```bash
# Check ingress
kubectl get ingress -n microcrop
kubectl describe ingress microcrop-ingress -n microcrop

# View NGINX logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Database Issues

```bash
# Check database connectivity
kubectl exec -it deployment/microcrop-backend -n microcrop -- \
  psql $DATABASE_URL -c "SELECT 1"

# View database logs
# (Check CloudWatch or RDS console)
```

### Common Issues

**Issue**: Pods in CrashLoopBackOff
```bash
# Check logs for errors
kubectl logs <pod-name> -n microcrop --previous

# Common causes:
# - Missing environment variables
# - Database connection failure
# - Out of memory
```

**Issue**: ImagePullBackOff
```bash
# Check image name and registry
kubectl describe pod <pod-name> -n microcrop

# Verify ECR access
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ecr-registry>
```

**Issue**: High latency
```bash
# Check resource limits
kubectl top pods -n microcrop

# Check HPA status
kubectl get hpa -n microcrop

# Scale manually if needed
kubectl scale deployment microcrop-backend --replicas=15 -n microcrop
```

## Support

- **Documentation**: https://docs.microcrop.io
- **Issues**: https://github.com/microcrop/infrastructure/issues
- **Slack**: #infrastructure channel
- **Email**: devops@microcrop.io

## License

Copyright © 2025 MicroCrop. All rights reserved.
