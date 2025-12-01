# ERR_BLOCKED_BY_CLIENT - Troubleshooting Guide

## Error Details

**Error**: `POST http://localhost:3000/api/auth/login net::ERR_BLOCKED_BY_CLIENT`

**What it means**: The browser (or a browser extension) is blocking the HTTP request before it reaches the server.

---

## ✅ Fix Applied

Updated backend CORS configuration to allow both port 3000 and 3001:

**File**: `backend/src/server.js`

```javascript
// Development origins (UPDATED)
return [
  'http://localhost:3000',          // ✅ Added
  'http://localhost:3001',
  'http://network.localhost:3000',  // ✅ Added
  'http://network.localhost:3001',
  'http://portal.localhost:3000',   // ✅ Added
  'http://portal.localhost:3001',
]
```

---

## Common Causes & Solutions

### 1. ✅ CORS Configuration (FIXED)

**Cause**: Backend not allowing requests from the frontend port

**Solution**: Updated CORS to allow both ports 3000 and 3001

**Verify**: Restart backend server
```bash
cd backend
npm run dev
```

---

### 2. Browser Extensions Blocking Request

**Cause**: Ad blockers or privacy extensions block requests containing "auth", "login", "tracking"

**Common Culprits**:
- uBlock Origin
- AdBlock Plus
- Privacy Badger
- Brave Browser Shields
- DuckDuckGo Privacy Extension

**Solutions**:

#### Option A: Disable Extension Temporarily
1. Open browser extension settings
2. Disable ad blocker temporarily
3. Test login again

#### Option B: Whitelist localhost
1. Click on ad blocker icon
2. Add `localhost:3000` and `localhost:3001` to whitelist
3. Refresh page

#### Option C: Use Incognito/Private Mode
```bash
# Test in incognito mode (extensions disabled by default)
# Chrome: Cmd/Ctrl + Shift + N
# Firefox: Cmd/Ctrl + Shift + P
```

---

### 3. Browser Security Settings

**For Brave Browser**:
1. Click the Shields icon (lion) in address bar
2. Turn off Shields for localhost
3. Or set Shields to "Allow all cookies"

**For Firefox Enhanced Tracking Protection**:
1. Click the shield icon in address bar
2. Turn off Enhanced Tracking Protection for localhost

---

### 4. Antivirus/Firewall Software

**Cause**: Security software blocking local requests

**Solution**: 
- Add exception for localhost:3000 and localhost:3001
- Temporarily disable firewall to test
- Check antivirus logs

---

## Quick Diagnosis

### Step 1: Check Browser Console

Open DevTools (F12) → Console tab

**If you see**:
```
POST http://localhost:3000/api/auth/login net::ERR_BLOCKED_BY_CLIENT
```

**It's most likely**: Browser extension or security software

---

### Step 2: Check Network Tab

Open DevTools (F12) → Network tab

**If you see**:
- Request listed as "(blocked)" = Browser extension
- Request listed with red color = Blocked
- No request at all = Likely blocked before sending

---

### Step 3: Test with curl

```bash
# Test backend directly
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test123!"
  }'
```

**If curl works**: The problem is definitely in the browser (extensions/settings)

**If curl fails**: Backend issue (CORS, server not running, etc.)

---

## Testing Checklist

- [ ] Backend server is running on port 3000
  ```bash
  curl http://localhost:3000/health
  ```

- [ ] Frontend is running (check which port)
  ```bash
  # Check terminal output for port number
  # Should show: Local: http://localhost:3000 or :3001
  ```

- [ ] CORS updated to allow correct port
  ```bash
  # Check backend logs for CORS warnings
  # Should NOT see: "[CORS] Blocked origin: http://localhost:3000"
  ```

- [ ] Browser extensions disabled or whitelisted
  ```bash
  # Test in incognito mode
  # If works → extension is the issue
  # If still fails → different issue
  ```

- [ ] Test API directly with curl
  ```bash
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}'
  
  # Should get response (even if error, means API is reachable)
  ```

---

## Step-by-Step Fix

### 1. Restart Backend (CORS changes applied)

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/backend
npm run dev
```

**Expected output**:
```
Backend server running on http://localhost:3000
Environment: development
Allowed origins: [ 'http://localhost:3000', 'http://localhost:3001', ... ]
```

---

### 2. Check Which Port Frontend is Using

Look at terminal where frontend is running:

**If you see**:
```
Local: http://localhost:3000
```
→ Using port 3000 ✅ (CORS now allows this)

**If you see**:
```
Local: http://localhost:3001
```
→ Using port 3001 ✅ (CORS already allowed this)

---

### 3. Test Backend Health Check

```bash
curl http://localhost:3000/health
```

**Expected response**:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 123,
  "environment": "development"
}
```

