# MicroCrop Dashboard - Subdomain Setup Guide

## Overview

The MicroCrop dashboard now features subdomain-based authentication with role-specific signup pages. Each user type (Farmers, Cooperatives, and Admins) has their own branded portal.

## Subdomain Architecture

| User Type   | Subdomain | URL Pattern                      | Role      | Icon    | Color  |
|-------------|-----------|----------------------------------|-----------|---------|--------|
| Farmers     | (main)    | `microcrop.app`                  | FARMER    | Leaf    | Green  |
| Cooperatives| network   | `network.microcrop.app`          | COOPERATIVE| Network | Blue   |
| Admins      | portal    | `portal.microcrop.app`           | ADMIN     | Shield  | Purple |

## Features

### ✅ Subdomain Detection
- Automatic subdomain detection on client-side
- Works on localhost and production domains
- Supports both `subdomain.localhost` and `subdomain.domain.com` patterns

### ✅ Branded Authentication Pages
Each subdomain has its own branded:
- **Login page** (`/auth/login`)
- **Registration page** (`/auth/register`)
- Custom colors, icons, and messaging
- Pre-filled user roles on subdomain-specific signup

### ✅ Role-Based Access Control
- Middleware enforces subdomain ↔ role matching
- Automatic redirects for mismatched roles
- Protected dashboard routes

## Local Development Setup

### 1. Configure Hosts File

Add these entries to your `/etc/hosts` file:

```bash
# MicroCrop Local Development
127.0.0.1 localhost
127.0.0.1 network.localhost
127.0.0.1 portal.localhost
```

### 2. Start Development Server

```bash
cd dashboard
npm run dev
```

Server will be available at `http://localhost:3000`

### 3. Test Subdomains Locally

| URL | Expected Behavior |
|-----|-------------------|
| `http://localhost:3000` | Redirects to `/auth/login` (Farmer portal, green) |
| `http://network.localhost:3000/auth/register` | Shows Cooperative signup (blue, pre-filled role) |
| `http://portal.localhost:3000/auth/register` | Shows Admin signup (purple, pre-filled role) |
| `http://localhost:3000/auth/register` | Shows Farmer signup (green, pre-filled role) |

## Testing Checklist

### ✅ Root Page Redirect
- [ ] Visit `http://localhost:3000`
- [ ] Should redirect to `/auth/login`
- [ ] No landing page should be visible

### ✅ Farmer Portal (Main Domain)
- [ ] Visit `http://localhost:3000/auth/login`
- [ ] Should show green branding with Leaf icon
- [ ] Title: "MicroCrop - Farmer Portal"
- [ ] Visit `http://localhost:3000/auth/register`
- [ ] Should show "Farmer Registration"
- [ ] Role automatically set to FARMER

### ✅ Cooperative Portal (Network Subdomain)
- [ ] Visit `http://network.localhost:3000/auth/login`
- [ ] Should show blue branding with Network icon
- [ ] Title: "MicroCrop Network - Cooperative Admin Portal"
- [ ] Visit `http://network.localhost:3000/auth/register`
- [ ] Should show "Cooperative Admin Registration"
- [ ] Shows additional "Cooperative Name" field
- [ ] Role automatically set to COOPERATIVE

### ✅ Admin Portal (Portal Subdomain)
- [ ] Visit `http://portal.localhost:3000/auth/login`
- [ ] Should show purple branding with Shield icon
- [ ] Title: "MicroCrop Portal - Administrator Dashboard"
- [ ] Visit `http://portal.localhost:3000/auth/register`
- [ ] Should show "Administrator Registration"
- [ ] Role automatically set to ADMIN

### ✅ Registration Flow
- [ ] Register a farmer at `http://localhost:3000/auth/register`
- [ ] Register a cooperative at `http://network.localhost:3000/auth/register`
- [ ] Register an admin at `http://portal.localhost:3000/auth/register`
- [ ] All should redirect to `/dashboard` after successful registration
- [ ] Auth store should have correct role

### ✅ Login Flow
- [ ] Login as farmer at main domain
- [ ] Login as cooperative at network subdomain
- [ ] Login as admin at portal subdomain
- [ ] All should redirect to `/dashboard`
- [ ] Dashboard should show role-appropriate content

### ✅ Middleware Protection
- [ ] Try accessing `/dashboard` without authentication → redirect to `/auth/login`
- [ ] Try accessing cooperative pages as farmer → redirect to `/unauthorized`
- [ ] Try accessing admin pages as farmer → redirect to `/unauthorized`

