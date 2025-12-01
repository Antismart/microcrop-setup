# Farmer-Specific Components Audit 🔍

**Date:** December 1, 2025  
**Audit Scope:** Dashboard farmer-specific components, pages, services, hooks, and types  
**Purpose:** Identify unused or redundant farmer components after restricting FARMER role to mobile-only

---

## 📊 Executive Summary

### Key Findings

**STATUS:** ✅ **KEEP ALL FARMER COMPONENTS** - They serve critical business functions

Despite FARMER role being blocked from web authentication, all farmer-related components are **actively used** by COOPERATIVE and ADMIN users for farmer management. These components are **NOT farmer-facing** but rather **farmer-management** tools for cooperative staff and admins.

### Business Context

- **FARMER Role Restriction:** Farmers cannot log into the web dashboard (mobile/USSD only)
- **Farmer Management:** Cooperatives and admins NEED web tools to manage farmer records
- **Active Usage:** Farmer pages are linked from policies, claims, and dashboard navigation
- **Not Redundant:** All components serve legitimate management purposes

---

## 🗂️ Comprehensive Component Inventory

### 1. **Farmer Pages** (4 files) - ✅ **KEEP ALL**

#### `/app/dashboard/farmers/page.tsx` 
**Status:** ✅ **ACTIVELY USED** - Primary farmer management interface

**Purpose:** List, search, filter, and manage farmers
**Features:**
- Farmer list with pagination
- Search by name/ID/phone
- Filter by status and group
- Bulk upload farmers (CSV/Excel)
- Bulk export farmers
- View/Edit/Delete actions
- Create new farmer button

**Used By:**
- COOPERATIVE users managing their farmer members
- ADMIN users overseeing all farmers
- Navigation link in dashboard sidebar

**Evidence of Use:**
- Referenced in `dashboard-layout.tsx` navigation (line 31, 40)
- Links to policies page (line 313 in `/dashboard/policies/[id]/page.tsx`)
- Links from claims page (line 400 in `/dashboard/claims/[id]/page.tsx`)

**Recommendation:** **KEEP** - Essential farmer management tool

---

#### `/app/dashboard/farmers/new/page.tsx`
**Status:** ✅ **ACTIVELY USED** - Farmer creation form

**Purpose:** Create new farmer records
**Features:**
- Complete farmer registration form
- Personal information (name, national ID, DOB)
- Contact information (phone, email, address)
- Farmer group assignment
- KYC status setting
- Location coordinates
- Form validation with Zod schema

**Used By:**
- COOPERATIVE staff onboarding new farmers
- ADMIN users creating test/demo farmer records

**Evidence of Use:**
- Linked from farmers list page (line 137: `/dashboard/farmers/new`)
- Uses `useCreateFarmer` hook (active mutation)
- Redirects back to farmers list on success

**Recommendation:** **KEEP** - Critical for farmer onboarding

---

#### `/app/dashboard/farmers/[id]/page.tsx`
**Status:** ✅ **ACTIVELY USED** - Farmer detail view

**Purpose:** View complete farmer profile and related data
**Features:**
- Farmer personal details display
- Contact information
- KYC status badge
- Location map (if coordinates available)
- Related policies list
- Related claims list
- Payment history
- Edit button to modify farmer

**Used By:**
- COOPERATIVE users viewing their farmers
- ADMIN users reviewing farmer details
- Linked from policies (view farmer profile)
- Linked from claims (view claimant details)

**Evidence of Use:**
- Clicked from farmers list (line 334: `/dashboard/farmers/${farmer.id}`)
- Referenced from policies page (line 313)
- Referenced from claims page (line 400)

**Recommendation:** **KEEP** - Essential detail view

---

#### `/app/dashboard/farmers/[id]/edit/page.tsx`
**Status:** ✅ **ACTIVELY USED** - Farmer edit form

**Purpose:** Update existing farmer information
**Features:**
- Pre-populated form with current farmer data
- Edit all farmer fields
- KYC status updates
- Form validation
- Update farmer mutation

**Used By:**
- COOPERATIVE staff updating farmer information
- ADMIN users correcting farmer data
- KYC verification updates

**Evidence of Use:**
- Linked from farmers list (line 341: `/dashboard/farmers/${farmer.id}/edit`)
- Linked from farmer detail page (line 138)
- Uses `useUpdateFarmer` hook (active mutation)

**Recommendation:** **KEEP** - Required for data maintenance

---

### 2. **Farmer Service** (1 file) - ✅ **KEEP**

#### `/src/services/farmer.service.ts`
**Status:** ✅ **FULLY UTILIZED** - All methods actively used

