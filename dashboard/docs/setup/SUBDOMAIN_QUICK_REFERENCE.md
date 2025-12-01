# Subdomain Routing - Quick Reference

## URLs

### Development (localhost)
- **Main/Farmers**: http://localhost:3001
- **Cooperatives**: http://network.localhost:3001
- **Admins**: http://portal.localhost:3001

### Production
- **Main/Farmers**: https://microcrop.app
- **Cooperatives**: https://network.microcrop.app
- **Admins**: https://portal.microcrop.app

## Role → Subdomain Mapping

| Role | Subdomain | Example URL |
|------|-----------|-------------|
| FARMER | (none) | microcrop.app |
| COOPERATIVE | network | network.microcrop.app |
| ADMIN | portal | portal.microcrop.app |

## Quick Setup (Development)

### 1. Configure hosts file

```bash
# macOS/Linux
sudo nano /etc/hosts

# Add these lines:
127.0.0.1 network.localhost
127.0.0.1 portal.localhost
```

### 2. Start servers

```bash
# Backend (terminal 1)
cd backend && npm run dev

# Frontend (terminal 2)
cd dashboard && npm run dev
```

### 3. Test access

```bash
# Register COOPERATIVE user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Coop",
    "lastName": "User",
    "email": "coop@test.com",
    "password": "Test123!",
    "phone": "+254712345678",
    "role": "COOPERATIVE"
  }'

# Should redirect to network.localhost:3001/dashboard

# Register ADMIN user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@test.com",
    "password": "Test123!",
    "phone": "+254712345679",
    "role": "ADMIN"
  }'

# Should redirect to portal.localhost:3001/dashboard
```

## Key Files

| File | Purpose |
|------|---------|
| `middleware.ts` | Server-side routing & access control |
| `src/hooks/use-subdomain.ts` | Client-side subdomain detection |
| `src/services/auth.service.ts` | Auto-redirect after login |
| `src/components/layout/dashboard-layout.tsx` | Subdomain-specific branding |

## Middleware Logic

```typescript
// Automatic redirect flow
1. User requests /dashboard
2. Middleware extracts subdomain from URL
3. Middleware validates JWT token from cookie
4. Middleware checks: user.role vs subdomain access
5. If mismatch → redirect to correct subdomain
6. If match → continue to page
```

## Branding by Subdomain

| Subdomain | Title | Color | Icon |
|-----------|-------|-------|------|
| network | MicroCrop Network | Blue | Network |
| portal | MicroCrop Portal | Purple | Shield |
| (none) | MicroCrop | Green | Home |

## Testing Checklist

- [ ] COOPERATIVE user can access network.localhost
- [ ] ADMIN user can access portal.localhost
- [ ] FARMER user can access localhost (no subdomain)
- [ ] Wrong subdomain redirects to correct one
- [ ] Logout redirects to main domain login
- [ ] Login redirects to correct subdomain based on role
- [ ] Subdomain indicator shows in header
- [ ] Branding changes based on subdomain

## Common Commands

```bash
# Clear Next.js cache
rm -rf dashboard/.next

# Check DNS resolution (production)
dig network.microcrop.app
dig portal.microcrop.app

# Test SSL (production)
curl -I https://network.microcrop.app
curl -I https://portal.microcrop.app

# Restart dev server
cd dashboard && npm run dev

# View middleware logs
tail -f dashboard/.next/server/middleware.log
```

## Troubleshooting

### Problem: Redirect loop
```bash
# Solution
1. Clear browser cookies
2. Clear localStorage
3. Restart dev server
```

### Problem: 404 on subdomain
```bash
# Solution
1. Check /etc/hosts has subdomain entries
2. Restart browser
3. Try incognito mode
```

### Problem: Wrong branding shows
```bash
# Solution
1. Check console: window.location.hostname
2. Clear .next cache
3. Restart dev server
```

## API Endpoints (Same for all subdomains)

All subdomains use the same backend API:

```
POST http://localhost:3000/auth/register
POST http://localhost:3000/auth/login
POST http://localhost:3000/auth/logout
GET  http://localhost:3000/auth/me
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_BASE_DOMAIN=microcrop.app
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Production DNS Configuration

```
# Required DNS records
Type    Name        Value
A       @           [YOUR_IP]
A       www         [YOUR_IP]
A       network     [YOUR_IP]
A       portal      [YOUR_IP]
```

## Security Notes

- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Middleware validates tokens on every protected route request
- CORS must allow all subdomains in backend
- SSL required for production (use Let's Encrypt wildcard cert)

## Next Steps

1. ✅ Middleware created
2. ✅ Subdomain hook created
3. ✅ Dashboard layout updated
4. ✅ Auth service updated with redirects
5. ⏳ Test full flow with real users
6. ⏳ Configure production DNS
7. ⏳ Setup SSL certificates
8. ⏳ Update CORS settings in backend
9. ⏳ Implement httpOnly cookie auth (optional)
10. ⏳ Add subdomain analytics tracking (optional)
