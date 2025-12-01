# Subdomain Testing Checklist

## Pre-Testing Setup

### ✅ Step 1: Configure Hosts File

```bash
# macOS/Linux
sudo nano /etc/hosts

# Add these lines:
127.0.0.1 network.localhost
127.0.0.1 portal.localhost

# Save and exit (Ctrl+X, Y, Enter)

# Verify
cat /etc/hosts | grep localhost
```

### ✅ Step 2: Start Backend Server

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/backend
npm run dev

# Expected output:
# Server running on http://localhost:3000
# Database connected
```

### ✅ Step 3: Start Frontend Server

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/dashboard
npm run dev

# Expected output:
# ▲ Next.js 16.0.1
# - Local: http://localhost:3001
# ✓ Ready in X seconds
```

## Test Suite

### Test 1: COOPERATIVE User Journey ⬜

**1.1 Register Cooperative User**
- [ ] Navigate to: http://localhost:3001/register
- [ ] Fill in form:
  - First Name: `Test`
  - Last Name: `Coop`
  - Email: `coop@test.com`
  - Password: `Test123!`
  - Phone: `+254712345678`
  - Role: Select "COOPERATIVE"
- [ ] Click "Register"

**1.2 Verify Redirect**
- [ ] URL should change to: `http://network.localhost:3001/dashboard`
- [ ] Page should load without errors

