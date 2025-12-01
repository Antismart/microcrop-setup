# Subdomain Routing Setup Guide

## Overview

MicroCrop uses subdomain-based multi-tenant routing to provide role-specific experiences:

- **Cooperatives**: `network.microcrop.app`
- **Admins**: `portal.microcrop.app`
- **Farmers**: `microcrop.app` (main domain, no subdomain)

## Architecture

### Components

1. **Middleware** (`dashboard/middleware.ts`)
   - Intercepts all requests
   - Validates JWT tokens from cookies
   - Checks user role vs subdomain access
   - Automatically redirects to correct subdomain

2. **Subdomain Hook** (`dashboard/src/hooks/use-subdomain.ts`)
   - Client-side subdomain detection
   - URL generation utilities
   - Access validation helpers

3. **Auth Service** (`dashboard/src/services/auth.service.ts`)
   - Automatic subdomain redirect after login/register
   - Redirect to main domain on logout

4. **Dashboard Layout** (`dashboard/src/components/layout/dashboard-layout.tsx`)
   - Subdomain-specific branding
   - Role indicators in header
   - Dynamic logo and colors

### Subdomain-Role Mapping

```typescript
const SUBDOMAIN_ROLES = {
  network: ['COOPERATIVE'],       // Cooperatives only
  portal: ['ADMIN'],              // Admins only
  www: ['FARMER', 'COOPERATIVE', 'ADMIN'],  // All roles
  '': ['FARMER', 'COOPERATIVE', 'ADMIN'],   // All roles (no subdomain)
}
```

## Development Setup

### 1. Local Subdomain Configuration

#### Option A: hosts File (Recommended)

