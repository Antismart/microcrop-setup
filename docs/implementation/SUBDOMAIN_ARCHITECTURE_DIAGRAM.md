# Subdomain Routing Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER ACCESSES APPLICATION                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Which domain does user access?              │
        └─────────────────────────────────────────────────────┘
                  │                  │                  │
         ┌────────┴────────┬────────┴────────┬────────┴────────┐
         ▼                 ▼                 ▼                 ▼
    localhost      network.localhost   portal.localhost    www.localhost
    (Main/Farmers)   (Cooperatives)      (Admins)          (All Users)
         │                 │                 │                 │
         └─────────────────┴─────────────────┴─────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Next.js Middleware Intercepts Request       │
        │              (dashboard/middleware.ts)              │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Is this a protected route (/dashboard)?     │
        └─────────────────────────────────────────────────────┘
                  │                                    │
            ┌─────┴──────┐                      ┌─────┴──────┐
            ▼            ▼                      ▼            ▼
           YES          NO                    YES           NO
            │            │                     │             │
            ▼            │                     ▼             │
        ┌───────┐        │              ┌──────────┐        │
        │Check  │        │              │Allow     │        │
        │Auth   │        │              │Access    │        │
        │Token  │        └──────────────▶Continue  │◀───────┘
        └───────┘                       └──────────┘
            │
            ▼
        ┌─────────────────────────────────────────────────────┐
        │         Extract subdomain from hostname             │
        │         Examples:                                   │
        │         - network.localhost → "network"             │
        │         - portal.localhost → "portal"               │
        │         - localhost → ""                            │
        └─────────────────────────────────────────────────────┘
            │
            ▼
        ┌─────────────────────────────────────────────────────┐
        │         Validate JWT token from cookies/storage     │
        └─────────────────────────────────────────────────────┘
            │
            ▼
        ┌─────────────────────────────────────────────────────┐
        │         Extract user role from token                │
        │         Possible roles: FARMER, COOPERATIVE, ADMIN  │
        └─────────────────────────────────────────────────────┘
            │
            ▼
        ┌─────────────────────────────────────────────────────┐
        │         Check: Does role match subdomain?           │
        │                                                     │
        │         Subdomain Mapping:                          │
        │         network → [COOPERATIVE]                     │
        │         portal  → [ADMIN]                           │
        │         (none)  → [FARMER, COOPERATIVE, ADMIN]      │
        └─────────────────────────────────────────────────────┘
                  │                                    │
            ┌─────┴──────┐                      ┌─────┴──────┐
            ▼            ▼                      ▼            ▼
         MATCH       MISMATCH                 MATCH      MISMATCH
            │            │                     │             │
            ▼            ▼                     ▼             ▼
        ┌───────┐    ┌──────────┐        ┌───────┐    ┌──────────┐
        │Allow  │    │Redirect  │        │Allow  │    │Redirect  │
        │Access │    │to Correct│        │Access │    │to Correct│
        └───────┘    │Subdomain │        └───────┘    │Subdomain │
            │        └──────────┘            │        └──────────┘
            │             │                  │             │
            └─────────────┴──────────────────┴─────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         User lands on correct subdomain             │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Dashboard Layout Component Loads            │
        │         (dashboard-layout.tsx)                      │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         useSubdomain() hook detects subdomain       │
        │         Returns: { subdomain, isCooperative,        │
        │                    isAdmin, isFarmer, ... }         │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         getSubdomainBranding(subdomain) called      │
        └─────────────────────────────────────────────────────┘
                  │                  │                  │
         ┌────────┴────────┬────────┴────────┬────────┴────────┐
         ▼                 ▼                 ▼                 ▼
    subdomain=""      subdomain=        subdomain=        subdomain=
                      "network"          "portal"          "www"
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
    ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐
    │Green   │       │Blue    │       │Purple  │       │Green   │
    │Home    │       │Network │       │Shield  │       │Home    │
    │Icon    │       │Icon    │       │Icon    │       │Icon    │
    └────────┘       └────────┘       └────────┘       └────────┘
         │                 │                 │                 │
         └─────────────────┴─────────────────┴─────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Render Dashboard with Branding              │
        │                                                     │
        │  ┌────────────────────────────────────────────────┐│
        │  │ [Icon] Title                        [Badge]    ││
        │  │        Subtitle                                ││
        │  ├────────────────────────────────────────────────┤│
        │  │ • Dashboard                                    ││
        │  │ • Farmers                                      ││
        │  │ • Policies                                     ││
        │  │ • Claims                                       ││
        │  │ • ...                                          ││
        │  └────────────────────────────────────────────────┘│
        └─────────────────────────────────────────────────────┘