**1.3 Verify Network Branding**
- [ ] Sidebar logo icon should be **Network icon** (not M)
- [ ] Sidebar title should be **"MicroCrop Network"**
- [ ] Sidebar subtitle should be **"Cooperative Portal"**
- [ ] Logo background color should be **blue** (#2563eb)
- [ ] Header should show **"Cooperative Network"** badge
- [ ] Badge should have **blue background**

**1.4 Test Navigation**
- [ ] Click on different menu items (Dashboard, Farmers, Policies, etc.)
- [ ] All pages should load correctly
- [ ] URL should stay on `network.localhost` domain

**1.5 Test Wrong Subdomain**
- [ ] Manually navigate to: `http://portal.localhost:3001/dashboard`
- [ ] Should **automatically redirect** to: `http://network.localhost:3001/dashboard`
- [ ] Should see notification/flash about redirect (if implemented)

**1.6 Test Logout**
- [ ] Click logout button
- [ ] Should redirect to: `http://localhost:3001/login` (no subdomain)
- [ ] Should see login page
- [ ] Should **not** be able to access dashboard anymore

---

### Test 2: ADMIN User Journey ⬜

**2.1 Register Admin User**
- [ ] Navigate to: http://localhost:3001/register
- [ ] Fill in form:
  - First Name: `Test`
  - Last Name: `Admin`
  - Email: `admin@test.com`
  - Password: `Test123!`
  - Phone: `+254712345679`
  - Role: Select "ADMIN"
- [ ] Click "Register"

**2.2 Verify Redirect**
- [ ] URL should change to: `http://portal.localhost:3001/dashboard`
- [ ] Page should load without errors

**2.3 Verify Portal Branding**
- [ ] Sidebar logo icon should be **Shield icon** (not M)
- [ ] Sidebar title should be **"MicroCrop Portal"**
- [ ] Sidebar subtitle should be **"Admin Dashboard"**
- [ ] Logo background color should be **purple** (#9333ea)
- [ ] Header should show **"Admin Portal"** badge
- [ ] Badge should have **purple background**

**2.4 Test Navigation**
- [ ] Click on different menu items
- [ ] All pages should load correctly
- [ ] URL should stay on `portal.localhost` domain

**2.5 Test Wrong Subdomain**
- [ ] Manually navigate to: `http://network.localhost:3001/dashboard`
- [ ] Should **automatically redirect** to: `http://portal.localhost:3001/dashboard`

**2.6 Test Logout**
- [ ] Click logout button
- [ ] Should redirect to: `http://localhost:3001/login`
- [ ] Should see login page

---

### Test 3: FARMER User Journey ⬜

**3.1 Register Farmer User**
- [ ] Navigate to: http://localhost:3001/register
- [ ] Fill in form:
  - First Name: `Test`
  - Last Name: `Farmer`
  - Email: `farmer@test.com`
  - Password: `Test123!`
  - Phone: `+254712345680`
  - Role: Select "FARMER"
- [ ] Click "Register"

**3.2 Verify Redirect**
- [ ] URL should change to: `http://localhost:3001/dashboard` (NO subdomain)
- [ ] Page should load without errors

**3.3 Verify Main Branding**
- [ ] Sidebar logo icon should be **Home icon** (not M)
- [ ] Sidebar title should be **"MicroCrop"**
- [ ] Sidebar subtitle should be **"Insurance Platform"**
- [ ] Logo background color should be **green** (#16a34a)
- [ ] Header should **NOT** show any subdomain badge
- [ ] No "Cooperative Network" or "Admin Portal" label

**3.4 Test Navigation**
- [ ] Click on different menu items
- [ ] All pages should load correctly
- [ ] URL should stay on `localhost` (no subdomain)

**3.5 Test Subdomain Access**
- [ ] Try to access: `http://network.localhost:3001/dashboard`
- [ ] Should redirect to: `http://localhost:3001/dashboard` (no subdomain)
- [ ] Try to access: `http://portal.localhost:3001/dashboard`
- [ ] Should redirect to: `http://localhost:3001/dashboard` (no subdomain)

**3.6 Test Logout**
- [ ] Click logout button
- [ ] Should redirect to: `http://localhost:3001/login`

---

### Test 4: Login Flow (Existing Users) ⬜

**4.1 Login as Cooperative**
- [ ] Navigate to: http://localhost:3001/login
- [ ] Enter: `coop@test.com` / `Test123!`
- [ ] Click "Login"
- [ ] Should redirect to: `http://network.localhost:3001/dashboard`
- [ ] Should see blue network branding

**4.2 Login as Admin**
- [ ] Navigate to: http://localhost:3001/login
- [ ] Enter: `admin@test.com` / `Test123!`
- [ ] Click "Login"
- [ ] Should redirect to: `http://portal.localhost:3001/dashboard`
- [ ] Should see purple portal branding

**4.3 Login as Farmer**
- [ ] Navigate to: http://localhost:3001/login
- [ ] Enter: `farmer@test.com` / `Test123!`
- [ ] Click "Login"
- [ ] Should redirect to: `http://localhost:3001/dashboard` (no subdomain)
- [ ] Should see green main branding

---

### Test 5: Browser Compatibility ⬜

**5.1 Chrome**
- [ ] Test all flows in Chrome
- [ ] Verify subdomain redirects work
- [ ] Check branding displays correctly

**5.2 Firefox**
- [ ] Test all flows in Firefox
- [ ] Verify subdomain redirects work
- [ ] Check branding displays correctly

**5.3 Safari**
- [ ] Test all flows in Safari
- [ ] Verify subdomain redirects work
- [ ] Check branding displays correctly

**5.4 Incognito/Private Mode**
- [ ] Test login in incognito mode
- [ ] Verify subdomain routing works
- [ ] Check session isolation

---

### Test 6: Edge Cases ⬜

**6.1 Direct URL Access (Not Logged In)**
- [ ] Navigate to: `http://network.localhost:3001/dashboard` (without login)
- [ ] Should redirect to: `http://localhost:3001/login` or `http://network.localhost:3001/login`
- [ ] Should **not** access dashboard

**6.2 Token Expiration**
- [ ] Login as any user
- [ ] Wait for token to expire OR delete token from localStorage
- [ ] Try to access dashboard
- [ ] Should redirect to login page

**6.3 Invalid Subdomain**
- [ ] Navigate to: `http://invalid.localhost:3001/dashboard`
- [ ] Should either:
  - Redirect to main domain, OR
  - Show 404/error page

**6.4 Browser Back Button**
- [ ] Login as COOPERATIVE (redirects to network.localhost)
- [ ] Click browser back button
- [ ] Should stay on dashboard OR go to previous page
- [ ] Should **not** cause infinite redirect loop

**6.5 Refresh Page**
- [ ] Login as any user
- [ ] Navigate to any dashboard page
- [ ] Refresh browser (F5 or Cmd+R)
- [ ] Should stay on same page
- [ ] Should maintain branding
- [ ] Should **not** redirect or logout

---

## Browser DevTools Checks

### Check 1: Console Errors ⬜
- [ ] Open DevTools → Console
- [ ] Should have **no errors** (red messages)
- [ ] Warnings (yellow) are acceptable

### Check 2: Network Requests ⬜
- [ ] Open DevTools → Network
- [ ] Login and watch requests
- [ ] POST to `/auth/login` should return 200
- [ ] Should see redirect (302/307) to subdomain
- [ ] All subsequent requests should succeed

### Check 3: LocalStorage ⬜
- [ ] Open DevTools → Application → LocalStorage
- [ ] After login, should see:
  - `authToken`: JWT token string
  - `refreshToken`: Refresh token string
  - `auth-storage`: JSON with user data
- [ ] After logout, all should be **cleared**

### Check 4: Cookies ⬜
- [ ] Open DevTools → Application → Cookies
- [ ] Check if any auth cookies are set
- [ ] Note domain attribute (should be `.localhost` or `.microcrop.app`)

---

## Performance Checks

### Load Time ⬜
- [ ] Dashboard should load in < 2 seconds
- [ ] Redirects should be instant (< 500ms)
- [ ] No visible flashing or layout shifts

### Smooth Redirects ⬜
- [ ] Login redirect should be seamless
- [ ] No white screen or loading delays
- [ ] Branding should appear immediately

---

## Troubleshooting During Testing

### Issue: Subdomain doesn't work
**Solution**:
```bash
# 1. Verify hosts file
cat /etc/hosts | grep localhost

# 2. Flush DNS cache (macOS)
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# 3. Restart browser completely
```

### Issue: Redirect loop
**Solution**:
```bash
# 1. Clear browser data
DevTools → Application → Storage → Clear site data

# 2. Clear localStorage manually
localStorage.clear()

# 3. Restart dev server
cd dashboard
npm run dev
```

### Issue: Wrong branding shows
**Solution**:
```bash
# 1. Check current subdomain
console.log(window.location.hostname)

# 2. Clear Next.js cache
cd dashboard
rm -rf .next
npm run dev
```

### Issue: 404 on subdomain
**Solution**:
```bash
# 1. Verify Next.js is running
curl http://localhost:3001

# 2. Test subdomain resolution
curl http://network.localhost:3001

# 3. Check middleware config
cat dashboard/middleware.ts
```

---

## Success Criteria

All tests must pass:

✅ **Cooperative users** access network.* with blue branding  
✅ **Admin users** access portal.* with purple branding  
✅ **Farmer users** access main domain with green branding  
✅ **Wrong subdomain** access triggers automatic redirect  
✅ **Login** redirects to correct subdomain  
✅ **Logout** redirects to main domain login  
✅ **Browser back/refresh** works without errors  
✅ **No console errors** during normal operation  
✅ **Fast load times** (< 2 seconds)  
✅ **All browsers** work correctly  

---

## Test Results Template

```
Testing Date: __________
Tester: __________

Test 1 (COOPERATIVE): [ PASS / FAIL ]
Issues: ___________________________

Test 2 (ADMIN): [ PASS / FAIL ]
Issues: ___________________________

Test 3 (FARMER): [ PASS / FAIL ]
Issues: ___________________________

Test 4 (Login Flow): [ PASS / FAIL ]
Issues: ___________________________

Test 5 (Browser): [ PASS / FAIL ]
Browsers Tested: [ Chrome / Firefox / Safari ]
Issues: ___________________________

Test 6 (Edge Cases): [ PASS / FAIL ]
Issues: ___________________________

DevTools Checks: [ PASS / FAIL ]
Issues: ___________________________

Performance: [ PASS / FAIL ]
Avg Load Time: _______ seconds
Issues: ___________________________

Overall Result: [ PASS / FAIL ]

Notes:
_________________________________
_________________________________
_________________________________
```

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark subdomain implementation as complete
2. 📝 Document any issues found
3. 🚀 Proceed to production deployment planning
4. 🔧 Update backend CORS settings
5. 🌐 Configure production DNS

If tests fail:
1. 📋 Document exact failure scenario
2. 🐛 Debug using troubleshooting guide
3. 🔄 Fix issues and re-test
4. ✅ Verify fix works across all browsers
