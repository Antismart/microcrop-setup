# Authentication API - Quick Reference

## 🚀 Server

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/backend
npm start
```

Server: `http://localhost:3000`

---

## 📡 API Endpoints

### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Kamau",
  "email": "john@example.com",
  "phone": "+254712345678",
  "password": "SecurePass123!",
  "role": "FARMER"
}

Response: { success, user, token, refreshToken }
```

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: { success, user, token, refreshToken }
```

### Get Current User
```bash
GET /api/auth/me
Authorization: Bearer <token>

Response: { success, user }
```

### Verify Token
```bash
GET /api/auth/verify
Authorization: Bearer <token>

Response: { success, valid, user }
```

### Refresh Token
```bash
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "<refresh-token>"
}

Response: { success, token, refreshToken }
```

---

## 🧪 Test Commands

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@example.com","phone":"+254700000000","password":"SecurePass123!","role":"FARMER"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"SecurePass123!"}'
```

### Get User
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎨 Frontend Integration

### Update Auth Service
```typescript
// dashboard/src/services/auth.service.ts
const API_BASE_URL = 'http://localhost:3000/api';

export const register = async (userData) => {
  const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
  return response.data;
};

export const login = async (email, password) => {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
  return response.data;
};
```

### Update Registration Form
```typescript
// After successful registration API call:
const result = await authService.register(formData);
login(result.user, result.token);
router.push('/dashboard');
```

### Update Login Form
```typescript
// After successful login API call:
const result = await authService.login(email, password);
login(result.user, result.token);
router.push('/dashboard');
```

---

## ✅ Validation Rules

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Phone Format
- Kenya mobile numbers
- Accepts: `0712345678`, `+254712345678`, `254712345678`
- Auto-converts to: `+254712345678`

### Email
- Valid email format required
- Must be unique

---

## 🔐 Environment Variables

```bash
# .env file
JWT_SECRET=microcrop-super-secret-jwt-key-change-this-in-production-min-32-characters
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=microcrop-refresh-secret-key-change-this-in-production-min-32-characters
JWT_REFRESH_EXPIRES_IN=7d
```

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Check server logs
tail -f /Users/onchainchef/Desktop/microcrop-setup/backend/server.log
```

### Database connection failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test database connection
docker exec -it $(docker ps -qf "name=postgres") psql -U postgres -d microcrop -c "SELECT 1;"
```

### Token invalid
- Check JWT_SECRET is set in .env
- Verify token hasn't expired (1 hour)
- Use refresh token to get new access token

---

## 📊 Response Formats

### Success
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 🎯 Test Users

### User 1
- Email: `john.kamau@example.com`
- Password: `SecurePass123!`
- Role: FARMER

### User 2
- Email: `jane.wanjiku@example.com`
- Password: `MySecure2024!`
- Role: FARMER

---

## 📝 Status

✅ All endpoints working
✅ Database migrated
✅ Tests passing
✅ Ready for dashboard integration

---

For full documentation, see:
- `AUTH_API_REQUIREMENTS.md` - Complete API specifications
- `AUTHENTICATION_IMPLEMENTATION_COMPLETE.md` - Implementation details and test results
