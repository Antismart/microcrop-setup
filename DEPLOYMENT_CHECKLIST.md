# 🚀 Render Deployment Checklist

## Status: ⏳ Waiting for Your Configuration

### ✅ Completed (Automatic)
- [x] Code pushed to GitHub (commit: 2959359)
- [x] Prisma Client import fixed
- [x] Build script configured
- [x] Redis made optional
- [x] Render will auto-detect push and start building

### ⚠️ **ACTION REQUIRED: You Must Configure These**

#### **Step 1: Create PostgreSQL Database** (3 minutes)

Go to: https://dashboard.render.com

- [ ] Click **"New +"** → **"PostgreSQL"**
- [ ] Name: `microcrop-db`
- [ ] Region: **Oregon** (same as backend)
- [ ] Plan: **Starter** ($7/month)
- [ ] Click **"Create Database"**
- [ ] ⏳ Wait 1-2 minutes for provisioning

#### **Step 2: Get Database Connection String** (1 minute)

- [ ] Click on your new `microcrop-db` database
- [ ] Scroll to **"Connections"** section  
- [ ] Find **"Internal Database URL"**
- [ ] Click **"Copy"** button (looks like):
  ```
  postgresql://microcrop_user:password123@dpg-xxxxx-a/microcrop_xxxxx
  ```

#### **Step 3: Add Environment Variables** (2 minutes)

Go to your backend service: https://dashboard.render.com/web/[your-service-name]

- [ ] Click **"Environment"** tab on left
- [ ] Click **"Add Environment Variable"**

Add these **4 required variables**:

| Variable Name | Value | Where to Get It |
|--------------|-------|-----------------|
| `NODE_ENV` | `production` | Type manually |
| `DATABASE_URL` | `postgresql://...` | Paste from Step 2 |
| `JWT_SECRET` | `your-random-secret-key` | Generate a random string |
| `BASE_DOMAIN` | `microcrop.app` | Your domain name |

- [ ] Click **"Save Changes"**

#### **Step 4: Trigger Redeploy** (1 minute)

- [ ] Stay in your backend service
- [ ] Click **"Manual Deploy"** button (top right)
- [ ] Select **"Clear build cache & deploy"**
- [ ] Click **"Deploy"**
- [ ] ⏳ Wait 2-3 minutes for build + deploy

#### **Step 5: Verify Deployment** (1 minute)

- [ ] Check **"Logs"** tab
- [ ] Look for these success messages:
  ```
  ✓ Build successful
  ✓ Database connected successfully
  Server running on port 10000
  ```

- [ ] Test health endpoint:
  ```bash
  curl https://your-app.onrender.com/health
  ```

- [ ] Should return:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-12-01T15:30:00.000Z",
    "database": "connected"
  }
  ```

---

## 🎉 Success Criteria

Your deployment is successful when you see:

```
╔═══════════════════════════════════════╗
║   MicroCrop Backend Server Running    ║
╚═══════════════════════════════════════╝
  
  Environment: production
  Port: 10000
  
ℹ Redis not configured - running without cache
✓ Database connected successfully
Server running on port 10000
```

---

## 🐛 If Something Goes Wrong

### **Database Connection Error**
```
Error: P1001: Can't reach database server
```

**Fix**: 
- Make sure you copied the **Internal Database URL** (not External)
- Verify DATABASE_URL is set correctly in Environment tab
- Check both database and backend are in **Oregon** region

### **Still Shows Development Mode**
```
Environment: development
```

**Fix**:
- Set `NODE_ENV=production` in Environment variables
- Redeploy after saving

### **Build Succeeds But Server Crashes Immediately**
```
Error: Environment variable validation failed
```

**Fix**:
- Check all 4 required variables are set
- Verify no typos (case-sensitive!)
- Make sure values don't have extra spaces

---

## 📊 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Backend (Web Service) | Starter | $7/month |
| PostgreSQL Database | Starter | $7/month |
| Redis (Optional) | Free | $0/month |
| **Total** | | **$14/month** |

---

## 🔗 Quick Links

- **Render Dashboard**: https://dashboard.render.com
- **Your Backend Service**: https://dashboard.render.com/web/[your-service]
- **PostgreSQL Databases**: https://dashboard.render.com/postgres
- **Docs**: `backend/QUICK_FIX.md` (detailed guide)
- **Deployment Guide**: `backend/RENDER_DEPLOYMENT.md` (comprehensive)

---

## ⏭️ After Successful Deployment

1. [ ] Update frontend env: `NEXT_PUBLIC_API_URL=https://your-app.onrender.com`
2. [ ] Test API endpoints from frontend
3. [ ] Add Redis for caching (optional)
4. [ ] Configure Africa's Talking for USSD/SMS
5. [ ] Set up monitoring and alerts

---

**Generated**: December 1, 2025  
**Latest Push**: 2959359 (Redis optional fix)  
**Waiting For**: Your environment variable configuration
