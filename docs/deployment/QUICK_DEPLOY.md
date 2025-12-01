# 🚀 Quick Deploy Guide - MicroCrop

Choose your platform and deploy in minutes!

---

## Option 1: Railway (Easiest) ⭐ RECOMMENDED FOR MVP

**Cost**: $34-59/month | **Time**: 5 minutes

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Go to backend directory
cd data-processor

# Initialize and deploy
railway init
railway add --database postgres
railway add --database redis
railway up

# Set secrets
railway variables set PLANET_API_KEY="your_key"
railway variables set BACKEND_API_TOKEN_SECRET="$(openssl rand -hex 32)"
railway variables set GCS_BUCKET_NAME="your_bucket"
railway variables set GCS_CREDENTIALS='{"type":"service_account",...}'
railway variables set PINATA_JWT="your_jwt"

# Run migration
railway run psql $DATABASE_URL -f migrations/001_planet_subscriptions.sql

# Generate CRE token
railway run python src/api/auth.py
# Copy token to cre-workflow/.env
```

**Done!** Backend API at `https://your-project.railway.app`

---

## Option 2: Render (Good UI)

**Cost**: $35-60/month | **Time**: 10 minutes

```bash
# 1. Push code with render.yaml
git add render.yaml
git commit -m "Add Render deployment"
git push origin main

# 2. Go to dashboard.render.com
# - New → Blueprint
# - Connect GitHub: Antismart/microcrop-setup
# - Select render.yaml
# - Click "Apply"

# 3. Set secrets in dashboard:
# - PLANET_API_KEY
# - GCS_CREDENTIALS (JSON)
# - PINATA_JWT

# 4. Get shell access for migration
# Services → microcrop-backend-api → Shell
psql $DATABASE_URL -f migrations/001_planet_subscriptions.sql

# 5. Generate CRE token
python src/api/auth.py
# Copy to cre-workflow/.env
```

**Done!** Backend API at `https://microcrop-backend-api.onrender.com`

---

## Option 3: Fly.io (Production/Global)

**Cost**: $54-133/month | **Time**: 15 minutes

```bash
# Install CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Go to backend directory
cd data-processor

# Launch (creates fly.toml)
fly launch --no-deploy
# App name: microcrop-backend-api
# Region: jnb (Johannesburg - closest to Kenya)

# Set secrets
fly secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="redis://..." \
  PLANET_API_KEY="your_key" \
  BACKEND_API_TOKEN_SECRET="$(openssl rand -hex 32)" \
  GCS_BUCKET_NAME="your_bucket" \
  GCS_CREDENTIALS='{"type":"service_account",...}' \
  PINATA_JWT="your_jwt"

# Deploy
fly deploy

# Scale to production (optional)
fly scale count 2
fly regions add iad ams  # Add US + Europe

# Run migration
fly ssh console
psql $DATABASE_URL -f migrations/001_planet_subscriptions.sql
exit

# Generate CRE token
fly ssh console
cd data-processor
python src/api/auth.py
exit
```

**Done!** Backend API at `https://microcrop-backend-api.fly.dev`

---

## After Deployment (All Platforms)

### 1. Test Backend API
```bash
# Health check
curl https://your-backend-url/health

# API docs
open https://your-backend-url/docs

# Test biomass endpoint (needs CRE token)
curl -H "Authorization: Bearer YOUR_CRE_TOKEN" \
  https://your-backend-url/api/planet/biomass/1
```

### 2. Deploy CRE Workflow
```bash
cd cre-workflow

# Update .env
BACKEND_API_URL=https://your-backend-url
BACKEND_API_TOKEN=<token_from_python_script>
POLICY_MANAGER_ADDRESS=0x...
PAYOUT_RECEIVER_ADDRESS=0x...

# Test locally
bun run simulate

# Deploy to Chainlink DON
bun run deploy:staging
```

### 3. Deploy Dashboard
```bash
cd dashboard

# Update .env.local
NEXT_PUBLIC_POLICY_MANAGER=0x...
NEXT_PUBLIC_BACKEND_API=https://your-backend-url

# Deploy to Vercel
vercel deploy --prod
```

---

## Environment Variables Needed

### Required (Set Manually)
```bash
PLANET_API_KEY=your_key_from_planet.com
GCS_BUCKET_NAME=your-gcs-bucket
GCS_CREDENTIALS={"type":"service_account",...}
BACKEND_API_TOKEN_SECRET=<generate with: openssl rand -hex 32>
PINATA_JWT=your_jwt_from_pinata
```

### Auto-Generated (Platform Sets These)
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CELERY_BROKER_URL=redis://...
CELERY_RESULT_BACKEND=redis://...
PORT=8000
```

### Already Set (In Config Files)
```bash
WEATHERXM_API_KEY=154184a5-6634-405b-b237-b7d1e83557d3
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
BLOCKCHAIN_CHAIN_ID=8453
```

---

## Cost Summary

| Platform | MVP | Production | Best For |
|----------|-----|------------|----------|
| **Railway** | $34-59 | $60-100 | MVP, Budget |
| **Render** | $35-60 | $80-127 | Getting started |
| **Fly.io** | $54 | $80-133 | Production, Global |

vs **Old Kubernetes**: $593/month

**Savings**: 71-94% ($228-559/month)

---

## Troubleshooting

### Issue: `pip install` fails
**Solution**: Add `runtime.txt`:
```bash
echo "python-3.10.0" > runtime.txt
git commit -am "Add Python runtime"
git push
```

### Issue: Database connection fails
**Solution**: Check DATABASE_URL has `?sslmode=require`:
```bash
# Railway
railway variables set DATABASE_URL="postgresql://...?sslmode=require"

# Render/Fly.io - Set in dashboard
```

### Issue: Celery tasks not running
**Solution**: Verify Celery environment variables:
```bash
echo $CELERY_BROKER_URL  # Should be Redis URL
echo $CELERY_RESULT_BACKEND  # Should be Redis URL
```

### Issue: Out of memory
**Solution**: Upgrade instance:
```bash
# Railway: Auto-scales (pay per use)
# Render: Upgrade to Standard (2GB) in dashboard
# Fly.io: fly scale memory 1024
```

---

## Next Steps

1. ✅ Choose platform (Railway for MVP)
2. ✅ Deploy backend (5-15 minutes)
3. ✅ Run database migration
4. ✅ Generate CRE token
5. ✅ Test endpoints
6. ⏳ Deploy CRE workflow
7. ⏳ Deploy dashboard
8. ⏳ Test end-to-end with test policies

---

## Support

- **Full Guide**: [MANAGED_PLATFORM_DEPLOYMENT.md](./MANAGED_PLATFORM_DEPLOYMENT.md)
- **Railway Guide**: [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)
- **Architecture**: [README.md](./README.md)

---

**Total time from clone to deployed**: 30-60 minutes 🚀