**Purpose:** API client for farmer-related backend operations
**Methods:**
1. `list()` - Fetch paginated farmers (✅ used in `useFarmers`)
2. `getById()` - Fetch single farmer (✅ used in `useFarmer`)
3. `create()` - Create new farmer (✅ used in `useCreateFarmer`)
4. `update()` - Update farmer (✅ used in `useUpdateFarmer`)
5. `delete()` - Delete farmer (✅ used in farmers page)
6. `bulkUpload()` - CSV/Excel upload (✅ used in `useBulkUploadFarmers`)
7. `bulkExport()` - Export farmers (✅ used in `useBulkExportFarmers`)
8. `getPolicies()` - Get farmer's policies (✅ used in farmer detail page)
9. `getClaims()` - Get farmer's claims (✅ used in farmer detail page)
10. `getPayments()` - Get farmer's payments (✅ used in farmer detail page)

**Also Exports:** (NOT farmer-specific, but co-located)
- `policyService` - ✅ Used throughout app
- `claimService` - ✅ Used throughout app
- `paymentService` - ✅ Used throughout app
- `cooperativeService` - ✅ Used throughout app

**Recommendation:** **KEEP** - All methods actively called by hooks and pages

---

### 3. **Farmer Hooks** (in `/src/hooks/use-data.ts`) - ✅ **KEEP ALL**

#### React Query hooks for farmer operations:
1. `useFarmers()` - ✅ Used in farmers list page
2. `useFarmer()` - ✅ Used in farmer detail and edit pages
3. `useCreateFarmer()` - ✅ Used in new farmer page
4. `useUpdateFarmer()` - ✅ Used in edit farmer page
5. `useBulkUploadFarmers()` - ✅ Used in farmers list (bulk upload dialog)
6. `useBulkExportFarmers()` - ✅ Used in farmers list (export button)

**Features:**
- Automatic cache invalidation
- Optimistic updates
- Error handling
- Success notifications (toast)
- Loading states

**Recommendation:** **KEEP** - Actively used by all farmer pages

---

### 4. **Farmer Validations** (1 file) - ✅ **KEEP**

#### `/src/lib/validations/farmer.ts`
**Status:** ✅ **REQUIRED** - Used in farmer forms

**Purpose:** Zod schema for farmer form validation
**Schema Fields:**
- Personal info: firstName, lastName, nationalId, dateOfBirth, gender
- Contact: phoneNumber, alternatePhone, email
- Address: address, location (lat/lon)
- Group: farmerGroup
- KYC: kycStatus

**Validations:**
- Name length (2-50 chars)
- National ID format (5-20 chars)
- Age verification (18-100 years old)
- Phone number regex validation
- Email format validation
- Address length (10-200 chars)
- Coordinate ranges (lat: -90 to 90, lon: -180 to 180)

**Used By:**
- `/app/dashboard/farmers/new/page.tsx` (create form)
- `/app/dashboard/farmers/[id]/edit/page.tsx` (edit form)

**Recommendation:** **KEEP** - Essential for form validation

---

### 5. **Farmer Types** (in `/src/types/index.ts`) - ✅ **KEEP ALL**

#### Farmer-Related Type Definitions:

**Interfaces:**
1. `Farmer` - ✅ Core farmer entity (used throughout app)
   - Fields: id, farmerId, firstName, lastName, nationalId, dateOfBirth, gender, phoneNumber, email, address, location, farmerGroup, group, kycStatus, status, walletAddress, createdAt, updatedAt

2. `FarmerGroup` - ✅ Farmer group entity
   - Fields: id, name, description, cooperative, members (farmer IDs), createdAt, updatedAt

**Enums:**
1. `FarmerStatus` - ✅ Status values
   - Values: ACTIVE, INACTIVE, SUSPENDED, PENDING

2. `UserRole.FARMER` - ✅ Required for backend compatibility
   - Note: Already documented as "mobile-only" role
   - Used in backend API responses
   - Kept for type compatibility

**Usage:**
- Imported in 6+ files
- Used by farmer service methods
- Used in policy and claim interfaces (farmerId field)
- Used in analytics interfaces (totalFarmers, farmersGrowth)

**Recommendation:** **KEEP** - Critical type definitions used across the app

---

### 6. **Farmer UI References** - ✅ **KEEP ALL**

#### Dashboard Navigation
**File:** `/src/components/layout/dashboard-layout.tsx`

**Farmer Link in Sidebar:**
```typescript
{ name: "Farmers", href: "/dashboard/farmers", icon: Users }
```

**Present In:**
- Cooperative navigation (line 31)
- Admin navigation (line 40)

**Purpose:** Allow COOPERATIVE and ADMIN users to access farmer management

**Recommendation:** **KEEP** - Primary navigation to farmer management

---

