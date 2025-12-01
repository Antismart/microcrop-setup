#!/bin/bash
# Disaster Recovery Backup Script for MicroCrop
# Backs up databases, configurations, and IPFS data to S3

set -e

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/backups/${TIMESTAMP}"
S3_BUCKET="${S3_BACKUP_BUCKET:-s3://microcrop-backups}"
S3_DR_BUCKET="${S3_DR_BUCKET:-s3://microcrop-backups-dr}"
DR_REGION="${DR_REGION:-us-west-2}"
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Kubernetes namespace
NAMESPACE="${NAMESPACE:-microcrop}"

# Logging
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Create backup directory
mkdir -p ${BACKUP_DIR}

log "Starting disaster recovery backup at ${TIMESTAMP}"
log "Backup directory: ${BACKUP_DIR}"

# 1. Backup PostgreSQL
log "Backing up PostgreSQL..."
DB_HOST=$(kubectl get secret database-secret -n ${NAMESPACE} -o jsonpath='{.data.host}' | base64 -d)
DB_USER=$(kubectl get secret database-secret -n ${NAMESPACE} -o jsonpath='{.data.username}' | base64 -d)
DB_PASSWORD=$(kubectl get secret database-secret -n ${NAMESPACE} -o jsonpath='{.data.password}' | base64 -d)
DB_NAME="microcrop"

PGPASSWORD=${DB_PASSWORD} pg_dump \
  -h ${DB_HOST} \
  -U ${DB_USER} \
  -d ${DB_NAME} \
  --format=custom \
  --verbose \
  --file="${BACKUP_DIR}/postgres_${TIMESTAMP}.dump"

if [ $? -eq 0 ]; then
  log "✅ PostgreSQL backup completed: postgres_${TIMESTAMP}.dump"
  POSTGRES_SIZE=$(du -h "${BACKUP_DIR}/postgres_${TIMESTAMP}.dump" | cut -f1)
  log "PostgreSQL backup size: ${POSTGRES_SIZE}"
else
  error "PostgreSQL backup failed"
  exit 1
fi

# 2. Backup Redis
log "Backing up Redis..."
REDIS_HOST=$(kubectl get secret redis-secret -n ${NAMESPACE} -o jsonpath='{.data.host}' | base64 -d)
REDIS_PASSWORD=$(kubectl get secret redis-secret -n ${NAMESPACE} -o jsonpath='{.data.password}' | base64 -d)

redis-cli -h ${REDIS_HOST} -a ${REDIS_PASSWORD} --rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

if [ $? -eq 0 ]; then
  log "✅ Redis backup completed: redis_${TIMESTAMP}.rdb"
  REDIS_SIZE=$(du -h "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb" | cut -f1)
  log "Redis backup size: ${REDIS_SIZE}"
else
  error "Redis backup failed"
  exit 1
fi

# 3. Backup Kubernetes configurations
log "Backing up Kubernetes configurations..."

# All resources
kubectl get all --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_resources_${TIMESTAMP}.yaml"

# ConfigMaps
kubectl get configmap --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_configmaps_${TIMESTAMP}.yaml"

# Secrets (encrypted)
kubectl get secret --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_secrets_${TIMESTAMP}.yaml"

# PersistentVolumeClaims
kubectl get pvc --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_pvc_${TIMESTAMP}.yaml"

# Ingress
kubectl get ingress --all-namespaces -o yaml > "${BACKUP_DIR}/k8s_ingress_${TIMESTAMP}.yaml"

log "✅ Kubernetes configurations backed up"

# 4. Backup IPFS pins
log "Backing up IPFS pins..."
if command -v ipfs &> /dev/null; then
  ipfs pin ls --type=recursive > "${BACKUP_DIR}/ipfs_pins_${TIMESTAMP}.txt"
  log "✅ IPFS pins backed up"
else
  log "⚠️  IPFS not available, skipping pin backup"
fi

# 5. Create backup manifest
log "Creating backup manifest..."
cat > "${BACKUP_DIR}/manifest.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "namespace": "${NAMESPACE}",
  "files": {
    "postgres": "postgres_${TIMESTAMP}.dump",
    "redis": "redis_${TIMESTAMP}.rdb",
    "kubernetes_resources": "k8s_resources_${TIMESTAMP}.yaml",
    "kubernetes_configmaps": "k8s_configmaps_${TIMESTAMP}.yaml",
    "kubernetes_secrets": "k8s_secrets_${TIMESTAMP}.yaml",
    "kubernetes_pvc": "k8s_pvc_${TIMESTAMP}.yaml",
    "kubernetes_ingress": "k8s_ingress_${TIMESTAMP}.yaml",
    "ipfs_pins": "ipfs_pins_${TIMESTAMP}.txt"
  },
  "sizes": {
    "postgres": "${POSTGRES_SIZE}",
    "redis": "${REDIS_SIZE}"
  },
  "checksums": {}
}
EOF

