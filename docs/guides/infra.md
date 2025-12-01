# Claude Code Prompt for MicroCrop Infrastructure & DevOps

## Infrastructure Context

You are setting up the complete infrastructure for **MicroCrop**, a parametric crop insurance platform that must handle 100,000+ farmers, real-time weather data ingestion, satellite image processing, and automated blockchain transactions. The system requires high availability, scalability, and resilience for rural Kenya deployment.

## Technical Architecture

**Infrastructure Stack:**
- Kubernetes (EKS/GKE) for container orchestration
- Terraform for infrastructure as code
- GitHub Actions for CI/CD
- Prometheus + Grafana for monitoring
- ELK Stack for logging
- Redis Cluster for caching
- PostgreSQL with read replicas
- RabbitMQ cluster for message queuing
- NGINX for load balancing
- Cloudflare for CDN/DDoS protection

**Deployment Targets:**
- Development (local Docker)
- Staging (Kubernetes on AWS/GCP)
- Production (Multi-region Kubernetes)

## Detailed Infrastructure Requirements

### Project Structure
```
infrastructure/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── terraform.tfvars
│   │   ├── staging/
│   │   └── production/
│   ├── modules/
│   │   ├── eks/
│   │   ├── rds/
│   │   ├── redis/
│   │   ├── vpc/
│   │   ├── monitoring/
│   │   └── security/
│   └── global/
├── kubernetes/
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── configmaps/
│   │   ├── secrets/
│   │   └── network-policies/
│   ├── apps/
│   │   ├── backend/
│   │   ├── workers/
│   │   ├── frontend/
│   │   └── data-processor/
│   ├── services/
│   │   ├── postgres/
│   │   ├── redis/
│   │   ├── rabbitmq/
│   │   └── minio/
│   ├── monitoring/
│   │   ├── prometheus/
│   │   ├── grafana/
│   │   ├── loki/
│   │   └── alertmanager/
│   ├── ingress/
│   └── helm/
├── docker/
│   ├── backend/
│   │   ├── Dockerfile
│   │   └── Dockerfile.prod
│   ├── data-processor/
│   └── nginx/
├── ci-cd/
│   ├── .github/
│   │   └── workflows/
│   │       ├── backend-deploy.yml
│   │       ├── contracts-deploy.yml
│   │       ├── infrastructure.yml
│   │       └── security-scan.yml
│   ├── scripts/
│   └── ArgoCD/
├── monitoring/
│   ├── dashboards/
│   ├── alerts/
│   └── sla/
├── security/
│   ├── vault/
│   ├── policies/
│   └── certificates/
└── scripts/
    ├── backup/
    ├── restore/
    └── disaster-recovery/
```

### 1. Docker Configuration

```dockerfile
# docker/backend/Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production
RUN npx prisma generate

# Copy source code
COPY src ./src

# Multi-stage build for smaller image
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --chown=nodejs:nodejs package*.json ./

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]

EXPOSE 3000
```

### 2. Kubernetes Manifests

```yaml
# kubernetes/apps/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: microcrop-backend
  namespace: microcrop
  labels:
    app: backend
    version: v1
spec:
  replicas: 3
  revisionHistoryLimit: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: backend-sa
      securityContext:
        runAsNonRoot: true
        fsGroup: 1001
      containers:
      - name: backend
        image: microcrop/backend:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        envFrom:
        - configMapRef:
            name: backend-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: config
          mountPath: /app/config
          readOnly: true
        - name: secrets
          mountPath: /app/secrets
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: backend-config
      - name: secrets
        secret:
          secretName: backend-secrets
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend
              topologyKey: kubernetes.io/hostname

---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: microcrop
  labels:
    app: backend
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  - port: 9090
    targetPort: metrics
    protocol: TCP
    name: metrics
  selector:
    app: backend

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: microcrop
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: microcrop-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

### 3. Terraform Infrastructure

```hcl
# terraform/modules/eks/main.tf
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = "1.28"

  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  # EKS Addons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  # Node groups
  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 3
      max_size     = 10

      instance_types = ["t3.large"]
      
      k8s_labels = {
        Environment = var.environment
        NodeType    = "general"
      }

      update_config = {
        max_unavailable_percentage = 33
      }
    }

    workers = {
      desired_size = 2
      min_size     = 2
      max_size     = 20

      instance_types = ["t3.xlarge"]
      
      k8s_labels = {
        Environment = var.environment
        NodeType    = "workers"
      }

      taints = [{
        key    = "workload"
        value  = "workers"
        effect = "NO_SCHEDULE"
      }]
    }

    spot = {
      desired_size = 2
      min_size     = 1
      max_size     = 10

      instance_types = ["t3.large", "t3a.large"]
      capacity_type  = "SPOT"
      
      k8s_labels = {
        Environment = var.environment
        NodeType    = "spot"
      }
    }
  }

  # Enable IRSA
  enable_irsa = true

  # Cluster security group rules
  cluster_security_group_additional_rules = {
    ingress_nodes_ephemeral_ports_tcp = {
      description                = "Nodes on ephemeral ports"
      protocol                   = "tcp"
      from_port                  = 1025
      to_port                    = 65535
      type                       = "ingress"
      source_node_security_group = true
    }
  }
}

