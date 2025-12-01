# Backend Updates Required for Subdomain Routing

## Overview

The frontend subdomain routing is complete, but the backend needs updates to support cross-subdomain requests.

## Required Changes

### 1. Update CORS Configuration ⚠️ CRITICAL

**File**: `backend/src/index.js` or `backend/src/app.js`

**Current CORS** (needs update):
```javascript
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}))
```

**Updated CORS** (supports all subdomains):
```javascript
const allowedOrigins = [
  // Development
  'http://localhost:3001',
  'http://network.localhost:3001',
  'http://portal.localhost:3001',
  // Production
  'https://microcrop.app',
  'https://www.microcrop.app',
  'https://network.microcrop.app',
  'https://portal.microcrop.app',
]

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
```

### 2. Cookie Configuration (Optional but Recommended)

**Current**: JWT tokens stored in localStorage

**Recommended for Production**: Use httpOnly cookies for better security

**Update Cookie Settings**:

```javascript
// When setting auth tokens
res.cookie('authToken', token, {
  httpOnly: true,          // Prevents JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'lax',         // CSRF protection
  domain: process.env.NODE_ENV === 'production' 
    ? '.microcrop.app'     // Works across all subdomains
    : 'localhost',         // Works in development
  maxAge: 3600000,         // 1 hour
  path: '/'
})

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  domain: process.env.NODE_ENV === 'production' 
    ? '.microcrop.app' 
    : 'localhost',
  maxAge: 7 * 24 * 3600000, // 7 days
  path: '/'
})
```

**Important**: Notice the leading dot in `.microcrop.app` - this makes the cookie work across all subdomains.

### 3. Environment Variables

**Add to `.env`**:

```env
# Backend .env
NODE_ENV=development
PORT=3000
BASE_DOMAIN=microcrop.app
FRONTEND_URL=http://localhost:3001

# Production values
# NODE_ENV=production
# FRONTEND_URL=https://microcrop.app
```

**Update CORS to use env vars**:

```javascript
const getOrigins = () => {
  const baseDomain = process.env.BASE_DOMAIN || 'microcrop.app'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const port = process.env.NODE_ENV === 'production' ? '' : ':3001'
  
  if (process.env.NODE_ENV === 'production') {
    return [
      `${protocol}://${baseDomain}`,
      `${protocol}://www.${baseDomain}`,
      `${protocol}://network.${baseDomain}`,
      `${protocol}://portal.${baseDomain}`,
    ]
  } else {
    return [
      'http://localhost:3001',
      'http://network.localhost:3001',
      'http://portal.localhost:3001',
    ]
  }
}