# Generate checksums
log "Generating checksums..."
cd ${BACKUP_DIR}
sha256sum *.dump *.rdb *.yaml *.txt 2>/dev/null > checksums.txt
cd -
log "✅ Checksums generated"

# 6. Compress backup
log "Compressing backup..."
BACKUP_ARCHIVE="${BACKUP_DIR}.tar.gz"
tar -czf "${BACKUP_ARCHIVE}" -C /tmp/backups "${TIMESTAMP}"

if [ $? -eq 0 ]; then
  ARCHIVE_SIZE=$(du -h "${BACKUP_ARCHIVE}" | cut -f1)
  log "✅ Backup compressed: ${TIMESTAMP}.tar.gz (${ARCHIVE_SIZE})"
else
  error "Backup compression failed"
  exit 1
fi

# 7. Upload to primary S3 bucket
log "Uploading to primary S3 bucket: ${S3_BUCKET}"
aws s3 cp "${BACKUP_ARCHIVE}" "${S3_BUCKET}/${TIMESTAMP}/" \
  --storage-class GLACIER_IR \
  --server-side-encryption AES256 \
  --metadata "timestamp=${TIMESTAMP},namespace=${NAMESPACE}"

if [ $? -eq 0 ]; then
  log "✅ Uploaded to primary S3 bucket"
else
  error "Primary S3 upload failed"
  exit 1
fi

# 8. Upload to DR region
log "Uploading to DR S3 bucket: ${S3_DR_BUCKET} (${DR_REGION})"
aws s3 cp "${BACKUP_ARCHIVE}" "${S3_DR_BUCKET}/${TIMESTAMP}/" \
  --region ${DR_REGION} \
  --storage-class GLACIER_IR \
  --server-side-encryption AES256 \
  --metadata "timestamp=${TIMESTAMP},namespace=${NAMESPACE},dr=true"

if [ $? -eq 0 ]; then
  log "✅ Uploaded to DR S3 bucket"
else
  error "DR S3 upload failed (non-critical, primary backup succeeded)"
fi

# 9. Clean up old local backups
log "Cleaning up old local backups..."
find /tmp/backups -type f -mtime +7 -delete
find /tmp/backups -type d -empty -delete
log "✅ Old local backups cleaned up"

# 10. Clean up old S3 backups
log "Cleaning up old S3 backups (keeping last ${RETENTION_DAYS} days)..."
CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)

aws s3 ls ${S3_BUCKET}/ | while read -r line; do
  BACKUP_DATE=$(echo $line | awk '{print $2}' | sed 's|/||' | cut -d'_' -f1)
  if [[ "${BACKUP_DATE}" < "${CUTOFF_DATE}" ]]; then
    BACKUP_PATH=$(echo $line | awk '{print $2}')
    log "Deleting old backup: ${BACKUP_PATH}"
    aws s3 rm ${S3_BUCKET}/${BACKUP_PATH} --recursive
  fi
done

log "✅ Old S3 backups cleaned up"

# 11. Send notification
log "Sending notification..."
NOTIFICATION_MESSAGE="Disaster recovery backup completed successfully
Timestamp: ${TIMESTAMP}
Namespace: ${NAMESPACE}
Archive size: ${ARCHIVE_SIZE}
Primary location: ${S3_BUCKET}/${TIMESTAMP}/
DR location: ${S3_DR_BUCKET}/${TIMESTAMP}/"

if [ ! -z "${SNS_TOPIC_ARN}" ]; then
  aws sns publish \
    --topic-arn ${SNS_TOPIC_ARN} \
    --message "${NOTIFICATION_MESSAGE}" \
    --subject "MicroCrop Backup Success - ${TIMESTAMP}"
  log "✅ SNS notification sent"
fi

if [ ! -z "${SLACK_WEBHOOK_URL}" ]; then
  curl -X POST ${SLACK_WEBHOOK_URL} \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"${NOTIFICATION_MESSAGE}\"}"
  log "✅ Slack notification sent"
fi

# 12. Clean up temporary files
log "Cleaning up temporary files..."
rm -rf ${BACKUP_DIR}
rm -f ${BACKUP_ARCHIVE}
log "✅ Temporary files cleaned up"

log "Backup completed successfully!"
log "Total backup time: $SECONDS seconds"

exit 0