# terraform/modules/rds/main.tf
module "db" {
  source = "terraform-aws-modules/rds/aws"

  identifier = "${var.project_name}-${var.environment}"

  engine               = "postgres"
  engine_version       = "14"
  family               = "postgres14"
  major_engine_version = "14"
  instance_class       = var.instance_class

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true

  db_name  = "microcrop"
  username = "microcrop_admin"
  port     = 5432

  multi_az               = var.environment == "production" ? true : false
  create_db_subnet_group = true
  subnet_ids             = var.private_subnet_ids

  vpc_security_group_ids = [aws_security_group.rds.id]

  maintenance_window              = "Mon:00:00-Mon:03:00"
  backup_window                   = "03:00-06:00"
  enabled_cloudwatch_logs_exports = ["postgresql"]
  create_cloudwatch_log_group     = true

  backup_retention_period = var.environment == "production" ? 30 : 7
  skip_final_snapshot     = var.environment != "production"
  deletion_protection     = var.environment == "production"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  create_monitoring_role                = true
  monitoring_interval                   = 60

  parameters = [
    {
      name  = "autovacuum"
      value = 1
    },
    {
      name  = "client_encoding"
      value = "utf8"
    },
    {
      name  = "shared_preload_libraries"
      value = "timescaledb,pg_stat_statements"
    }
  ]

  # Read replica
  create_db_instance_replica = var.environment == "production" ? true : false
  replicas = var.environment == "production" ? {
    replica-1 = {
      instance_class = "db.t3.large"
    }
  } : {}
}

# terraform/modules/redis/main.tf
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.project_name}-${var.environment}"
  replication_group_description = "Redis cluster for MicroCrop ${var.environment}"

  engine               = "redis"
  node_type            = var.node_type
  parameter_group_name = aws_elasticache_parameter_group.redis.id
  port                 = 6379

  snapshot_retention_limit = var.environment == "production" ? 5 : 1
  snapshot_window          = "03:00-05:00"

  subnet_group_name = aws_elasticache_subnet_group.redis.name

  automatic_failover_enabled = true
  multi_az_enabled           = var.environment == "production" ? true : false

  num_cache_clusters = var.environment == "production" ? 3 : 2

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  notification_topic_arn = aws_sns_topic.redis_notifications.arn

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_elasticache_parameter_group" "redis" {
  family = "redis7"
  name   = "${var.project_name}-${var.environment}-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }
}
```

### 4. CI/CD Pipeline

```yaml
# .github/workflows/backend-deploy.yml
name: Backend Deployment

on:
  push:
    branches:
      - main
      - staging
      - develop
    paths:
      - 'backend/**'
      - '.github/workflows/backend-deploy.yml'