### 7. **Smart Contract Integration** - ✅ **KEEP**

#### Blockchain Farmer References
**File:** `/src/hooks/use-contract.ts`

**Farmer-Related Contract Methods:**
1. Policy creation: `createPolicy(policyId, farmer, premium, sumInsured)`
2. Policy purchase: `purchasePolicy(policyId, farmer, premium, sumInsured)`
3. Claim submission: Includes farmer address in claim events
4. Contract events: `PolicyCreated`, `PolicyPurchased` include `farmer` field

**Purpose:** Blockchain integration for farmer insurance policies
**Used When:** Blockchain features enabled (`NEXT_PUBLIC_ENABLE_BLOCKCHAIN=true`)

**Recommendation:** **KEEP** - Required for blockchain functionality

---

### 8. **Deprecated Subdomain Code** - ⚠️ **NEEDS UPDATE**

#### Outdated References to Farmer Web Access

**File:** `/src/hooks/use-subdomain.ts`

**Issues Found:**
1. **Line 9, 19, 35:** `isFarmer` property still present
   ```typescript
   isFarmer: boolean  // ❌ Misleading - farmers don't use web
   ```

2. **Line 90:** Still has FARMER case in `getUrlForRole`
   ```typescript
   case 'FARMER':
     subdomain = ''  // ❌ FARMER shouldn't have web URL
   ```

3. **Line 117-118:** Still allows FARMER in `hasSubdomainAccess`
   ```typescript
   www: ['FARMER', 'COOPERATIVE', 'ADMIN'],  // ❌ FARMER blocked
   '': ['FARMER', 'COOPERATIVE', 'ADMIN'],    // ❌ FARMER blocked
   ```

**Recommendation:** ⚠️ **UPDATE** - Remove FARMER from subdomain access logic (already fixed in middleware)

---

## 🔍 Usage Analysis

### Active Usage Patterns

1. **Farmer List Page** → Most accessed farmer page
   - Entry point for farmer management
   - Linked in navigation sidebar
   - Bulk operations (upload/export)

2. **Farmer Detail Page** → High usage
   - Accessed from policies (view policy holder)
   - Accessed from claims (view claimant)
   - Accessed from farmer list (view details)

3. **Farmer Create/Edit** → Moderate usage
   - Used during onboarding
   - Used for data corrections
   - Used for KYC updates

4. **Farmer Service Methods** → All used
   - Every service method is called by at least one hook
   - Hooks are used by pages
   - No orphaned methods

### Cross-References

**Farmer data referenced in:**
- Policies (`farmerId` field)
- Claims (`farmerId` field)
- Payments (`payer` might be farmer)
- Analytics (`totalFarmers`, `farmersGrowth`)
- Cooperatives (farmers are members)
- Dashboard stats

---

## 🎯 Recommendations Summary

### ✅ KEEP (95% of components)

| Component Type | Count | Recommendation | Reason |
|----------------|-------|----------------|--------|
| Farmer Pages | 4 | **KEEP ALL** | Actively used by COOPERATIVE and ADMIN |
| Farmer Service | 1 | **KEEP** | All methods actively used |
| Farmer Hooks | 6 | **KEEP ALL** | Used by all farmer pages |
| Farmer Validations | 1 | **KEEP** | Required for forms |
| Farmer Types | 4 | **KEEP ALL** | Used throughout app |
| Navigation Links | 2 | **KEEP** | Primary access to farmer management |
| Contract Integration | N/A | **KEEP** | Required for blockchain |

### ⚠️ UPDATE (5% needs modification)

| Component | File | Issue | Recommended Action |
|-----------|------|-------|-------------------|
| `use-subdomain.ts` | `/src/hooks/use-subdomain.ts` | Still references FARMER web access | Remove `isFarmer` property, update `hasSubdomainAccess` to exclude FARMER |

---

## 📝 Detailed Recommendations

### 1. Keep All Farmer Management Components ✅

**Reason:** These are **NOT** farmer-facing components. They are **farmer-management** tools used by:
- **COOPERATIVE staff:** Manage their farmer members (onboard, update, view)
- **ADMIN users:** Oversee all farmers across all cooperatives

**Analogy:** Like an HR system - employees don't log in to HR software, but HR staff use it to manage employee records.

**Evidence:**
- Farmer pages linked in COOPERATIVE and ADMIN navigation
- Policies/Claims reference farmer details
- Bulk upload/export needed for cooperative operations
- KYC management requires farmer editing

### 2. Update `use-subdomain.ts` Hook ⚠️

**Current Issue:**
```typescript
// ❌ MISLEADING - farmers don't use web dashboard
isFarmer: boolean
isFarmer: !subdomain || subdomain === 'www'

// ❌ FARMER should not be in subdomain access
www: ['FARMER', 'COOPERATIVE', 'ADMIN']
'': ['FARMER', 'COOPERATIVE', 'ADMIN']
```

