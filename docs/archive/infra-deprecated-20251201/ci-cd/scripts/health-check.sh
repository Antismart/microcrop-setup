#!/bin/bash
# Health check script for blue-green deployments
# Usage: ./health-check.sh <color>

set -e

COLOR=${1:-green}
SERVICE_URL="http://backend-service-$COLOR.microcrop.svc.cluster.local"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Running health checks for $COLOR deployment..."
echo "Service URL: $SERVICE_URL"

# Function to check endpoint
check_endpoint() {
  local endpoint=$1
  local expected_code=$2
  local retries=0
  
  while [ $retries -lt $MAX_RETRIES ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $endpoint || echo "000")
    
    if [ "$HTTP_CODE" == "$expected_code" ]; then
      return 0
    fi
    
    retries=$((retries + 1))
    echo "Attempt $retries/$MAX_RETRIES: HTTP $HTTP_CODE (expected $expected_code)"
    sleep $RETRY_INTERVAL
  done
  
  return 1
}

# Check health endpoint
echo "Checking health endpoint..."
if check_endpoint "$SERVICE_URL/health/live" "200"; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed after $MAX_RETRIES attempts"
  exit 1
fi

# Check readiness endpoint
echo "Checking readiness endpoint..."
if check_endpoint "$SERVICE_URL/health/ready" "200"; then
  echo "✅ Readiness check passed"
else
  echo "❌ Readiness check failed after $MAX_RETRIES attempts"
  exit 1
fi

# Check metrics endpoint
echo "Checking metrics endpoint..."
if check_endpoint "$SERVICE_URL/metrics" "200"; then
  echo "✅ Metrics endpoint accessible"
else
  echo "⚠️  Metrics endpoint not accessible (non-critical)"
fi

# Run load test (simple)
echo "Running basic load test..."
for i in {1..10}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $SERVICE_URL/health/live)
  if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Load test failed on request $i"
    exit 1
  fi
done
echo "✅ Basic load test passed (10 requests)"

echo ""
echo "🎉 All health checks passed for $COLOR deployment!"
exit 0
