# Frontend-Backend Integration Guide

## Overview
This document describes the integration between the Next.js frontend dashboard and the Node.js/Express backend authentication system.

## Integration Status: ✅ COMPLETE

### Backend Status
- **Server**: Running on http://localhost:3000
- **API Endpoints**: All 7 authentication endpoints tested and working
- **Database**: PostgreSQL with User table created
- **Authentication**: JWT tokens with 1-hour access and 7-day refresh tokens

### Frontend Status
- **Server**: Running on http://localhost:3001
- **Auth Service**: Updated to connect to real backend APIs
- **Login Page**: Connected to backend login endpoint
- **Register Page**: Connected to backend register endpoint
- **Token Storage**: Implemented in localStorage

---

## API Integration Details

### Base Configuration

**API Client Configuration** (`src/services/api-client.ts`):
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"
```

**Features**:
- Automatic JWT token attachment via interceptors
- Auto-redirect to login on 401 responses
- Token storage in localStorage
- 30-second request timeout

### Authentication Service

**File**: `src/services/auth.service.ts`

#### 1. Login
```typescript
authService.login({ email, password })
```

**Backend Endpoint**: `POST /api/auth/login`

**Request**:
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "FARMER",
    "isActive": true,
    "emailVerified": false
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

**Frontend Handling**:
- Stores `token` in localStorage as `authToken`
- Stores `refreshToken` in localStorage
- Updates Zustand auth store with user data
- Redirects to `/dashboard`

#### 2. Register
```typescript
authService.register({ firstName, lastName, email, password, phone, role })
```

**Backend Endpoint**: `POST /api/auth/register`

**Request**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "user@example.com",
  "password": "Password123!",
  "phone": "+254712345678",
  "role": "FARMER"
}
```

**Response**: Same as login

**Frontend Handling**:
- Stores tokens in localStorage
- Updates auth store
- Redirects to `/dashboard`

#### 3. Logout
```typescript
authService.logout()
```

**Backend Endpoint**: `POST /api/auth/logout`

**Frontend Handling**:
- Calls backend endpoint
- Clears tokens from localStorage
- Clears Zustand auth store
- Redirects to `/login`

#### 4. Verify Token
```typescript
authService.verifyToken()
```

**Backend Endpoint**: `GET /api/auth/verify`

**Response**:
```json
{
  "success": true,
  "valid": true,
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "FARMER"
  }
}
```

#### 5. Refresh Token
```typescript
authService.refreshToken(refreshToken)
```

**Backend Endpoint**: `POST /api/auth/refresh-token`

**Request**:
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response**:
```json
{
  "success": true,
  "token": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token",
  "user": { ... }
}
```

---

## Frontend Pages

### Login Page
**File**: `app/auth/login/page.tsx`

**Features**:
- Email and password validation using Zod schema
- Form handling with react-hook-form
- Error display with Alert component
- Loading state with spinner
- Remember me checkbox
- Auto-redirect if already authenticated

**Flow**:
1. User enters email and password
2. Form validates input
3. Calls `authService.login()`
4. On success:
   - Stores tokens
   - Updates auth store
   - Shows success notification
   - Redirects to `/dashboard`
5. On error:
   - Displays error message
   - Shows error notification

### Register Page
**File**: `app/auth/register/page.tsx`

**Features**:
- Multi-field validation (firstName, lastName, email, password, phone, role)
- Password strength requirements
- Phone number validation
- Role selection dropdown
- Terms acceptance checkbox
- Loading state with spinner

**Flow**:
1. User fills registration form
2. Form validates all fields
3. Calls `authService.register()`
4. On success:
   - Stores tokens
   - Updates auth store
   - Shows success notification
   - Redirects to `/dashboard`
5. On error:
   - Displays error message
   - Shows error notification

---

## Token Management

### Storage
- **Access Token**: Stored as `authToken` in localStorage
- **Refresh Token**: Stored as `refreshToken` in localStorage

### Automatic Token Attachment
The API client automatically attaches the access token to all requests:

```typescript
this.client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }
)
```

### Token Expiration Handling
The API client automatically handles 401 responses:

```typescript
this.client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken")
      localStorage.removeItem("refreshToken")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)
```

### Token Refresh
When a token expires, the frontend can refresh it:

```typescript
const refreshToken = localStorage.getItem("refreshToken")
const response = await authService.refreshToken(refreshToken)
// New tokens are automatically stored
```

---

## Error Handling

### Backend Error Format
```json
{
  "success": false,
  "error": "Error message"
}
```

### Frontend Error Handling
Both login and register pages handle errors consistently:

```typescript
catch (err: any) {
  const errorMessage = err.response?.data?.error || err.message || "Default error"
  setError(errorMessage)
  addNotification({
    title: "Error",
    message: errorMessage,
    type: "error",
  })
}
```

### Common Errors
- **Invalid credentials**: "Invalid email or password"
- **Duplicate email**: "User with this email already exists"
- **Weak password**: "Password must contain at least 8 characters..."
- **Network error**: Axios network error message

---

## State Management

### Zustand Auth Store
**File**: `src/store/auth.store.ts`

**State**:
```typescript
{
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
```

