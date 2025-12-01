# MicroCrop Infrastructure - Quick Reference

## 🚀 Quick Start Commands

### Initial Setup
```bash
# 1. Create secrets from template
cd infra/kubernetes/base/secrets
cp secrets-template.yaml secrets.yaml
# Edit secrets.yaml with actual values
kubectl apply -f secrets.yaml
rm secrets.yaml  # IMPORTANT: Don't commit!

# 2. Deploy infrastructure with Terraform
cd ../../terraform/environments/production
terraform init
terraform plan
terraform apply

# 3. Configure kubectl
aws eks update-kubeconfig --name microcrop-production --region us-east-1

# 4. Deploy to Kubernetes
kubectl apply -f ../../kubernetes/base/
kubectl apply -f ../../kubernetes/apps/
kubectl apply -f ../../kubernetes/ingress/
```

### Verify Deployment
```bash
kubectl get pods -n microcrop
kubectl get svc -n microcrop
kubectl get ingress -n microcrop
./ci-cd/scripts/smoke-tests.sh production
```

## 📊 Common Operations

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/microcrop-backend -n microcrop

# Worker logs
kubectl logs -f deployment/microcrop-workers -n microcrop -c weather-worker

# All pods
kubectl logs -f -l app=backend -n microcrop --all-containers=true
```

### Scale Services
```bash
# Manual scaling
kubectl scale deployment microcrop-backend --replicas=10 -n microcrop

# View HPA status
kubectl get hpa -n microcrop
kubectl describe hpa backend-hpa -n microcrop
```

### Debug Issues
```bash
# Pod status
kubectl get pods -n microcrop
kubectl describe pod <pod-name> -n microcrop

# Exec into pod
kubectl exec -it <pod-name> -n microcrop -- /bin/sh

# Check events
kubectl get events -n microcrop --sort-by='.lastTimestamp'
```

### Database Operations
```bash
# Connect to database
kubectl exec -it deployment/microcrop-backend -n microcrop -- \
  psql $DATABASE_URL

# Run migration
kubectl exec -it deployment/microcrop-backend -n microcrop -- \
  npx prisma migrate deploy

# Generate Prisma client
kubectl exec -it deployment/microcrop-backend -n microcrop -- \
  npx prisma generate
```

### Monitoring
```bash
# Port forward Prometheus
kubectl port-forward -n microcrop-monitoring svc/prometheus-server 9090:80
# Visit: http://localhost:9090

# Port forward Grafana
kubectl port-forward -n microcrop-monitoring svc/grafana 3000:80
# Visit: http://localhost:3000

# View metrics
kubectl top pods -n microcrop
kubectl top nodes
```

### Disaster Recovery
```bash
# Manual backup
./scripts/disaster-recovery/backup.sh

# List backups
aws s3 ls s3://microcrop-backups/

# Download backup
aws s3 cp s3://microcrop-backups/20251107_020000/ ./restore/ --recursive

# Restore PostgreSQL
pg_restore -h <host> -U <user> -d microcrop postgres_20251107_020000.dump
```

## 🔄 Deployment Workflows

### Deploy to Staging
```bash
git checkout staging
git merge develop
git push origin staging
# GitHub Actions automatically deploys
```

### Deploy to Production
```bash
git checkout main
git merge staging
git push origin main
# GitHub Actions deploys with blue-green strategy
```

### Rollback Deployment
```bash
# Via kubectl
kubectl rollout undo deployment/microcrop-backend -n microcrop

# Via GitHub Actions (redeploy previous version)
# Revert commit and push
git revert HEAD
git push origin main
```

## 🔐 Security Operations

### Rotate Secrets
```bash
# Update secret
kubectl edit secret backend-secrets -n microcrop

# Or recreate
kubectl delete secret backend-secrets -n microcrop
kubectl create secret generic backend-secrets --from-env-file=.env.production -n microcrop

# Restart pods to pick up new secrets
kubectl rollout restart deployment/microcrop-backend -n microcrop
```

### View Certificates
```bash
kubectl get certificates -n microcrop
kubectl describe certificate microcrop-tls -n microcrop
```

### Check Network Policies
```bash
kubectl get networkpolicies -n microcrop
kubectl describe networkpolicy backend-network-policy -n microcrop
```

## 📈 Performance Tuning

### Update Resource Limits
```bash
kubectl edit deployment microcrop-backend -n microcrop
# Update resources.limits and resources.requests
```

### Adjust HPA Thresholds
```bash
kubectl edit hpa backend-hpa -n microcrop
# Update targetAverageUtilization values
```

### Configure Rate Limiting
```bash
kubectl edit configmap nginx-configuration -n ingress-nginx
# Update rate limiting settings
```

## 🛠️ Troubleshooting Quick Fixes

### Pods Stuck in Pending
```bash
# Check node capacity
kubectl describe nodes

# Check PVC status
kubectl get pvc -n microcrop

# Scale down other deployments if needed
kubectl scale deployment <other-app> --replicas=0 -n microcrop
```

### ImagePullBackOff
```bash
# Check image name
kubectl describe pod <pod-name> -n microcrop | grep Image

# Re-authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <registry>

# Update image pull secrets if needed
kubectl create secret docker-registry ecr-secret \
  --docker-server=<registry> \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region us-east-1) \
  -n microcrop
```

### CrashLoopBackOff
```bash
# Check logs (including previous container)
kubectl logs <pod-name> -n microcrop --previous

# Common causes:
# 1. Missing environment variables
# 2. Database connection failure
# 3. Out of memory (check limits)

# Temporary fix: increase resources
kubectl edit deployment microcrop-backend -n microcrop
```

### High Memory Usage
```bash
# Check current usage
kubectl top pods -n microcrop

# Increase memory limits
kubectl edit deployment microcrop-backend -n microcrop

# Or force restart
kubectl rollout restart deployment/microcrop-backend -n microcrop
```

### Database Connection Issues
```bash
# Test connectivity from pod
kubectl exec -it deployment/microcrop-backend -n microcrop -- \
  nc -zv postgres-service 5432

# Check database secret
kubectl get secret database-secret -n microcrop -o yaml

# Verify database is running
kubectl get pods -l app=postgres -n microcrop
```

## 📞 Emergency Contacts

- **Slack**: #infrastructure
- **Email**: devops@microcrop.io
- **On-call**: PagerDuty rotation
- **Docs**: https://docs.microcrop.io/infrastructure

## 🔗 Useful Links

- **AWS Console**: https://console.aws.amazon.com/eks
- **Prometheus**: http://localhost:9090 (port-forward)
- **Grafana**: http://localhost:3000 (port-forward)
- **GitHub Actions**: https://github.com/microcrop/infrastructure/actions
- **ECR Registry**: <your-ecr-registry>

## 📚 Additional Resources

- Full documentation: `/infra/README.md`
- Implementation summary: `/infra/IMPLEMENTATION_SUMMARY.md`
- Terraform docs: `/infra/terraform/modules/*/README.md`
- Runbooks: `/docs/runbooks/`

---

**Last Updated**: November 7, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