env:
  ECR_REPOSITORY: microcrop-backend
  EKS_CLUSTER_NAME: microcrop-production
  AWS_REGION: us-east-1

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Run linting
        working-directory: ./backend
        run: npm run lint
      
      - name: Run tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
        run: |
          npx prisma migrate deploy
          npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage/lcov.info
          fail_ci_if_error: true

  security-scan:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: './backend'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
      
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  build-and-push:
    runs-on: ubuntu-latest
    needs: [test, security-scan]
    outputs:
      image-tag: ${{ steps.image.outputs.tag }}
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Generate image tag
        id: image
        run: |
          COMMIT_SHA=${GITHUB_SHA::7}
          TIMESTAMP=$(date +%Y%m%d%H%M%S)
          TAG="${GITHUB_REF_NAME}-${TIMESTAMP}-${COMMIT_SHA}"
          echo "tag=$TAG" >> $GITHUB_OUTPUT
      
      - name: Build and push Docker image
        working-directory: ./backend
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ steps.image.outputs.tag }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -f Dockerfile.prod .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/staging'
    environment: staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name microcrop-staging --region ${{ env.AWS_REGION }}
      
      - name: Deploy to Kubernetes
        env:
          IMAGE_TAG: ${{ needs.build-and-push.outputs.image-tag }}
        run: |
          kubectl set image deployment/microcrop-backend \
            backend=${{ secrets.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:$IMAGE_TAG \
            -n microcrop-staging
          kubectl rollout status deployment/microcrop-backend -n microcrop-staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER_NAME }} --region ${{ env.AWS_REGION }}
      
      - name: Deploy to Kubernetes (Blue-Green)
        env:
          IMAGE_TAG: ${{ needs.build-and-push.outputs.image-tag }}
        run: |
          # Create new deployment (green)
          kubectl apply -f - <<EOF
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: microcrop-backend-green
            namespace: microcrop
          spec:
            replicas: 3
            selector:
              matchLabels:
                app: backend
                version: green
            template:
              metadata:
                labels:
                  app: backend
                  version: green
              spec:
                containers:
                - name: backend
                  image: ${{ secrets.ECR_REGISTRY }}/${{ env.ECR_REPOSITORY }}:$IMAGE_TAG
          EOF
          
          # Wait for green deployment to be ready
          kubectl rollout status deployment/microcrop-backend-green -n microcrop
          
          # Run smoke tests
          ./scripts/smoke-tests.sh green
          
          # Switch traffic to green
          kubectl patch service backend-service -n microcrop -p '{"spec":{"selector":{"version":"green"}}}'
          
          # Wait and monitor
          sleep 60
          
          # If successful, cleanup old deployment
          kubectl delete deployment microcrop-backend-blue -n microcrop || true
          kubectl label deployment microcrop-backend-green version=blue --overwrite -n microcrop
```

### 5. Monitoring Configuration

```yaml
# kubernetes/monitoring/prometheus/values.yaml
prometheus:
  prometheusSpec:
    retention: 30d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    
    serviceMonitorSelector:
      matchLabels:
        prometheus: kube-prometheus
    
    resources:
      requests:
        memory: 2Gi
        cpu: 1
      limits:
        memory: 4Gi
        cpu: 2
    
    additionalScrapeConfigs:
      - job_name: 'microcrop-backend'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - microcrop
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
    
    rules:
      groups:
        - name: microcrop_alerts
          interval: 30s
          rules:
            - alert: HighErrorRate
              expr: |
                sum(rate(http_requests_total{status=~"5.."}[5m])) 
                / 
                sum(rate(http_requests_total[5m])) > 0.05
              for: 5m
              labels:
                severity: critical
              annotations:
                summary: "High error rate detected"
                description: "Error rate is above 5% for 5 minutes"
            
            - alert: HighLatency
              expr: |
                histogram_quantile(0.95, 
                  sum(rate(http_request_duration_seconds_bucket[5m])) 
                  by (le)
                ) > 1
              for: 5m
              labels:
                severity: warning
              annotations:
                summary: "High latency detected"
                description: "95th percentile latency is above 1s"
            
            - alert: PodMemoryUsage
              expr: |
                container_memory_usage_bytes{pod=~"microcrop-.*"} 
                / 
                container_spec_memory_limit_bytes > 0.9
              for: 5m
              labels:
                severity: warning
              annotations:
                summary: "High memory usage"
                description: "Pod {{ $labels.pod }} memory usage is above 90%"

grafana:
  adminPassword: ${GRAFANA_ADMIN_PASSWORD}
  persistence:
    enabled: true
    size: 10Gi
  
  datasources:
    datasources.yaml:
      apiVersion: 1
      datasources:
        - name: Prometheus
          type: prometheus
          url: http://prometheus-server
          access: proxy
          isDefault: true
        
        - name: Loki
          type: loki
          url: http://loki:3100
          access: proxy
        
        - name: PostgreSQL
          type: postgres
          url: postgres.microcrop.svc.cluster.local:5432
          database: microcrop
          user: ${DB_USER}
          secureJsonData:
            password: ${DB_PASSWORD}
  
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
        - name: 'default'
          orgId: 1
          folder: ''
          type: file
          disableDeletion: false
          editable: true
          options:
            path: /var/lib/grafana/dashboards
