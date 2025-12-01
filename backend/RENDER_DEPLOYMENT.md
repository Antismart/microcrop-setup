# 🚀 Render Deployment Guide - MicroCrop Backend

## ❌ Fixed Issue: Prisma Client Not Found

The deployment was failing with:
```
Error: Cannot find module '../../generated/prisma'
```

### ✅ What Was Fixed

1. **Updated Prisma Client Import** (`src/config/database.js`)
   - Changed from: `require('../../generated/prisma')`
   - Changed to: `require('@prisma/client')`
   - Uses the standard Prisma Client location in `node_modules`

2. **Added Build Script** (`package.json`)
   - Added: `"build": "prisma generate && prisma migrate deploy"`
   - Generates Prisma Client and runs migrations during deployment

3. **Updated Render Configuration** (`render.yaml`)
   - Changed build command to: `npm install && npm run build`
   - Ensures Prisma Client is generated before starting

---

## 🚀 Deployment Steps

### **Prerequisites**

Before deploying, ensure you have:
- ✅ PostgreSQL database (Render PostgreSQL or external)
- ✅ Redis instance (optional, for caching)
- ✅ Environment variables configured

---

### **Option 1: Deploy via Render Dashboard** (Recommended)

#### **Step 1: Create Web Service**

1. **Go to Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository: `Antismart/microcrop-setup`
4. Configure:
   ```
   Name: microcrop-backend
   Region: Oregon (or closest to your users)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   Plan: Starter ($7/month)
   ```

#### **Step 2: Configure Environment Variables**

Add these in **Environment** tab:

```bash
# Required - Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Required - Server
NODE_ENV=production
PORT=3000
BASE_DOMAIN=microcrop.app
JWT_SECRET=your_super_secret_jwt_key_change_this

# Required - Africa's Talking (USSD/SMS)
AT_USERNAME=your_username
AT_API_KEY=your_api_key
AT_SHORTCODE=*384*12345#

# Optional - WeatherXM (Weather Data)
WEATHERXM_API_KEY=your_key
WEATHERXM_API_URL=https://pro.weatherxm.com/api/v1

# Optional - Spexi (Satellite Imagery)
SPEXI_API_KEY=your_key
SPEXI_API_URL=https://api.spexi.com/v1

# Optional - Swypt (USDC Payments)
SWYPT_API_KEY=your_key
SWYPT_API_SECRET=your_secret
SWYPT_API_URL=https://pool.swypt.io/api
SWYPT_PROJECT_NAME=microcrop
TREASURY_WALLET_ADDRESS=0x0000000000000000000000000000000000000000

# Optional - Blockchain (Base Network)
NETWORK=base
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
CONTRACT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...
USDC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Optional - Redis (for caching)
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# Optional - RabbitMQ (for message queue)
RABBITMQ_URL=amqp://user:password@host:5672
```

#### **Step 3: Create PostgreSQL Database**

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   ```
   Name: microcrop-db
   Plan: Starter ($7/month)
   PostgreSQL Version: 15
   ```
3. **Copy the Internal Database URL**
4. Paste into your backend's `DATABASE_URL` environment variable

#### **Step 4: Deploy**

1. Click **"Create Web Service"**
2. Wait for deployment (2-5 minutes)
3. Check logs for errors

---

### **Option 2: Deploy via Render Blueprint** (Infrastructure as Code)

#### **Step 1: Update render.yaml**

The `render.yaml` file is already configured. Just update environment variables:

```yaml
services:
  - type: web
    name: microcrop-backend
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: microcrop-db
          property: connectionString
      # Add more variables...
```

#### **Step 2: Deploy Blueprint**

1. Go to: https://dashboard.render.com/blueprints
2. Click **"New Blueprint Instance"**
3. Connect repository: `Antismart/microcrop-setup`
4. Select branch: `main`
5. Set root directory: `backend`
6. Fill in environment variables
7. Click **"Apply"**

---

## 🔍 Verifying Deployment

### **Step 1: Check Health Endpoint**

```bash
curl https://your-app.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T15:00:00.000Z",
  "uptime": 123.456,
  "database": "connected"
}
```

### **Step 2: Check Logs**

In Render Dashboard:
1. Go to your service
2. Click **"Logs"** tab
3. Look for:
   ```
   ✓ Database connected successfully
   ✓ Redis connected
   Server running on port 3000
   ```

### **Step 3: Test API Endpoints**

```bash
# Test USSD endpoint
curl -X POST https://your-app.onrender.com/api/ussd \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"123","phoneNumber":"+254712345678","text":""}'

# Test Auth endpoint
curl https://your-app.onrender.com/api/auth/health
```

---

## 🐛 Troubleshooting Common Issues

### **Issue 1: Build Fails - Prisma Generate Error**

**Error**:
```
Error: Cannot find module '@prisma/client'
```

**Solution**:
1. Ensure `build` script exists in `package.json`:
   ```json
   "build": "prisma generate && prisma migrate deploy"
   ```
2. Verify build command in Render: `npm install && npm run build`
3. Check `prisma` is in `dependencies`, not `devDependencies`

---

### **Issue 2: Database Connection Failed**

**Error**:
```
Error: P1001: Can't reach database server
```