Edit `/etc/hosts` (macOS/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 localhost
127.0.0.1 network.localhost
127.0.0.1 portal.localhost
```

#### Option B: Browser DNS Override

Some browsers support `.localhost` subdomains automatically (Chrome, Firefox).

### 2. Environment Variables

Create `.env.local` in the `dashboard` directory:

```env
# Base domain for production
NEXT_PUBLIC_BASE_DOMAIN=microcrop.app

# API endpoint
NEXT_PUBLIC_API_URL=http://localhost:3000

# Development settings
NODE_ENV=development
```

### 3. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd dashboard
npm run dev
```

### 4. Access Applications

- **Main App**: http://localhost:3001
- **Cooperative Portal**: http://network.localhost:3001
- **Admin Portal**: http://portal.localhost:3001

## Testing Subdomain Routing

### Test Case 1: COOPERATIVE User Login

1. Register/login as COOPERATIVE user
2. Should auto-redirect to `network.localhost:3001/dashboard`
3. Sidebar shows "MicroCrop Network" with blue branding
4. Header shows "Cooperative Network" badge
5. Accessing `portal.localhost` should redirect back

### Test Case 2: ADMIN User Login

1. Register/login as ADMIN user
2. Should auto-redirect to `portal.localhost:3001/dashboard`
3. Sidebar shows "MicroCrop Portal" with purple branding
4. Header shows "Admin Portal" badge
5. Accessing `network.localhost` should redirect back

### Test Case 3: FARMER User Login

1. Register/login as FARMER user
2. Should redirect to `localhost:3001/dashboard` (no subdomain)
3. Sidebar shows "MicroCrop" with green branding
4. No subdomain badge in header
5. Can access main domain only

### Test Case 4: Wrong Subdomain Access

1. Login as COOPERATIVE user on main domain
2. Navigate to `/dashboard`
3. Middleware should detect role mismatch
4. Auto-redirect to `network.localhost:3001/dashboard`

## Production Deployment

### 1. DNS Configuration

Configure A records for your domain:

```
Type    Name        Value           TTL
A       @           [YOUR_IP]       3600
A       www         [YOUR_IP]       3600
A       network     [YOUR_IP]       3600
A       portal      [YOUR_IP]       3600
```

Or use CNAME records:

```
Type    Name        Value                   TTL
CNAME   www         yourdomain.com          3600
CNAME   network     yourdomain.com          3600
CNAME   portal      yourdomain.com          3600
```

### 2. Update Environment Variables

Update `.env.production`:

```env
NEXT_PUBLIC_BASE_DOMAIN=microcrop.app
NEXT_PUBLIC_API_URL=https://api.microcrop.app
NODE_ENV=production
```

### 3. SSL Certificates

Generate SSL certificates for all subdomains:

```bash
# Using Let's Encrypt
certbot certonly --standalone -d microcrop.app -d www.microcrop.app -d network.microcrop.app -d portal.microcrop.app
```

Or use a wildcard certificate:

```bash
certbot certonly --manual --preferred-challenges=dns -d microcrop.app -d *.microcrop.app
```

### 4. Nginx Configuration

Example Nginx config for subdomain routing:

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name microcrop.app www.microcrop.app network.microcrop.app portal.microcrop.app;

    ssl_certificate /etc/letsencrypt/live/microcrop.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/microcrop.app/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Vercel Deployment (Alternative)

If deploying to Vercel, add domains in project settings:

1. Go to Project Settings → Domains
2. Add domains:
   - `microcrop.app`
   - `www.microcrop.app`
   - `network.microcrop.app`
   - `portal.microcrop.app`

Vercel automatically handles SSL certificates.

## Troubleshooting

### Issue 1: Redirect Loop

**Symptom**: Infinite redirects between subdomains

**Solutions**:
- Clear browser cookies and localStorage
- Check if JWT token is valid
- Verify role in token matches expected role
- Check middleware logic in `dashboard/middleware.ts`

### Issue 2: 404 on Subdomain

**Symptom**: Subdomain doesn't load, shows 404

**Solutions**:
- Verify DNS records are configured
- Check `/etc/hosts` for localhost development
- Ensure Next.js is running on correct port
- Test with `curl` to verify server response

### Issue 3: Subdomain Not Detected

**Symptom**: Wrong branding shows, no redirect happens

**Solutions**:
- Check browser console for subdomain value
- Verify `getSubdomain()` function in middleware
- Test with `console.log(window.location.hostname)`
- Clear Next.js cache: `rm -rf .next`

### Issue 4: Login Redirect Fails

**Symptom**: After login, stays on login page or goes to wrong subdomain

**Solutions**:
- Check `authService.login()` redirect logic
- Verify user role in auth response
- Check browser console for errors
- Test `getSubdomainUrlForRole()` function

### Issue 5: Cross-Subdomain Session Issues

**Symptom**: Logged in on one subdomain, but not on another

**Solutions**:
- JWT tokens are domain-specific by default
- Use domain-wide cookies: Set cookie domain to `.microcrop.app`
- Update backend to set cookie with domain attribute
- Consider using shared session storage (Redis)

## Browser Testing

### Chrome DevTools

1. Open DevTools → Application → Cookies
2. Verify `authToken` cookie is set
3. Check domain attribute (should be `.microcrop.app` for cross-subdomain)

### Network Tab

1. Open DevTools → Network
2. Filter by `/auth/` requests
3. Check response headers for cookie settings
4. Verify redirect responses (302/307)

### Console Testing

```javascript
// Test subdomain detection
console.log(window.location.hostname)

// Test URL generation
import { getUrlForRole } from '@/hooks/use-subdomain'
console.log(getUrlForRole('COOPERATIVE', 'microcrop.app', '/dashboard'))
// Output: https://network.microcrop.app/dashboard

// Test access validation
import { hasSubdomainAccess } from '@/hooks/use-subdomain'
console.log(hasSubdomainAccess('network', 'COOPERATIVE')) // true
console.log(hasSubdomainAccess('portal', 'COOPERATIVE')) // false
```

## Security Considerations

### 1. Token Storage

- JWT tokens stored in localStorage (client-side)
- Consider using httpOnly cookies for production
- Implement token refresh mechanism

### 2. CORS Configuration

Backend must allow requests from all subdomains:

```javascript
// backend/src/index.js
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://network.localhost:3001',
    'http://portal.localhost:3001',
    'https://microcrop.app',
    'https://www.microcrop.app',
    'https://network.microcrop.app',
    'https://portal.microcrop.app'
  ],
  credentials: true
}))
```

### 3. Cookie Configuration

For cross-subdomain cookies:

```javascript
res.cookie('authToken', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'lax',
  domain: '.microcrop.app', // Notice the leading dot
  maxAge: 3600000 // 1 hour
})
```

### 4. CSP Headers

Content Security Policy should allow all subdomains:

```
Content-Security-Policy: default-src 'self' *.microcrop.app
```

## Future Enhancements

### 1. Subdomain Switcher

Allow multi-role users to switch between subdomains:

```typescript
// Component idea
<SubdomainSwitcher>
  <option value="network">Cooperative Portal</option>
  <option value="portal">Admin Portal</option>
  <option value="">Main Site</option>
</SubdomainSwitcher>
```

### 2. Custom Themes Per Subdomain

```typescript
// Theme configuration
const SUBDOMAIN_THEMES = {
  network: { primary: 'blue', logo: '/logos/network.png' },
  portal: { primary: 'purple', logo: '/logos/admin.png' },
  '': { primary: 'green', logo: '/logos/main.png' }
}
```

### 3. Subdomain Analytics

Track usage per subdomain:

```typescript
// Analytics tracking
analytics.track('subdomain_visit', {
  subdomain: currentSubdomain,
  userRole: user.role,
  timestamp: Date.now()
})
```

### 4. Dynamic Navigation

Filter navigation items based on role and subdomain:

```typescript
const filteredNavigation = navigation.filter(item => {
  if (isCooperative) return ['Dashboard', 'Farmers', 'Policies'].includes(item.name)
  if (isAdmin) return true // All items
  return ['Dashboard', 'Claims'].includes(item.name) // Farmers
})
```

## Support

For issues or questions:
- Check middleware logs in `.next/server/middleware.log`
- Review browser console for client-side errors
- Test with different browsers and incognito mode
- Contact development team with detailed reproduction steps
