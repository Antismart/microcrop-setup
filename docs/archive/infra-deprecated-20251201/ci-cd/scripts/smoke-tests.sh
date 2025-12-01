#!/bin/bash
# Smoke tests for backend deployment
# Usage: ./smoke-tests.sh <environment>

set -e

ENVIRONMENT=${1:-staging}
BASE_URL=""

case "$ENVIRONMENT" in
  staging)
    BASE_URL="https://api-staging.microcrop.io"
    ;;
  production)
    BASE_URL="https://api.microcrop.io"
    ;;
  green|blue)
    # For blue-green deployment testing
    BASE_URL="http://backend-service-$ENVIRONMENT.microcrop.svc.cluster.local"
    ;;
  *)
    echo "Unknown environment: $ENVIRONMENT"
    exit 1
    ;;
esac

echo "Running smoke tests against: $BASE_URL"

# Test 1: Health check
echo "Test 1: Health check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health/live)
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Health check failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo "✅ Health check passed"

# Test 2: Readiness check
echo "Test 2: Readiness check..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health/ready)
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Readiness check failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo "✅ Readiness check passed"

# Test 3: API version endpoint
echo "Test 3: API version..."
RESPONSE=$(curl -s $BASE_URL/api/version)
if [ -z "$RESPONSE" ]; then
  echo "❌ API version endpoint failed"
  exit 1
fi
echo "✅ API version: $RESPONSE"

# Test 4: Database connectivity
echo "Test 4: Database connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health/db)
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Database connectivity failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo "✅ Database connectivity passed"

# Test 5: Redis connectivity
echo "Test 5: Redis connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health/redis)
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Redis connectivity failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo "✅ Redis connectivity passed"

# Test 6: RabbitMQ connectivity
echo "Test 6: RabbitMQ connectivity..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/health/rabbitmq)
if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ RabbitMQ connectivity failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo "✅ RabbitMQ connectivity passed"

# Test 7: Sample API endpoint
echo "Test 7: Sample API endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/farmers?limit=1)
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "401" ]; then
  echo "❌ API endpoint failed (HTTP $HTTP_CODE)"
  exit 1
fi
echo "✅ API endpoint responsive"

echo ""
echo "🎉 All smoke tests passed!"
exit 0