**Solution**:
1. **Check DATABASE_URL format**:
   ```
   postgresql://user:password@host:port/database?sslmode=require
   ```
2. **Ensure SSL is enabled** (Render PostgreSQL requires SSL):
   ```
   DATABASE_URL=postgresql://...?sslmode=require
   ```
3. **Use Internal Database URL** if database is on Render:
   - Not: `postgres-production-XXXX.render.com` (external)
   - Use: Internal connection string from database settings

---

### **Issue 3: Migrations Fail on Deploy**

**Error**:
```
Error: Migration failed to apply
```

**Solution**:
1. **Apply migrations manually** first time:
   ```bash
   # Connect to Render Shell
   npm run prisma:migrate:deploy
   ```
2. **Or skip migrations** in build (if already applied):
   ```json
   "build": "prisma generate"
   ```
3. **Check migration history**:
   ```bash
   npx prisma migrate status
   ```

---

### **Issue 4: Environment Variables Not Loading**

**Error**:
```
undefined is not a valid value for BASE_DOMAIN
```

**Solution**:
1. **Check variable names** (case-sensitive)
2. **Restart service** after adding variables
3. **Verify in logs**:
   ```javascript
   console.log('BASE_DOMAIN:', process.env.BASE_DOMAIN)
   ```

---

### **Issue 5: Port Already in Use**

**Error**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:
- Render automatically sets `PORT` environment variable
- Your code should use: `process.env.PORT || 3000`
- Check `src/server.js`:
  ```javascript
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
  ```

---

## 📊 Monitoring & Logs

### **View Logs**
```bash
# Real-time logs
render logs -f -s microcrop-backend

# Last 100 lines
render logs -n 100 -s microcrop-backend
```

### **Check Metrics**
- CPU Usage: Dashboard → Metrics → CPU
- Memory: Dashboard → Metrics → Memory
- Response Time: Dashboard → Metrics → Response Time

### **Set Up Alerts**
1. Dashboard → Settings → Notifications
2. Add email for deployment failures
3. Add Slack webhook for critical errors

---

## 🔄 CI/CD - Auto Deploy on Push

Render automatically deploys when you push to `main` branch:

1. **Make changes locally**
2. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat: add new endpoint"
   git push origin main
   ```
3. **Render detects push** and rebuilds automatically
4. **Check deployment status** in Dashboard

### **Disable Auto-Deploy** (Optional)
1. Dashboard → Settings → Build & Deploy
2. Toggle **"Auto-Deploy"** off
3. Deploy manually: Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## 🔐 Security Best Practices

### **1. Environment Variables**
- ✅ Never commit `.env` files
- ✅ Use Render's encrypted environment variables
- ✅ Rotate secrets regularly (JWT_SECRET, API keys)

### **2. Database Security**
- ✅ Use strong passwords
- ✅ Enable SSL connections (`sslmode=require`)
- ✅ Regularly backup database

### **3. API Security**
- ✅ Enable CORS only for your domains
- ✅ Use Helmet.js for security headers
- ✅ Implement rate limiting
- ✅ Validate all inputs

### **4. SSL/HTTPS**
- ✅ Automatic with Render (free SSL)
- ✅ Force HTTPS redirects
- ✅ Use HSTS headers

---

## 📈 Scaling

### **Vertical Scaling** (More Resources)
1. Dashboard → Settings → Plan
2. Upgrade to **Standard** ($25/month) or **Pro** ($85/month)
3. More CPU/RAM for better performance

### **Horizontal Scaling** (Multiple Instances)
1. Dashboard → Settings → Scaling
2. Increase **Instance Count** (2-10 instances)
3. Render handles load balancing automatically

### **Database Scaling**
1. Upgrade PostgreSQL plan for more storage
2. Enable connection pooling (PgBouncer)
3. Consider read replicas for heavy read loads

---

## 🔗 Connect Frontend to Backend

### **Update Dashboard Environment Variables**

In Vercel Dashboard:
```bash
NEXT_PUBLIC_API_URL=https://microcrop-backend.onrender.com
```

### **Update Backend CORS**

In `backend/src/config/index.js`:
```javascript
corsOrigins: [
  'https://microcrop.app',
  'https://network.microcrop.app',
  'https://portal.microcrop.app',
  // Render frontend preview URLs
  'https://microcrop-dashboard.vercel.app',
]
```

### **Test Connection**

From browser console (on your deployed frontend):
```javascript
fetch('https://microcrop-backend.onrender.com/health')
  .then(r => r.json())
  .then(console.log)
```

---

## 📚 Additional Resources

- [Render Node.js Documentation](https://render.com/docs/deploy-node-express-app)
- [Prisma Deploy Documentation](https://www.prisma.io/docs/guides/deployment)
- [Backend API Documentation](./docs/api/README.md)
- [Environment Setup Guide](./docs/setup/ENV_SETUP.md)

---

## 🆘 Still Having Issues?

1. **Check Render Status**: https://status.render.com
2. **Review deployment logs**: Dashboard → Logs
3. **Test locally first**:
   ```bash
   cd backend
   npm install
   npm run build
   npm start
   ```
4. **Contact Render Support**: https://render.com/support

---

**Last Updated**: December 1, 2025  
**Status**: ✅ Prisma Import Fixed - Ready for Deployment