```

### 6. Logging Configuration

```yaml
# kubernetes/monitoring/loki/values.yaml
loki:
  auth_enabled: false
  
  storage:
    type: s3
    s3:
      s3: s3://${AWS_REGION}/microcrop-logs
      endpoint: s3.${AWS_REGION}.amazonaws.com
      region: ${AWS_REGION}
      secretAccessKey: ${AWS_SECRET_ACCESS_KEY}
      accessKeyId: ${AWS_ACCESS_KEY_ID}
      s3ForcePathStyle: false
      insecure: false
  
  schema_config:
    configs:
      - from: 2023-01-01
        store: boltdb-shipper
        object_store: s3
        schema: v11
        index:
          prefix: index_
          period: 24h
  
  limits_config:
    retention_period: 30d
    ingestion_rate_mb: 10
    ingestion_burst_size_mb: 20
    max_query_series: 5000
    max_query_parallelism: 32

promtail:
  config:
    clients:
      - url: http://loki:3100/loki/api/v1/push
    
    positions:
      filename: /tmp/positions.yaml
    
    scrape_configs:
      - job_name: kubernetes-pods
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - microcrop
        
        pipeline_stages:
          - docker: {}
          - multiline:
              firstline: '^\d{4}-\d{2}-\d{2}'
              max_wait_time: 3s
          - regex:
              expression: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}) \[(?P<level>\w+)\] (?P<message>.*)$'
          - labels:
              level:
          - timestamp:
              source: timestamp
              format: '2006-01-02 15:04:05.000'
```

### 7. Disaster Recovery

```bash
#!/bin/bash
# scripts/disaster-recovery/backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/${TIMESTAMP}"
S3_BUCKET="s3://microcrop-backups"

echo "Starting disaster recovery backup at ${TIMESTAMP}"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
PGPASSWORD=${DB_PASSWORD} pg_dump \
  -h ${DB_HOST} \
  -U ${DB_USER} \
  -d microcrop \
  --format=custom \
  --verbose \
  --file="${BACKUP_DIR}/postgres_${TIMESTAMP}.dump"

# Backup Redis
echo "Backing up Redis..."
redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} --rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

# Backup Kubernetes configurations
echo "Backing up Kubernetes configs..."
kubectl get all --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_resources_${TIMESTAMP}.yaml"
kubectl get configmap --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_configmaps_${TIMESTAMP}.yaml"
kubectl get secret --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_secrets_${TIMESTAMP}.yaml"

# Backup IPFS data
echo "Backing up IPFS pins..."
ipfs pin ls --type=recursive > "${BACKUP_DIR}/ipfs_pins_${TIMESTAMP}.txt"

# Compress backup
tar -czf "${BACKUP_DIR}.tar.gz" -C /backups "${TIMESTAMP}"

# Upload to S3
aws s3 cp "${BACKUP_DIR}.tar.gz" "${S3_BUCKET}/${TIMESTAMP}/" \
  --storage-class GLACIER \
  --server-side-encryption AES256

# Upload to secondary region
aws s3 cp "${BACKUP_DIR}.tar.gz" "${S3_BUCKET}-dr/${TIMESTAMP}/" \
  --region ${DR_REGION} \
  --storage-class GLACIER \
  --server-side-encryption AES256

# Clean up local files older than 7 days
find /backups -type f -mtime +7 -delete

echo "Backup completed successfully"

# Send notification
aws sns publish \
  --topic-arn ${SNS_TOPIC_ARN} \
  --message "Disaster recovery backup completed: ${TIMESTAMP}" \
  --subject "MicroCrop Backup Success"
```

### 8. Load Balancing & CDN

```yaml
# kubernetes/ingress/nginx-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: microcrop-ingress
  namespace: microcrop
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization"
spec:
  tls:
    - hosts:
        - api.microcrop.io
        - app.microcrop.io
      secretName: microcrop-tls
  rules:
    - host: api.microcrop.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 80
    - host: app.microcrop.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80

---
# Cloudflare configuration (terraform)
resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  value   = aws_lb.alb.dns_name
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_page_rule" "api_cache" {
  zone_id = var.cloudflare_zone_id
  target  = "api.microcrop.io/*"
  priority = 1

  actions {
    cache_level = "aggressive"
    edge_cache_ttl = 7200
    browser_cache_ttl = 3600
    
    cache_key_fields {
      query_string {
        exclude = ["timestamp"]
      }
    }
  }
}

