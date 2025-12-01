# ⚡ Quick Start: Fix Render Deployment

## 🚨 Current Issue

Your backend is **failing because environment variables are missing**:
- ❌ `DATABASE_URL` not set (trying to connect to localhost)
- ❌ Redis trying to connect to localhost (now optional with latest fix)

---

## ✅ Immediate Fix (5 Minutes)

### **Step 1: Create PostgreSQL Database**

1. **Go to Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in:
   ```
   Name: microcrop-db
   Database: microcrop
   User: microcrop_user
   Region: Oregon (same as your backend)
   Plan: Starter ($7/month)
   ```
4. Click **"Create Database"**
5. **Wait 1-2 minutes** for it to provision

### **Step 2: Copy Database URL**

1. Click on your new `microcrop-db` database
2. Scroll to **"Connections"** section
3. **Copy the "Internal Database URL"** (it looks like):
   ```
   postgresql://microcrop_user:xxxxx@dpg-xxxxx-a/microcrop_xxxxx
   ```

### **Step 3: Add to Backend Environment**

1. Go to your backend service (microcrop-backend)
2. Click **"Environment"** tab
3. Click **"Add Environment Variable"**
4. Add these variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | [Paste the Internal Database URL from Step 2] |
   | `JWT_SECRET` | `your-super-secret-key-change-this-in-production` |
   | `BASE_DOMAIN` | `microcrop.app` |

5. Click **"Save Changes"**

### **Step 4: Trigger Redeploy**

1. In your backend service, click **"Manual Deploy"**
2. Select **"Clear build cache & deploy"**
3. Wait 2-3 minutes

---

## ✅ What Was Fixed in Latest Push

### **Redis Now Optional**
- ✅ Backend no longer crashes if Redis isn't configured
- ✅ Falls back to no-cache mode
- ✅ Logs warning instead of error

To add Redis later (optional):
1. Create Redis on Render: **New +** → **Redis**
2. Copy the connection URL
3. Add environment variable: `REDIS_URL` = [connection URL]

---

## 📋 All Environment Variables (Reference)

### **Required (Minimum to Run)**
```bash
NODE_ENV=production
PORT=10000  # Render sets this automatically
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=your_secret_key_here
BASE_DOMAIN=microcrop.app
```

### **Optional (Can Add Later)**
```bash
# Redis (for caching)
REDIS_URL=redis://default:xxxxx@red-xxxxx:6379

# Africa's Talking (for USSD/SMS)
AT_USERNAME=your_username
AT_API_KEY=your_api_key  
AT_SHORTCODE=*384*12345#

# WeatherXM (for weather data)
WEATHERXM_API_KEY=your_key
WEATHERXM_API_URL=https://pro.weatherxm.com/api/v1

# Swypt (for payments)
SWYPT_API_KEY=your_key
SWYPT_API_SECRET=your_secret
SWYPT_API_URL=https://pool.swypt.io/api

# Blockchain (Base Network)
NETWORK=base
RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
CONTRACT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...
```

---

## 🎯 Expected Result

After following steps above, your logs should show:

```
✓ Build successful
✓ Deploying...
✓ Running 'node src/server.js'

╔═══════════════════════════════════════╗
║   MicroCrop Backend Server Running    ║
╚═══════════════════════════════════════╝
  
  Environment: production
  Port: 10000
  Health Check: https://your-app.onrender.com/health
  
  Ready to serve requests...

ℹ Redis not configured - running without cache
✓ Database connected successfully
Server running on port 10000
```

---

## 🧪 Test Your Deployment

Once deployed successfully, test:

```bash
# Check health endpoint
curl https://your-app.onrender.com/health

# Should return:
{
  "status": "ok",
  "timestamp": "2025-12-01T15:30:00.000Z",
  "database": "connected"
}
```

---

## 🚨 Still Having Issues?

### **Database Connection Error**
```
Error: P1001: Can't reach database server
```

**Fix**: 
- Use **Internal Database URL**, not External
- Ensure DATABASE_URL includes `?sslmode=require`
- Check database and backend are in same region

### **Build Succeeds But Server Crashes**
```
Error: Environment variable validation failed
```

**Fix**:
- Double-check all required env vars are set
- Make sure `NODE_ENV=production`
- Verify no typos in variable names (case-sensitive)

### **Port Binding Error**
```
Error: EADDRINUSE
```

**Fix**: 
- Make sure your code uses: `process.env.PORT`
- Render assigns port automatically (usually 10000)

---

## 📚 Next Steps After Deployment Works

1. ✅ Test all API endpoints
2. ✅ Add Redis for caching (optional)
3. ✅ Configure Africa's Talking for USSD
4. ✅ Set up monitoring/alerts
5. ✅ Connect frontend to backend API

---

**Last Updated**: December 1, 2025  
**Latest Fix**: Redis is now optional, won't crash server  
**Commit**: 8b9cbe0