**Actions**:
- `login(user, token)`: Set user and token, mark as authenticated
- `logout()`: Clear user and token, mark as unauthenticated
- `setUser(user)`: Update user data
- `setToken(token)`: Update token
- `hasRole(role)`: Check if user has specific role
- `hasAnyRole(roles)`: Check if user has any of the specified roles

### Persistence
Auth state is persisted to localStorage using Zustand's persist middleware:

```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: "auth-storage",
    partialize: (state) => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated,
    }),
  }
)
```

---

## User Roles

### Backend Enum
```prisma
enum UserRole {
  FARMER
  COOPERATIVE
  ADMIN
}
```

### Frontend Types
```typescript
type UserRole = "FARMER" | "COOPERATIVE" | "ADMIN"
```

### Role-Based Access
Use the auth store to check user roles:

```typescript
const { hasRole, hasAnyRole } = useAuthStore()

// Check single role
if (hasRole("ADMIN")) {
  // Show admin features
}

// Check multiple roles
if (hasAnyRole(["ADMIN", "COOPERATIVE"])) {
  // Show features for admins and cooperatives
}
```

---

## Testing the Integration

### 1. Manual Testing

#### Test Registration:
1. Navigate to http://localhost:3001/auth/register
2. Fill in the form:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Password: Password123!
   - Phone: +254712345678
   - Role: FARMER
3. Click "Create Account"
4. Verify redirect to dashboard
5. Check localStorage for `authToken` and `refreshToken`

#### Test Login:
1. Navigate to http://localhost:3001/auth/login
2. Enter email: test@example.com
3. Enter password: Password123!
4. Click "Sign In"
5. Verify redirect to dashboard

#### Test Logout:
1. From dashboard, click logout
2. Verify redirect to login page
3. Check that tokens are cleared from localStorage

### 2. API Testing with cURL

#### Test Login:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

#### Test Protected Endpoint:
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Browser Console Testing

Open browser console at http://localhost:3001:

```javascript
// Check stored tokens
console.log(localStorage.getItem('authToken'))
console.log(localStorage.getItem('refreshToken'))

// Check auth store state
const authState = JSON.parse(localStorage.getItem('auth-storage'))
console.log(authState)
```

---

## Troubleshooting

### Issue: "Network Error" on Login/Register

**Cause**: Backend not running or incorrect API URL

**Solution**:
1. Verify backend is running: `lsof -ti:3000`
2. Check API base URL in `src/services/api-client.ts`
3. Ensure CORS is configured in backend

### Issue: Token Not Attached to Requests

**Cause**: Token not stored or interceptor not working

**Solution**:
1. Check localStorage: `localStorage.getItem('authToken')`
2. Verify API client interceptor is configured
3. Check browser console for errors

### Issue: 401 Unauthorized on Protected Routes

**Cause**: Invalid or expired token

**Solution**:
1. Verify token in localStorage is valid
2. Try logging out and logging in again
3. Check backend JWT secret matches

### Issue: Redirect Loop

**Cause**: Auth state and actual authentication mismatch

**Solution**:
1. Clear localStorage: `localStorage.clear()`
2. Clear browser cache
3. Restart both servers

---

## Environment Variables

### Frontend (.env.local)
```bash
# Optional - defaults to http://localhost:3000/api
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Backend (.env)
```bash
# Required
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key-min-32-chars"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_REFRESH_EXPIRES_IN="7d"
```

---

## Security Considerations

### Token Security
1. ✅ Access tokens expire after 1 hour
2. ✅ Refresh tokens expire after 7 days
3. ✅ Tokens stored in localStorage (consider httpOnly cookies for production)
4. ✅ HTTPS required in production

### Password Security
1. ✅ Passwords hashed with bcrypt (10 salt rounds)
2. ✅ Password strength validation enforced
3. ✅ Minimum 8 characters
4. ✅ Requires uppercase, lowercase, number, and special character

### API Security
1. ✅ Protected routes require valid JWT
2. ✅ Role-based authorization middleware
3. ✅ CORS configured
4. ✅ Input validation on all endpoints

---

## Next Steps

### Recommended Enhancements

1. **Email Verification**
   - Implement email verification flow
   - Update `emailVerified` field
   - Block unverified users from certain actions

2. **Password Reset**
   - Implement forgot password flow
   - Send reset emails
   - Update password with token

3. **Token Refresh Strategy**
   - Implement automatic token refresh before expiration
   - Add refresh logic to API client interceptor

4. **Session Management**
   - Show active sessions
   - Allow users to logout from all devices
   - Track last login time

5. **Two-Factor Authentication**
   - Add 2FA option
   - SMS or authenticator app
   - Backup codes

6. **Social Login**
   - Google OAuth
   - GitHub OAuth
   - Facebook Login

---

## Conclusion

The frontend-backend integration is complete and functional. Users can:
- ✅ Register new accounts
- ✅ Login with email/password
- ✅ Access protected dashboard
- ✅ Logout and clear session
- ✅ Automatic token handling
- ✅ Error handling and notifications

All API endpoints are working correctly, and the frontend successfully communicates with the backend for authentication operations.