**Recommended Changes:**
```typescript
// ✅ REMOVE isFarmer property completely
interface SubdomainInfo {
  subdomain: Subdomain
  isCooperative: boolean
  isAdmin: boolean
  // isFarmer: boolean  ← REMOVE THIS
  baseDomain: string
  fullDomain: string
}

// ✅ Update hasSubdomainAccess to match middleware
function hasSubdomainAccess(subdomain: Subdomain, userRole: string): boolean {
  const accessMap: Record<Subdomain, string[]> = {
    network: ['COOPERATIVE'],
    portal: ['ADMIN'],
    // NOTE: FARMER role is NOT allowed on web dashboard
    www: ['COOPERATIVE', 'ADMIN'],  // ← Remove FARMER
    '': ['COOPERATIVE', 'ADMIN'],    // ← Remove FARMER
  }
  return accessMap[subdomain]?.includes(userRole) || false
}

// ✅ Remove FARMER case from getUrlForRole or add comment
function getUrlForRole(role: string, baseDomain: string, path: string = ''): string {
  let subdomain = ''
  
  switch (role) {
    case 'COOPERATIVE':
      subdomain = 'network'
      break
    case 'ADMIN':
      subdomain = 'portal'
      break
    case 'FARMER':
      // NOTE: FARMER role uses mobile app only, not web dashboard
      throw new Error('FARMER role does not have web dashboard access')
  }
  
  // ... rest of function
}
```

### 3. Document Farmer Management Purpose 📄

**Add Comments to Farmer Pages:**

```typescript
/**
 * Farmer Management Page
 * 
 * This page is for COOPERATIVE and ADMIN users to manage farmer records.
 * Farmers themselves do NOT log into the web dashboard - they use mobile app (USSD).
 * 
 * Features:
 * - List all farmers (with filters)
 * - Create new farmer records
 * - Edit existing farmer information
 * - Bulk upload farmers from CSV/Excel
 * - Export farmer data
 * - View farmer policies and claims
 * 
 * Access: COOPERATIVE (own farmers) | ADMIN (all farmers)
 */
```

---

## 🚀 Action Items

### Immediate (Required)

1. ✅ **Update `/src/hooks/use-subdomain.ts`**
   - Remove `isFarmer` property from `SubdomainInfo` interface
   - Update `hasSubdomainAccess` to exclude FARMER (match middleware)
   - Update `getUrlForRole` to throw error or comment for FARMER case

### Optional (Nice to Have)

2. 📄 **Add Documentation Comments**
   - Add JSDoc comments to farmer pages explaining management purpose
   - Clarify that these are NOT farmer-facing pages

3. ✅ **Verify Middleware Consistency**
   - Confirm middleware already blocks FARMER (✅ already done in Fix 3)
   - Confirm auth validation excludes FARMER (✅ already done in Fix 3)

### Not Needed

❌ **Do NOT remove:**
- Farmer pages (`/dashboard/farmers/**`)
- Farmer service (`farmer.service.ts`)
- Farmer hooks (`use-data.ts` farmer hooks)
- Farmer validations (`farmer.ts`)
- Farmer types (`index.ts` farmer interfaces)
- Farmer navigation links (sidebar)
- Farmer contract integration

---

## 📊 Final Assessment

### Summary Statistics

| Category | Total | Keep | Update | Remove |
|----------|-------|------|--------|--------|
| Pages | 4 | 4 | 0 | 0 |
| Services | 1 | 1 | 0 | 0 |
| Hooks | 6 | 6 | 0 | 0 |
| Validations | 1 | 1 | 0 | 0 |
| Types | 4 | 4 | 0 | 0 |
| Utilities | 1 | 0 | 1 | 0 |
| **TOTAL** | **17** | **16** | **1** | **0** |

### Grade: A+ (No Unused Components)

**Conclusion:** The codebase is **well-structured** with **no unused farmer components**. All farmer-related code serves legitimate farmer-management purposes for COOPERATIVE and ADMIN users. Only one minor update needed to align subdomain hook with middleware changes.

---

## 🔗 Related Documentation

- **CODEBASE_AUDIT.md** - Original audit (Priority 3: unused components)
- **PRIORITY_2_FIXES_COMPLETE.md** - Recent fixes (FARMER role blocked)
- **middleware.ts** - Subdomain access control (FARMER already blocked)
- **src/lib/validations/auth.ts** - Registration schema (FARMER already excluded)

---

**Audit Completed:** December 1, 2025  
**Auditor:** AI Assistant  
**Status:** ✅ Complete - Minimal changes required