app.use(cors({
  origin: getOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
```

### 4. Logging (Optional but Helpful)

**Add Request Logging**:

```javascript
// Log all requests with origin
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log(`Origin: ${req.get('origin')}`)
  console.log(`Host: ${req.get('host')}`)
  next()
})
```

### 5. Preflight Requests

**Note on Preflight Requests**:

```javascript
// Preflight OPTIONS requests are automatically handled by the CORS middleware
// when you include 'OPTIONS' in the methods array:
// methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

// No need for app.options('*', cors()) - this causes errors in Express 5.x
// The CORS middleware configured above handles all preflight requests
```

## Testing Backend Changes

### Test 1: CORS with curl

```bash
# Test from network subdomain
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://network.localhost:3001" \
  -d '{"email":"coop@test.com","password":"Test123!"}' \
  -v

# Should see:
# < Access-Control-Allow-Origin: http://network.localhost:3001
# < Access-Control-Allow-Credentials: true
```

### Test 2: CORS with Postman

1. Set Origin header: `http://network.localhost:3001`
2. Send POST to `/auth/login`
3. Check response headers for CORS headers

### Test 3: Browser Network Tab

1. Login from network.localhost:3001
2. Open DevTools → Network
3. Click on login request
4. Check Response Headers:
   - `Access-Control-Allow-Origin` should match request origin
   - `Access-Control-Allow-Credentials` should be `true`

## Implementation Steps

### Step 1: Update CORS
```bash
cd backend
# Edit src/index.js or src/app.js
# Add the updated CORS configuration
```

### Step 2: Add Environment Variables
```bash
cd backend
# Edit .env file
# Add BASE_DOMAIN and other variables
```

### Step 3: Test Locally
```bash
# Restart backend
npm run dev

# Test with curl
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://network.localhost:3001" \
  -d '{"email":"test@test.com","password":"password"}' \
  -v
```

### Step 4: Test with Frontend
```bash
# Start frontend
cd dashboard
npm run dev

# Register/login from network.localhost:3001
# Check browser console for CORS errors
```

## Common CORS Errors

### Error 1: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Cause**: Origin not in allowed list

**Fix**: Add origin to `allowedOrigins` array

### Error 2: "CORS policy: The value of the 'Access-Control-Allow-Credentials' header"

**Cause**: `credentials: true` missing or `origin: '*'` used

**Fix**: Use specific origins with `credentials: true`

### Error 3: "CORS policy: Method not allowed"

**Cause**: Method (POST, PUT, etc.) not in allowed methods

**Fix**: Add method to CORS config:
```javascript
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
```

### Error 4: Preflight request fails

**Cause**: OPTIONS method not included in CORS config

**Fix**: Ensure OPTIONS is in methods array:
```javascript
app.use(cors({
  origin: getOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // OPTIONS must be included
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
```

## Production Checklist

Before deploying to production:

- [ ] Update CORS with production domains
- [ ] Set `NODE_ENV=production` in environment
- [ ] Enable httpOnly cookies (optional but recommended)
- [ ] Set cookie domain to `.microcrop.app`
- [ ] Enable HTTPS only cookies (`secure: true`)
- [ ] Test all subdomains in production
- [ ] Monitor backend logs for CORS errors
- [ ] Setup error tracking (Sentry, LogRocket, etc.)

## Example Complete Backend Config

**`backend/src/index.js`**:

```javascript
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config()

const app = express()

// Middleware
app.use(cookieParser())
app.use(express.json())

// CORS Configuration
const getOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://microcrop.app',
      'https://www.microcrop.app',
      'https://network.microcrop.app',
      'https://portal.microcrop.app',
    ]
  }
  return [
    'http://localhost:3001',
    'http://network.localhost:3001',
    'http://portal.localhost:3001',
  ]
}

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = getOrigins()
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.warn(`CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log(`Origin: ${req.get('origin') || 'none'}`)
  next()
})

// Routes
app.use('/auth', require('./routes/auth'))
app.use('/api', require('./routes/api'))

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    success: false, 
    error: err.message || 'Internal server error' 
  })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Allowed origins:`, getOrigins())
})
```

## Verification Commands

After making changes, verify with these commands:

```bash
# 1. Check CORS from network subdomain
curl -X OPTIONS http://localhost:3000/auth/login \
  -H "Origin: http://network.localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -v

# 2. Check CORS from portal subdomain
curl -X OPTIONS http://localhost:3000/auth/login \
  -H "Origin: http://portal.localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -v

# 3. Check actual POST request
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://network.localhost:3001" \
  -d '{"email":"test@test.com","password":"Test123!"}' \
  -v

# All should return:
# < Access-Control-Allow-Origin: <origin>
# < Access-Control-Allow-Credentials: true
```

## Summary

### What Needs to Change
✅ **CORS Configuration** - Add all subdomain origins  
✅ **Environment Variables** - Add BASE_DOMAIN and NODE_ENV  
⚠️ **Cookie Settings** - Optional but recommended for production  
⚠️ **Request Logging** - Optional but helpful for debugging  

### Priority
1. **HIGH**: CORS configuration (required for subdomain routing to work)
2. **MEDIUM**: Environment variables (for cleaner config)
3. **LOW**: httpOnly cookies (security improvement)
4. **LOW**: Request logging (debugging aid)

### Testing
After changes, test:
- [ ] Register from network.localhost
- [ ] Login from portal.localhost
- [ ] API calls from each subdomain
- [ ] No CORS errors in browser console
- [ ] Cookies work across subdomains (if implemented)

## Support

If CORS errors persist:
1. Check browser console for exact error message
2. Check backend logs for rejected origins
3. Verify origin format (protocol, subdomain, port must match exactly)
4. Test with curl to isolate frontend vs backend issues
5. Clear browser cache and cookies
