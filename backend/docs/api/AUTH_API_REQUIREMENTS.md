# Authentication API Requirements for Dashboard

## 🔍 Current Status

### ✅ What Exists
- `POST /api/farmers/register` - Register farmers (phone-based, for USSD)
- Prisma schema with `Farmer` model
- bcryptjs package installed
- jsonwebtoken package installed
- Express server running on port 3000

### ❌ What's Missing (Required for Dashboard)
- **User Model** - No User table in database (only Farmer exists)
- **Email/Password Authentication** - Current system uses phone numbers only
- **Login Endpoint** - No `/api/auth/login` endpoint
- **JWT Middleware** - No authentication middleware for protected routes
- **Auth Routes** - No `/api/auth/*` routes at all
- **Auth Controller** - No authentication controller
- **Auth Service** - No authentication service layer

---

## 📋 Required API Endpoints

### 1. User Registration
**Endpoint:** `POST /api/auth/register`

**Purpose:** Register new users for dashboard access (farmers, cooperatives, admins)

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Kamau",
  "email": "john@example.com",
  "phone": "+254712345678",
  "password": "SecurePass123!",
  "role": "FARMER"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "firstName": "John",
    "lastName": "Kamau",
    "email": "john@example.com",
    "phone": "+254712345678",
    "role": "FARMER",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation Rules:**
- `firstName`: Required, 2-50 characters
- `lastName`: Required, 2-50 characters
- `email`: Required, valid email format, unique
- `phone`: Required, valid Kenya phone format (+254...)
- `password`: Required, min 8 characters, must contain uppercase, lowercase, number
- `role`: Required, one of: FARMER, COOPERATIVE, ADMIN

**Error Responses:**
- `400` - Validation error (missing fields, invalid format)
- `409` - Email or phone already exists
- `500` - Server error

---

### 2. User Login
**Endpoint:** `POST /api/auth/login`

**Purpose:** Authenticate users and provide JWT token

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid-here",
    "firstName": "John",
    "lastName": "Kamau",
    "email": "john@example.com",
    "phone": "+254712345678",
    "role": "FARMER",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Server error

---

### 3. Logout (Optional)
**Endpoint:** `POST /api/auth/logout`

**Purpose:** Invalidate refresh token (if using token blacklist)

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 4. Refresh Token (Optional but Recommended)
**Endpoint:** `POST /api/auth/refresh-token`

**Purpose:** Get new access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 5. Verify Token (Optional)
**Endpoint:** `GET /api/auth/verify`

**Purpose:** Verify if current token is valid

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "uuid-here",
    "email": "john@example.com",
    "role": "FARMER"
  }
}
```

---

### 6. Get Current User (Optional)
**Endpoint:** `GET /api/auth/me`

**Purpose:** Get current authenticated user details

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "firstName": "John",
    "lastName": "Kamau",
    "email": "john@example.com",
    "phone": "+254712345678",
    "role": "FARMER",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🗄️ Required Database Schema

### New `User` Model (Add to `prisma/schema.prisma`)

```prisma
enum UserRole {
  FARMER
  COOPERATIVE
  ADMIN
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  phone         String    @unique
  password      String    // Hashed with bcrypt
  firstName     String
  lastName      String
  role          UserRole  @default(FARMER)
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // Optional: Link to Farmer model
  farmerId      String?   @unique
  farmer        Farmer?   @relation(fields: [farmerId], references: [id])

  @@index([email])
  @@index([phone])
}
```

**Migration Command:**
```bash
cd /Users/onchainchef/Desktop/microcrop-setup/backend
npx prisma migrate dev --name add_user_model
```

---

## 🔐 JWT Configuration

### Environment Variables (`.env`)
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production-min-32-chars
JWT_REFRESH_EXPIRES_IN=7d
```

### JWT Payload Structure
```javascript
{
  "userId": "uuid-here",
  "email": "john@example.com",
  "role": "FARMER",
  "iat": 1705315800,
  "exp": 1705319400
}
```

---

## 📁 Required File Structure

```
backend/src/
├── api/
│   ├── controllers/
│   │   └── auth.controller.js       ✨ NEW - Handle auth requests
│   ├── routes/
│   │   └── auth.routes.js           ✨ NEW - Auth endpoints
│   └── middlewares/
│       └── auth.middleware.js       ✨ NEW - JWT verification
├── services/
│   └── auth.service.js              ✨ NEW - Auth business logic
└── utils/
    ├── password.util.js             ✨ NEW - bcrypt helpers
    └── jwt.util.js                  ✨ NEW - JWT helpers
```

---

## 🔨 Implementation Steps

### Step 1: Create Database Schema
```bash
cd /Users/onchainchef/Desktop/microcrop-setup/backend
# Add User model to prisma/schema.prisma
npx prisma migrate dev --name add_user_model
npx prisma generate
```

### Step 2: Create Utility Functions
**File:** `src/utils/password.util.js`
```javascript
const bcrypt = require('bcryptjs');

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

module.exports = { hashPassword, comparePassword };
```

**File:** `src/utils/jwt.util.js`
```javascript
const jwt = require('jsonwebtoken');

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken
};
```