```

---

## Login/Register Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     USER REGISTERS OR LOGS IN                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         User submits form with credentials          │
        │         - Email, Password                           │
        │         - Role (FARMER, COOPERATIVE, ADMIN)         │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         POST request to backend                     │
        │         /auth/login or /auth/register               │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Backend validates credentials               │
        │         Returns: { user, token, refreshToken }      │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         authService stores tokens                   │
        │         localStorage.setItem('authToken', token)    │
        │         localStorage.setItem('refreshToken', ...)   │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         authService calls                           │
        │         getSubdomainUrlForRole(user.role)           │
        └─────────────────────────────────────────────────────┘
                  │                  │                  │
         ┌────────┴────────┬────────┴────────┬────────┴────────┐
         ▼                 ▼                 ▼                 ▼
      FARMER          COOPERATIVE          ADMIN            Other
         │                 │                 │                 │
         ▼                 ▼                 ▼                 ▼
    localhost       network.localhost   portal.localhost   localhost
         │                 │                 │                 │
         └─────────────────┴─────────────────┴─────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         window.location.href = redirectUrl          │
        │         Browser navigates to correct subdomain      │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Middleware intercepts on new subdomain      │
        │         Validates role matches subdomain            │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         User sees dashboard with correct branding   │
        └─────────────────────────────────────────────────────┘
```

---

## Logout Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     USER CLICKS LOGOUT BUTTON                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         authService.logout() called                 │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         POST request to /auth/logout                │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Clear tokens from localStorage              │
        │         localStorage.removeItem('authToken')        │
        │         localStorage.removeItem('refreshToken')     │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Determine main domain                       │
        │         Remove subdomain from current URL           │
        └─────────────────────────────────────────────────────┘
                  │                                    │
         ┌────────┴────────┐                  ┌────────┴────────┐
         ▼                 ▼                  ▼                 ▼
    localhost      network.localhost    portal.localhost    Etc.
         │                 │                  │                 │
         └─────────────────┴──────────────────┴─────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Redirect to: localhost/login                │
        │         (Main domain, no subdomain)                 │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         User sees login page                        │
        │         Can log in as any role                      │
        └─────────────────────────────────────────────────────┘
```

---

## Wrong Subdomain Access Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│         COOPERATIVE USER TRIES TO ACCESS ADMIN PORTAL                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         User navigates to:                          │
        │         portal.localhost:3001/dashboard             │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Middleware intercepts request               │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Extract subdomain: "portal"                 │
        │         Check allowed roles: [ADMIN]                │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Validate JWT token                          │
        │         Extract user role: COOPERATIVE              │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Check: COOPERATIVE in [ADMIN]?              │
        │         Result: NO (mismatch!)                      │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Get correct subdomain for COOPERATIVE       │
        │         getSubdomainForRole('COOPERATIVE')          │
        │         Returns: "network"                          │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Build redirect URL:                         │
        │         network.localhost:3001/dashboard            │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         NextResponse.redirect(redirectUrl)          │
        │         HTTP 307 Temporary Redirect                 │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Browser navigates to:                       │
        │         network.localhost:3001/dashboard            │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Middleware validates again                  │
        │         Subdomain: "network"                        │
        │         Role: COOPERATIVE                           │
        │         Match: ✅ COOPERATIVE in [COOPERATIVE]      │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Access granted!                             │
        │         User sees correct dashboard with            │
        │         blue Network branding                       │
        └─────────────────────────────────────────────────────┘
```

---