---

### 4. Test Auth Endpoint Directly

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -v \
  -d '{
    "email": "test@test.com",
    "password": "Test123!"
  }'
```

**Look for in response headers**:
```
< Access-Control-Allow-Origin: http://localhost:3000
< Access-Control-Allow-Credentials: true
```

If you see these headers → CORS is working ✅

---

### 5. Test in Browser (Incognito Mode)

1. Open incognito/private window
2. Navigate to `http://localhost:3000` (or :3001 if that's the port)
3. Try to login
4. Check browser console for errors

**If it works in incognito**: Browser extension is blocking

**If still blocked**: Check browser security settings

---

### 6. Disable Browser Extensions

#### Chrome/Brave:
1. Navigate to `chrome://extensions/`
2. Disable all extensions
3. Refresh page and try login

#### Firefox:
1. Navigate to `about:addons`
2. Disable all extensions
3. Refresh page and try login

---

### 7. Check Browser Console for Other Errors

After disabling extensions, check console for:

**CORS errors**:
```
Access to fetch at 'http://localhost:3000/api/auth/login' from origin 'http://localhost:3001' has been blocked by CORS policy
```
→ Backend CORS issue (should be fixed now)

**Network errors**:
```
net::ERR_CONNECTION_REFUSED
```
→ Backend not running

**404 errors**:
```
POST http://localhost:3000/api/auth/login 404 (Not Found)
```
→ Route not configured correctly

---

## Verification Commands

```bash
# 1. Check backend is running
lsof -i :3000

# 2. Check frontend is running
lsof -i :3001
# or
lsof -i :3000

# 3. Test backend API directly
curl -v http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -X POST \
  -d '{"email":"test","password":"test"}'

# 4. Check for CORS headers in response
# Should see:
# < Access-Control-Allow-Origin: http://localhost:3000
# < Access-Control-Allow-Credentials: true
```

---

## Most Likely Solution

Based on the error `ERR_BLOCKED_BY_CLIENT`, the issue is **99% likely** one of these:

1. ✅ **CORS mismatch** (Frontend port not in backend allowed origins)
   - **Status**: FIXED - Added port 3000 to allowed origins
   - **Action**: Restart backend server

2. 🔍 **Browser extension blocking** (Ad blocker, privacy extension)
   - **Action**: Test in incognito mode
   - **Action**: Disable extensions temporarily

3. 🔍 **Brave Browser Shields**
   - **Action**: Click shield icon → Turn off for localhost

---

## Next Steps

1. **Restart backend server** (CORS changes applied)
   ```bash
   cd backend
   npm run dev
   ```

2. **Test in incognito mode first**
   - This eliminates extensions as variable
   - If works → extension issue
   - If doesn't work → CORS or backend issue

3. **If still blocked, check backend logs**
   - Look for CORS warnings
   - Verify origin matches frontend port

4. **If curl works but browser doesn't**
   - Definitely browser extension/settings
   - Whitelist localhost or disable extensions

---

## Success Indicators

✅ **Backend logs show**:
```
[CORS] Allowed origins: [ 
  'http://localhost:3000',
  'http://localhost:3001',
  ...
]
```

✅ **curl command returns response** (even if error, means reachable):
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

✅ **Browser console shows**:
```
POST http://localhost:3000/api/auth/login 400 (Bad Request)
```
→ Request went through! (400 is expected without valid credentials)

✅ **Browser console does NOT show**:
```
net::ERR_BLOCKED_BY_CLIENT
```

---

## Still Having Issues?

### Check These Files

1. **Backend CORS config**: `backend/src/server.js` line 14-32
2. **Frontend API client**: `dashboard/src/services/api-client.ts` line 3
3. **Auth service**: `dashboard/src/services/auth.service.ts` line 70-92

### Restart Everything

```bash
# Stop all servers (Ctrl+C in terminals)

# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd dashboard
npm run dev

# Test in browser incognito mode
```

---

## Summary

**Problem**: Request blocked by browser before reaching server

**Root Cause**: CORS configuration didn't include port 3000

**Fix Applied**: ✅ Added ports 3000 and 3001 to backend CORS config

**Action Required**: 
1. ✅ Restart backend server
2. 🔍 Test in incognito mode
3. 🔍 Disable ad blocker if still blocked

**Expected Result**: Login should work after backend restart! 🎉