### Step 3: Create Auth Service
**File:** `src/services/auth.service.js`
```javascript
const { PrismaClient } = require('@prisma/client');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { generateToken, generateRefreshToken } = require('../utils/jwt.util');

const prisma = new PrismaClient();

const register = async (userData) => {
  // Hash password
  const hashedPassword = await hashPassword(userData.password);
  
  // Create user
  const user = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true
    }
  });
  
  // Generate tokens
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id });
  
  return { user, token, refreshToken };
};

const login = async (email, password) => {
  // Find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Invalid credentials');
  
  // Verify password
  const isValid = await comparePassword(password, user.password);
  if (!isValid) throw new Error('Invalid credentials');
  
  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });
  
  // Generate tokens
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user.id });
  
  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;
  
  return { user: userWithoutPassword, token, refreshToken };
};

module.exports = { register, login };
```

### Step 4: Create Auth Controller
**File:** `src/api/controllers/auth.controller.js`
```javascript
const authService = require('../../services/auth.service');
const logger = require('../../config/logger');

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;
    
    // Validation
    if (!firstName || !lastName || !email || !phone || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    // Register user
    const result = await authService.register({ firstName, lastName, email, phone, password, role });
    
    logger.info(`User registered: ${result.user.email}`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      ...result
    });
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Email or phone already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    const result = await authService.login(email, password);
    
    logger.info(`User logged in: ${result.user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      ...result
    });
  } catch (error) {
    logger.error('Login error:', error);
    
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

module.exports = { register, login };
```

### Step 5: Create Auth Middleware
**File:** `src/api/middlewares/auth.middleware.js`
```javascript
const { verifyToken } = require('../../utils/jwt.util');

const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

module.exports = { authenticate, authorize };
```

### Step 6: Create Auth Routes
**File:** `src/api/routes/auth.routes.js`
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
```

### Step 7: Register Auth Routes in Server
**File:** `src/server.js` (Add this line)
```javascript
// After other route imports
const authRoutes = require('./api/routes/auth.routes');

// After other route registrations
app.use('/api/auth', authRoutes);
```

### Step 8: Add JWT Secrets to `.env`
```bash
# Add to /Users/onchainchef/Desktop/microcrop-setup/backend/.env
JWT_SECRET=your-super-secret-key-min-32-characters-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-characters-change-in-production
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 🧪 Testing the APIs

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Kamau",
    "email": "john@example.com",
    "phone": "+254712345678",
    "password": "SecurePass123!",
    "role": "FARMER"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Test Protected Route
```bash
# Get the token from login response, then:
curl -X GET http://localhost:3000/api/farmers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🔄 Integration with Existing Farmer System

### Option 1: Keep Separate (Recommended)
- **User model**: For dashboard authentication (email + password)
- **Farmer model**: For USSD system (phone + no password)
- Link them with `User.farmerId` foreign key

### Option 2: Merge Systems
- Add `email` and `password` fields to existing Farmer model
- Make phone number the primary identifier
- Use same model for both USSD and dashboard

**Recommended:** Option 1 to keep systems separate and secure.

---

## 📊 Summary Checklist

### Database
- [ ] Add `User` model to Prisma schema
- [ ] Add `UserRole` enum
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Generate Prisma client: `npx prisma generate`

### Backend Code
- [ ] Create `src/utils/password.util.js`
- [ ] Create `src/utils/jwt.util.js`
- [ ] Create `src/services/auth.service.js`
- [ ] Create `src/api/controllers/auth.controller.js`
- [ ] Create `src/api/middlewares/auth.middleware.js`
- [ ] Create `src/api/routes/auth.routes.js`
- [ ] Register auth routes in `src/server.js`

### Configuration
- [ ] Add JWT secrets to `.env`
- [ ] Update CORS settings if needed
- [ ] Configure token expiration times

### Testing
- [ ] Test registration endpoint
- [ ] Test login endpoint
- [ ] Test protected routes with JWT
- [ ] Test invalid credentials
- [ ] Test token expiration

### Frontend Integration
- [ ] Update API base URL in dashboard
- [ ] Connect registration form to `/api/auth/register`
- [ ] Connect login form to `/api/auth/login`
- [ ] Store tokens in localStorage
- [ ] Add token to API requests (Authorization header)

---

## 🎯 Priority: HIGH

The dashboard **cannot function** without these authentication endpoints. This is the **critical missing piece** blocking full system integration.

**Estimated Implementation Time:** 2-4 hours

---

## 📞 API Summary

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| POST | `/api/auth/register` | Register new user | ❌ MISSING |
| POST | `/api/auth/login` | Login user | ❌ MISSING |
| POST | `/api/auth/logout` | Logout user | ❌ MISSING |
| POST | `/api/auth/refresh-token` | Refresh JWT | ❌ MISSING |
| GET | `/api/auth/verify` | Verify token | ❌ MISSING |
| GET | `/api/auth/me` | Get current user | ❌ MISSING |

**Current Backend:** Only has farmer registration for USSD (phone-based, no email/password).

**Frontend Needs:** Email/password authentication with JWT tokens for dashboard access.
