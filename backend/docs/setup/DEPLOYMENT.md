# MicroCrop Backend Deployment Guide

## Overview

The MicroCrop backend is a Node.js/Express application that provides:
- **USSD Interface** for farmers (via Africa's Talking)
- **Admin APIs** for cooperatives and administrators
- **Business Logic** for damage assessment and payout processing
- **Payment Integration** with M-Pesa via Swypt
- **Smart Contract Integration** on Base blockchain

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MicroCrop Backend                      │
│                  (Node.js/Express)                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │     USSD     │  │   Admin API  │  │   Workers    │  │
│  │   (Africa's  │  │  (REST API)  │  │   (Bull      │  │
│  │   Talking)   │  │              │  │   Queue)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │          Services (Weather, Biomass, etc)          │ │
│  │        Call data-processor via API                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌──────────┐         ┌──────────┐        ┌──────────┐
  │PostgreSQL│         │  Redis   │        │data-proc │
  │          │         │ (Queue)  │        │  API     │
  └──────────┘         └──────────┘        └──────────┘
```

## Prerequisites

1. **Data Processor API** must be deployed first
2. **Smart Contracts** must be deployed to Base blockchain
3. **Africa's Talking** account with USSD shortcode
4. **Swypt** account for M-Pesa payments
5. **Pinata** account for IPFS storage

## Deployment Options

### Option 1: Render (Recommended)

**Cost**: $21-31/month
- Web Service: $7/month
- Worker Service: $7/month
- PostgreSQL: $7/month
- Redis: $10/month (via dashboard)

**Steps**:

1. **Fork the repository** or push to GitHub

2. **Create Render account** at https://render.com

3. **Create Redis instance**:
   ```bash
   # Via Render Dashboard
   - Go to Dashboard → New → Redis
   - Name: microcrop-redis
   - Plan: Starter ($10/month)
   - Region: Oregon
   - Create Redis
   ```

4. **Deploy using Blueprint**:
   ```bash
   # Push render.yaml to repo
   git add backend/render.yaml
   git commit -m "Add Render deployment config"
   git push
   
   # In Render Dashboard
   - Go to Dashboard → Blueprints → New Blueprint
   - Connect repository
   - Select backend/render.yaml
   - Apply
   ```

5. **Set environment variables** in Render Dashboard:
   ```
   INTERNAL_API_TOKEN=<generate secure token>
   AFRICASTALKING_API_KEY=<from africa's talking>
   AFRICASTALKING_USERNAME=<your username>
   SWYPT_API_KEY=<from swypt>
   SWYPT_SECRET_KEY=<from swypt>
   PRIVATE_KEY=<blockchain wallet private key>
   PINATA_API_KEY=<from pinata>
   PINATA_SECRET_KEY=<from pinata>
   ```

6. **Run database migrations**:
   ```bash
   # In Render Shell (Dashboard → microcrop-backend → Shell)
   npm run prisma:migrate:deploy
   npm run db:seed  # Optional: seed initial data
   ```

7. **Configure Africa's Talking webhook**:
   ```
   Callback URL: https://microcrop-backend.onrender.com/api/ussd
   Method: POST
   ```

### Option 2: Railway

**Cost**: $20-30/month
- Web + Worker: $5-10/month (usage-based)
- PostgreSQL: $5/month
- Redis: $5/month

**Steps**:

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize project**:
   ```bash
   cd backend
   railway init
   ```

3. **Add services**:
   ```bash
   # Add PostgreSQL
   railway add --database postgres
   
   # Add Redis
   railway add --database redis
   
   # Link database
   railway link
   ```

4. **Set environment variables**:
   ```bash
   railway variables set DATA_PROCESSOR_URL=https://your-data-processor.railway.app
   railway variables set INTERNAL_API_TOKEN=<generate-token>
   railway variables set AFRICASTALKING_API_KEY=<key>
   railway variables set AFRICASTALKING_USERNAME=<username>
   railway variables set SWYPT_API_KEY=<key>
   railway variables set SWYPT_SECRET_KEY=<secret>
   railway variables set PRIVATE_KEY=<blockchain-key>
   railway variables set CONTRACT_ADDRESS=<contract-address>
   railway variables set PINATA_API_KEY=<key>
   railway variables set PINATA_SECRET_KEY=<secret>
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