## Production Deployment

### DNS Configuration

Configure your DNS with these records:

```
Type    Name        Value
A       @           [VERCEL_IP]
A       network     [VERCEL_IP]  
A       portal      [VERCEL_IP]
CNAME   *           cname.vercel-dns.com
```

### Environment Variables

Set these in your hosting platform:

```bash
# Production API
NEXT_PUBLIC_API_URL=https://microcrop-backend.onrender.com/api
NEXT_PUBLIC_BASE_DOMAIN=microcrop.app

# Blockchain (Optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_ENABLE_BLOCKCHAIN=true

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
```

### Vercel Deployment

1. **Connect Repository**
   ```bash
   vercel --prod
   ```

2. **Configure Domains**
   - Add `microcrop.app` as primary domain
   - Add `network.microcrop.app` as additional domain
   - Add `portal.microcrop.app` as additional domain
   - Add `*.microcrop.app` as wildcard domain

3. **Enable SSL**
   - Vercel automatically provisions SSL certificates
   - Wait for SSL to propagate (5-10 minutes)

4. **Test Production**
   ```bash
   # Test main domain
   curl -I https://microcrop.app
   
   # Test cooperative subdomain
   curl -I https://network.microcrop.app
   
   # Test admin subdomain
   curl -I https://portal.microcrop.app
   ```

## Architecture Details

### Subdomain Detection Function

```typescript
function getSubdomain(): string | null {
  if (typeof window === "undefined") return null
  
  const hostname = window.location.hostname
  const host = hostname.split(':')[0]
  
  // For localhost
  if (host.includes('localhost')) {
    const parts = host.split('.')
    if (parts.length > 1) {
      const subdomain = parts[0]
      if (subdomain !== 'www') {
        return subdomain
      }
    }
    return null
  }
  
  // For production
  const parts = host.split('.')
  if (parts.length > 2) {
    const subdomain = parts[0]
    if (subdomain !== 'www') {
      return subdomain
    }
  }
  
  return null
}
```

### Role Mapping

```typescript
function getRoleFromSubdomain(subdomain: string | null): string {
  if (subdomain === 'network') return 'COOPERATIVE'
  if (subdomain === 'portal') return 'ADMIN'
  return 'FARMER'
}
```

### Branding Configuration

Each subdomain has its own branding object:

```typescript
{
  title: string        // Page title
  subtitle: string     // Subtitle text
  description: string  // Description text
  icon: LucideIcon    // Lucide icon component
  color: string       // Primary color theme
}
```

## Files Modified

### Core Authentication Pages
- ✅ `app/page.tsx` - Root page with subdomain redirect
- ✅ `app/auth/login/page.tsx` - Subdomain-aware login
- ✅ `app/auth/register/page.tsx` - Subdomain-aware registration

### Supporting Infrastructure
- ✅ `middleware.ts` - Already handles subdomain routing
- ✅ `services/auth.service.ts` - Already has subdomain URL helpers
- ✅ `.env.example` - Environment variables template

## Troubleshooting

### Issue: Subdomain not detected on localhost
**Solution**: Make sure `/etc/hosts` has entries for `network.localhost` and `portal.localhost`

### Issue: CORS errors on API calls
**Solution**: Verify `NEXT_PUBLIC_API_URL` is set correctly and backend CORS allows all subdomains:
```javascript
// Backend CORS config
cors({
  origin: [
    'http://localhost:3000',
    'http://network.localhost:3000',
    'http://portal.localhost:3000',
    'https://microcrop.app',
    'https://network.microcrop.app',
    'https://portal.microcrop.app'
  ]
})
```

### Issue: Wrong branding on subdomain
**Solution**: Clear browser cache and reload. The subdomain detection runs on client mount.

### Issue: Registration submits wrong role
**Solution**: Check that the role is being set correctly in the `onSubmit` handler:
```typescript
const submitData = {
  ...data,
  role: role // This ensures subdomain role is used
}
```

## Next Steps

1. ✅ **Backend CORS**: Update backend to allow all subdomains
2. ✅ **Middleware Enhancement**: Add subdomain validation in middleware
3. ✅ **Role Verification**: Ensure middleware checks role ↔ subdomain match
4. ✅ **Analytics**: Add subdomain tracking to analytics events
5. ✅ **Testing**: Write E2E tests for each subdomain flow

## Support

For issues or questions, refer to:
- Main README: `/dashboard/README.md`
- Middleware docs: `/dashboard/middleware.ts`
- Auth service docs: `/dashboard/services/auth.service.ts`