## CORS Flow (Backend)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│         BROWSER MAKES REQUEST TO BACKEND API                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Browser sends request with Origin header    │
        │         Origin: http://network.localhost:3001       │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Backend CORS middleware intercepts          │
        │         (server.js)                                 │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         getOrigins() builds allowed list            │
        │         Based on NODE_ENV:                          │
        │         - development: localhost + subdomains       │
        │         - production: microcrop.app + subdomains    │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Check: Is Origin in allowed list?           │
        └─────────────────────────────────────────────────────┘
                  │                                    │
            ┌─────┴──────┐                      ┌─────┴──────┐
            ▼            ▼                      ▼            ▼
           YES          NO                     YES           NO
            │            │                     │             │
            ▼            ▼                     ▼             ▼
        ┌───────┐    ┌──────────┐        ┌───────┐    ┌──────────┐
        │Allow  │    │Block     │        │Allow  │    │Block     │
        │Request│    │Request   │        │Request│    │Request   │
        └───────┘    └──────────┘        └───────┘    └──────────┘
            │             │                  │             │
            │             │                  │             │
            ▼             ▼                  ▼             ▼
        ┌───────────┐ ┌──────────┐     ┌───────────┐ ┌──────────┐
        │Set CORS   │ │Log error │     │Set CORS   │ │Return    │
        │headers:   │ │and return│     │headers    │ │error     │
        │- Allow    │ │error     │     │           │ │          │
        │  Origin   │ └──────────┘     └───────────┘ └──────────┘
        │- Allow    │
        │  Creds    │
        └───────────┘
            │
            ▼
        ┌─────────────────────────────────────────────────────┐
        │         Continue processing request                 │
        │         Backend returns response with CORS headers  │
        └─────────────────────────────────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────┐
        │         Browser receives response                   │
        │         Checks CORS headers                         │
        │         Allows JavaScript to access response        │
        └─────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
Dashboard Application
│
├── middleware.ts                          [Server-side route protection]
│   ├── getSubdomain()                     [Extract subdomain from URL]
│   ├── getBaseDomain()                    [Get base domain]
│   ├── getSubdomainForRole()              [Map role to subdomain]
│   └── middleware()                       [Main interceptor function]
│
├── app/
│   ├── login/page.tsx                     [Login page]
│   ├── register/page.tsx                  [Registration page]
│   └── dashboard/
│       ├── layout.tsx                     [Uses dashboard-layout component]
│       ├── page.tsx                       [Dashboard home]
│       ├── farmers/page.tsx
│       ├── policies/page.tsx
│       ├── claims/page.tsx
│       ├── payments/page.tsx
│       ├── analytics/page.tsx
│       └── settings/page.tsx
│
└── src/
    ├── components/
    │   └── layout/
    │       └── dashboard-layout.tsx       [Main layout with branding]
    │           ├── useSubdomain()         [Detect current subdomain]
    │           ├── getSubdomainBranding() [Get branding config]
    │           ├── Sidebar                [Logo, navigation, user info]
    │           └── Header                 [Subdomain badge, notifications]
    │
    ├── hooks/
    │   └── use-subdomain.ts               [Client-side subdomain utilities]
    │       ├── useSubdomain()             [React hook]
    │       ├── getUrlForRole()            [Generate URLs]
    │       └── hasSubdomainAccess()       [Validate access]
    │
    ├── services/
    │   └── auth.service.ts                [Authentication service]
    │       ├── login()                    [Login + subdomain redirect]
    │       ├── register()                 [Register + subdomain redirect]
    │       ├── logout()                   [Logout + main domain redirect]
    │       └── getSubdomainUrlForRole()   [Internal helper]
    │
    └── store/
        ├── auth.store.ts                  [Auth state management]
        └── ui.store.ts                    [UI state management]
```

---

## Data Flow Summary

```
1. USER ACTION
   │
   ├─→ Enters URL directly
   │   └─→ Middleware checks auth + subdomain
   │
   ├─→ Logs in
   │   ├─→ Auth service validates credentials
   │   ├─→ Determines correct subdomain from role
   │   └─→ Redirects to subdomain/dashboard
   │
   ├─→ Navigates pages
   │   ├─→ URL stays on same subdomain
   │   └─→ Branding remains consistent
   │
   ├─→ Tries wrong subdomain
   │   ├─→ Middleware detects mismatch
   │   └─→ Redirects to correct subdomain
   │
   └─→ Logs out
       ├─→ Clears tokens
       └─→ Redirects to main domain login

2. MIDDLEWARE VALIDATION
   │
   ├─→ Extract subdomain from URL
   ├─→ Check if route requires auth
   ├─→ Validate JWT token
   ├─→ Extract user role from token
   ├─→ Check role vs subdomain access
   └─→ Allow or redirect

3. BRANDING DISPLAY
   │
   ├─→ useSubdomain() detects current subdomain
   ├─→ getSubdomainBranding() returns config
   ├─→ Apply colors, icons, titles
   └─→ Show subdomain badge (if applicable)

4. BACKEND CORS
   │
   ├─→ Request arrives with Origin header
   ├─→ Check Origin against allowed list
   ├─→ Set CORS headers if allowed
   └─→ Return response
```

This architecture ensures:
✅ **Security**: Role-based access control at middleware level
✅ **User Experience**: Automatic redirects, consistent branding
✅ **Maintainability**: Clear separation of concerns
✅ **Scalability**: Easy to add new roles or subdomains