6. **Run migrations**:
   ```bash
   railway run npm run prisma:migrate:deploy
   railway run npm run db:seed
   ```

7. **Start workers** (separate service):
   ```bash
   # In Railway dashboard, create new service
   # Set start command: npm run workers
   # Use same environment variables
   ```

### Option 3: Fly.io

**Cost**: $15-25/month
- App: $5-10/month
- PostgreSQL: $5/month
- Redis: $5/month

**Steps**:

1. **Install Fly CLI**:
   ```bash
   brew install flyctl  # macOS
   # or
   curl -L https://fly.io/install.sh | sh
   
   fly auth login
   ```

2. **Create fly.toml**:
   ```bash
   cd backend
   fly launch --no-deploy
   ```

3. **Configure fly.toml**:
   ```toml
   app = "microcrop-backend"
   primary_region = "jnb"  # Johannesburg (closest to Kenya)
   
   [build]
     [build.args]
       NODE_VERSION = "18"
   
   [env]
     NODE_ENV = "production"
     PORT = "8080"
   
   [[services]]
     http_checks = []
     internal_port = 8080
     processes = ["app"]
     protocol = "tcp"
   
     [[services.ports]]
       port = 80
       handlers = ["http"]
   
     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   
   [processes]
     app = "npm start"
     worker = "npm run workers"
   ```

4. **Add PostgreSQL and Redis**:
   ```bash
   fly postgres create --name microcrop-db
   fly postgres attach microcrop-db
   
   fly redis create --name microcrop-redis
   fly redis attach microcrop-redis
   ```

5. **Set secrets**:
   ```bash
   fly secrets set \\
     INTERNAL_API_TOKEN=<token> \\
     AFRICASTALKING_API_KEY=<key> \\
     AFRICASTALKING_USERNAME=<username> \\
     SWYPT_API_KEY=<key> \\
     SWYPT_SECRET_KEY=<secret> \\
     PRIVATE_KEY=<blockchain-key> \\
     PINATA_API_KEY=<key> \\
     PINATA_SECRET_KEY=<secret>
   ```

6. **Deploy**:
   ```bash
   fly deploy
   ```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://...` |
| `DATA_PROCESSOR_URL` | Data processor API URL | `https://data-proc.onrender.com` |
| `INTERNAL_API_TOKEN` | Token for backend↔data-processor auth | Generate secure token |
| `CONTRACT_ADDRESS` | MicroCrop smart contract address | `0x...` |
| `PRIVATE_KEY` | Blockchain wallet private key | `0x...` |
| `RPC_URL` | Base RPC endpoint | `https://base-sepolia.g.alchemy.com/v2/...` |

### Africa's Talking

| Variable | Description |
|----------|-------------|
| `AFRICASTALKING_USERNAME` | Your AT username |
| `AFRICASTALKING_API_KEY` | API key from AT dashboard |
| `AFRICASTALKING_SHORTCODE` | USSD shortcode (e.g., `*384*12345#`) |

### Swypt (M-Pesa)

| Variable | Description |
|----------|-------------|
| `SWYPT_API_KEY` | API key from Swypt |
| `SWYPT_SECRET_KEY` | Secret key from Swypt |
| `SWYPT_MERCHANT_ID` | Your merchant ID |

### IPFS/Pinata

| Variable | Description |
|----------|-------------|
| `PINATA_API_KEY` | Pinata API key |
| `PINATA_SECRET_KEY` | Pinata secret key |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `JWT_SECRET` | JWT signing secret | Auto-generated |
| `WEATHERXM_WEBHOOK_API_KEY` | WeatherXM webhook auth | Auto-generated |