resource "cloudflare_rate_limit" "api" {
  zone_id = var.cloudflare_zone_id
  threshold = 100
  period = 60
  
  match {
    request {
      url_pattern = "api.microcrop.io/*"
    }
  }

  action {
    mode = "simulate"
    timeout = 60
  }
}
```

### 9. Security Configuration

```yaml
# kubernetes/security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: microcrop
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: microcrop
        - podSelector:
            matchLabels:
              app: nginx-ingress
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    - to:
        - podSelector:
            matchLabels:
              app: rabbitmq
      ports:
        - protocol: TCP
          port: 5672
    - ports:
        - protocol: TCP
          port: 53
        - protocol: UDP
          port: 53
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns

---
# HashiCorp Vault configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-config
  namespace: vault
data:
  vault.hcl: |
    storage "raft" {
      path = "/vault/data"
      
      retry_join {
        leader_api_addr = "http://vault-0.vault-internal:8200"
      }
      retry_join {
        leader_api_addr = "http://vault-1.vault-internal:8200"
      }
      retry_join {
        leader_api_addr = "http://vault-2.vault-internal:8200"
      }
    }

    listener "tcp" {
      address = "0.0.0.0:8200"
      tls_disable = false
      tls_cert_file = "/vault/tls/tls.crt"
      tls_key_file = "/vault/tls/tls.key"
    }

    api_addr = "https://vault.microcrop.io"
    cluster_addr = "https://vault-internal:8201"
    ui = true
    
    seal "awskms" {
      region = "us-east-1"
      kms_key_id = "${KMS_KEY_ID}"
    }
```

### 10. Performance Optimization

```nginx
# docker/nginx/nginx.conf
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main buffer=32k flush=1m;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 100;
    reset_timedout_connection on;
    client_body_timeout 10;
    client_header_timeout 10;
    send_timeout 10;

    # Buffers
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 8k;
    output_buffers 32 32k;
    postpone_output 1460;

    # Caching
    open_file_cache max=1000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml image/svg+xml 
               text/x-js text/x-cross-domain-policy application/x-font-ttf 
               application/x-font-opentype application/vnd.ms-fontobject 
               image/x-icon;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=ussd:10m rate=100r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Upstream pools
    upstream backend {
        least_conn;
        server backend-service:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    upstream websocket {
        ip_hash;
        server backend-service:3001;
        keepalive 64;
    }

    # HTTPS redirect
    server {
        listen 80;
        server_name api.microcrop.io;
        return 301 https://$server_name$request_uri;
    }

    # Main server
    server {
        listen 443 ssl http2;
        server_name api.microcrop.io;

        # SSL
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_session_timeout 1d;
        ssl_session_cache shared:SSL:50m;
        ssl_session_tickets off;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers off;
        add_header Strict-Transport-Security "max-age=63072000" always;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # USSD endpoint (high priority, no rate limit)
        location /api/ussd {
            limit_req zone=ussd burst=50 nodelay;
            limit_conn addr 100;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 5s;
            proxy_send_timeout 10s;
            proxy_read_timeout 10s;
            
            # Disable buffering for real-time
            proxy_buffering off;
        }

        # API endpoints
        location /api {
            limit_req zone=api burst=20 nodelay;
            limit_conn addr 10;
            
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";
            
            proxy_connect_timeout 10s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
            
            # Caching for GET requests
            proxy_cache_methods GET HEAD;
            proxy_cache_valid 200 1m;
            proxy_cache_bypass $http_authorization;
            proxy_no_cache $http_authorization;
        }

        # WebSocket support
        location /ws {
            proxy_pass http://websocket;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 7d;
            proxy_send_timeout 7d;
            proxy_read_timeout 7d;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }

        # Metrics endpoint (internal only)
        location /metrics {
            allow 10.0.0.0/8;
            deny all;
            proxy_pass http://backend/metrics;
        }
    }
}
```

## Success Criteria

The infrastructure is complete when:
- Zero-downtime deployments working
- Auto-scaling responding to load
- Monitoring dashboards showing all metrics
- Logs aggregated and searchable
- Backup/restore tested and working
- Security scanning passing
- Load testing handles 10,000 concurrent USSD sessions
- Database failover working
- CDN caching reducing origin load by 70%+
- SSL/TLS properly configured
- Secrets managed securely
- Disaster recovery plan tested
- Cost optimization implemented
- Documentation complete

This infrastructure setup ensures MicroCrop can handle production traffic reliably, scale automatically, and maintain high availability for farmers in rural Kenya using USSD services.