## Post-Deployment

### 1. Run Database Migrations

```bash
# Render
npm run prisma:migrate:deploy

# Railway
railway run npm run prisma:migrate:deploy

# Fly.io
fly ssh console -C "npm run prisma:migrate:deploy"
```

### 2. Seed Initial Data (Optional)

```bash
# Create admin user, sample crops, etc.
npm run db:seed
```

### 3. Configure Webhooks

**Africa's Talking**:
- Login to AT dashboard
- Go to USSD → Callback URLs
- Set callback: `https://your-backend.onrender.com/api/ussd`

**WeatherXM** (if using webhooks):
- Contact WeatherXM support
- Provide webhook URL: `https://your-backend.onrender.com/api/weather/webhook`
- Provide API key: value of `WEATHERXM_WEBHOOK_API_KEY`

### 4. Test USSD Flow

Dial your USSD code (e.g., `*384*12345#`) from a Kenyan mobile number and verify:
- Registration flow works
- Policy purchase works
- Balance check works
- Payment via M-Pesa works

### 5. Monitor Logs

```bash
# Render
# Dashboard → microcrop-backend → Logs

# Railway
railway logs

# Fly.io
fly logs
```

## Troubleshooting

### Database Connection Issues

```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
npm run prisma:studio
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

### Worker Not Processing Jobs

```bash
# Check worker logs
# Verify REDIS_URL is set correctly
# Check Bull queue dashboard: npm run bull-board
```

### USSD Not Working

1. Check Africa's Talking callback URL is correct
2. Verify API key is valid
3. Check logs for incoming requests
4. Test with AT simulator first

### Payment Failing

1. Verify Swypt credentials
2. Check phone number format (254XXXXXXXXX)
3. Test with small amount first (1 KES)
4. Check Swypt dashboard for transaction status

## Scaling

### Horizontal Scaling (More Instances)

```bash
# Render: Dashboard → Settings → Scaling
# Set instances: 2-5

# Railway: Auto-scales based on load

# Fly.io
fly scale count 3
```

### Vertical Scaling (More Resources)

```bash
# Render: Upgrade to Standard plan ($25/month)
# Railway: Auto-scales resources
# Fly.io
fly scale memory 1024  # 1GB RAM
```

## Cost Optimization

1. **Start with Starter plans** ($7-10/month per service)
2. **Monitor usage** with platform dashboards
3. **Scale workers** separately from API
4. **Use caching** (Redis) to reduce DB queries
5. **Optimize Bull queue** settings for your load

## Security Checklist

- [ ] All secrets set as environment variables (not in code)
- [ ] `PRIVATE_KEY` never committed to git
- [ ] JWT_SECRET is strong and unique
- [ ] HTTPS enabled (automatic on all platforms)
- [ ] Database backups enabled
- [ ] API rate limiting configured
- [ ] CORS configured for dashboard domain only
- [ ] Africa's Talking callback URL uses HTTPS

## Monitoring

### Health Check

```bash
curl https://your-backend.onrender.com/health
# Should return: {"status": "ok", "timestamp": "..."}
```

### Queue Monitoring

Install Bull Board for queue visualization:

```bash
npm install bull-board
```

Access at: `https://your-backend.onrender.com/admin/queues`

### Application Monitoring

Consider adding:
- **Sentry** for error tracking
- **DataDog** for APM
- **LogDNA** for log aggregation

## Support

- **Documentation**: See `/backend/README.md`
- **API Docs**: See `/backend/ADMIN_API_DOCUMENTATION.md`
- **Issues**: GitHub Issues
- **Slack**: #microcrop-dev

## Next Steps

1. Deploy data-processor service first
2. Deploy this backend service
3. Deploy admin dashboard
4. Configure webhooks
5. Test end-to-end flow
6. Monitor and scale as needed
