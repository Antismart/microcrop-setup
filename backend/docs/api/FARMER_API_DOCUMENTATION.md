# Farmer API Documentation

Complete API documentation for farmer management endpoints in the MicroCrop parametric insurance platform.

## Base URL
```
http://localhost:3000/api/farmers
```

---

## Endpoints

### 1. Register New Farmer

Register a new farmer in the system.

**Endpoint:** `POST /api/farmers/register`

**Request Body:**
```json
{
  "phoneNumber": "0712345678",
  "firstName": "John",
  "lastName": "Kamau",
  "county": "Nairobi",
  "subCounty": "Westlands",
  "ward": "Kangemi",
  "village": "Kangemi Village",
  "nationalId": "12345678"
}
```

**Required Fields:**
- `phoneNumber` (string): Kenya mobile number (0712345678, +254712345678, or 254712345678)
- `firstName` (string): Farmer's first name
- `lastName` (string): Farmer's last name
- `county` (string): County name
- `subCounty` (string): Sub-county name

**Optional Fields:**
- `ward` (string): Ward name
- `village` (string): Village name
- `nationalId` (string): National ID number (for KYC)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Farmer registered successfully",
  "farmer": {
    "id": "uuid-string",
    "phoneNumber": "+254712345678",
    "firstName": "John",
    "lastName": "Kamau",
    "county": "Nairobi",
    "subCounty": "Westlands",
    "ward": "Kangemi",
    "village": "Kangemi Village",
    "kycStatus": "PENDING",
    "createdAt": "2025-11-06T10:30:00.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing required fields
```json
{
  "success": false,
  "error": "Missing required fields: phoneNumber, firstName, lastName, county, subCounty"
}
```

- **400 Bad Request** - Invalid phone number
```json
{
  "success": false,
  "error": "Invalid phone number format. Expected Kenya mobile number (e.g., 0712345678)"
}
```

- **409 Conflict** - Phone number already exists
```json
{
  "success": false,
  "error": "Farmer with this phone number already exists",
  "farmerId": "existing-uuid"
}
```

- **409 Conflict** - National ID already exists
```json
{
  "success": false,
  "error": "Farmer with this national ID already exists"
}
```

---

### 2. Get Farmer by ID

Retrieve detailed information about a specific farmer.

**Endpoint:** `GET /api/farmers/:id`

**URL Parameters:**
- `id` (string): Farmer UUID

**Success Response (200):**
```json
{
  "success": true,
  "farmer": {
    "id": "uuid-string",
    "phoneNumber": "+254712345678",
    "nationalId": "12345678",
    "firstName": "John",
    "lastName": "Kamau",
    "county": "Nairobi",
    "subCounty": "Westlands",
    "ward": "Kangemi",
    "village": "Kangemi Village",
    "kycStatus": "APPROVED",
    "createdAt": "2025-11-06T10:30:00.000Z",
    "updatedAt": "2025-11-06T11:00:00.000Z",
    "plots": [
      {
        "id": "plot-uuid",
        "name": "Main Farm",
        "latitude": -1.2921,
        "longitude": 36.8219,
        "acreage": 2.5,
        "cropType": "MAIZE",
        "plantingDate": "2025-03-15T00:00:00.000Z",
        "createdAt": "2025-11-06T10:45:00.000Z"
      }
    ],
    "policies": [
      {
        "id": "policy-uuid",
        "policyNumber": "POL-20251106-ABCD",
        "coverageType": "DROUGHT",
        "sumInsured": 50000,
        "premium": 2500,
        "startDate": "2025-03-15T00:00:00.000Z",
        "endDate": "2025-09-15T00:00:00.000Z",
        "status": "ACTIVE"
      }
    ],
    "statistics": {
      "totalPlots": 1,
      "totalPolicies": 1,
      "totalTransactions": 3,
      "totalPayouts": 0
    }
  }
}
```

**Error Responses:**

- **404 Not Found** - Farmer doesn't exist
```json
{
  "success": false,
  "error": "Farmer not found"
}
```

---

### 3. Get Farmer by Phone Number

Retrieve farmer information using their phone number.

**Endpoint:** `GET /api/farmers/phone/:phoneNumber`

**URL Parameters:**
- `phoneNumber` (string): Phone number (will be normalized automatically)

**Example:** `GET /api/farmers/phone/0712345678`

**Success Response (200):**
```json
{
  "success": true,
  "farmer": {
    "id": "uuid-string",
    "phoneNumber": "+254712345678",
    "firstName": "John",
    "lastName": "Kamau",
    "kycStatus": "APPROVED",
    "plots": [
      {
        "id": "plot-uuid",
        "name": "Main Farm",
        "acreage": 2.5,
        "cropType": "MAIZE"
      }
    ],
    "activePolicies": [
      {
        "id": "policy-uuid",
        "policyNumber": "POL-20251106-ABCD",
        "status": "ACTIVE"
      }
    ]
  }
}
```

**Error Responses:**

- **404 Not Found**
```json
{
  "success": false,
  "error": "Farmer not found"
}
```

---

### 4. Update Farmer Profile

Update farmer's personal information.

**Endpoint:** `PUT /api/farmers/:id`

**URL Parameters:**
- `id` (string): Farmer UUID

**Request Body (all fields optional):**
```json
{
  "firstName": "John",
  "lastName": "Kamau",
  "county": "Nairobi",
  "subCounty": "Westlands",
  "ward": "Kangemi",
  "village": "Kangemi Village",
  "nationalId": "12345678"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Farmer updated successfully",
  "farmer": {
    "id": "uuid-string",
    "phoneNumber": "+254712345678",
    "nationalId": "12345678",
    "firstName": "John",
    "lastName": "Kamau",
    "county": "Nairobi",
    "subCounty": "Westlands",
    "ward": "Kangemi",
    "village": "Kangemi Village",
    "kycStatus": "APPROVED",
    "updatedAt": "2025-11-06T12:00:00.000Z"
  }
}
```

**Error Responses:**

- **404 Not Found**
```json
{
  "success": false,
  "error": "Farmer not found"
}
```

- **409 Conflict** - National ID already in use
```json
{
  "success": false,
  "error": "National ID already in use by another farmer"
}
```

---

### 5. Update KYC Status

Update the KYC (Know Your Customer) verification status for a farmer.

**Endpoint:** `PUT /api/farmers/:id/kyc`

**URL Parameters:**
- `id` (string): Farmer UUID

**Request Body:**
```json
{
  "kycStatus": "APPROVED",
  "rejectionReason": "Documents unclear"
}
```

**Required Fields:**
- `kycStatus` (string): Must be one of: `APPROVED`, `REJECTED`, `PENDING`

**Optional Fields:**
- `rejectionReason` (string): Reason for rejection (only used when kycStatus is REJECTED)

**Success Response (200):**
```json
{
  "success": true,
  "message": "KYC status updated to APPROVED",
  "farmer": {
    "id": "uuid-string",
    "firstName": "John",
    "lastName": "Kamau",
    "phoneNumber": "+254712345678",
    "kycStatus": "APPROVED",
    "updatedAt": "2025-11-06T12:30:00.000Z"
  }
}
```

**For Rejection:**
```json
{
  "success": true,
  "message": "KYC status updated to REJECTED",
  "farmer": {
    "id": "uuid-string",
    "firstName": "John",
    "lastName": "Kamau",
    "phoneNumber": "+254712345678",
    "kycStatus": "REJECTED",
    "updatedAt": "2025-11-06T12:30:00.000Z"
  },
  "rejectionReason": "Documents unclear"
}
```

**Error Responses:**

- **400 Bad Request** - Missing kycStatus
```json
{
  "success": false,
  "error": "kycStatus is required"
}
```

- **400 Bad Request** - Invalid kycStatus value
```json
{
  "success": false,
  "error": "Invalid kycStatus. Must be APPROVED, REJECTED, or PENDING"
}
```

- **404 Not Found**
```json
{
  "success": false,
  "error": "Farmer not found"
}
```

---

### 6. List All Farmers

Retrieve a paginated list of farmers with optional filters.

**Endpoint:** `GET /api/farmers`

**Query Parameters (all optional):**
- `page` (number): Page number (default: 1)
- `limit` (number): Records per page (default: 20)
- `kycStatus` (string): Filter by KYC status (PENDING, APPROVED, REJECTED)
- `county` (string): Filter by county
- `subCounty` (string): Filter by sub-county
- `search` (string): Search by name or phone number

**Examples:**
```
GET /api/farmers?page=1&limit=20
GET /api/farmers?kycStatus=APPROVED&county=Nairobi
GET /api/farmers?search=John
GET /api/farmers?page=2&limit=50&county=Kiambu&kycStatus=APPROVED
```

**Success Response (200):**
```json
{
  "success": true,
  "farmers": [
    {
      "id": "uuid-string",
      "phoneNumber": "+254712345678",
      "firstName": "John",
      "lastName": "Kamau",
      "county": "Nairobi",
      "subCounty": "Westlands",
      "kycStatus": "APPROVED",
      "createdAt": "2025-11-06T10:30:00.000Z",
      "plotCount": 2,
      "policyCount": 3
    },
    {
      "id": "uuid-string-2",
      "phoneNumber": "+254723456789",
      "firstName": "Mary",
      "lastName": "Wanjiru",
      "county": "Kiambu",
      "subCounty": "Kikuyu",
      "kycStatus": "PENDING",
      "createdAt": "2025-11-06T11:00:00.000Z",
      "plotCount": 1,
      "policyCount": 1
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalRecords": 95,
    "limit": 20,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 7. Delete Farmer

Delete a farmer from the system (only allowed if no active policies).

**Endpoint:** `DELETE /api/farmers/:id`

**URL Parameters:**
- `id` (string): Farmer UUID

**Success Response (200):**
```json
{
  "success": true,
  "message": "Farmer deleted successfully"
}
```

**Error Responses:**

- **404 Not Found**
```json
{
  "success": false,
  "error": "Farmer not found"
}
```

- **400 Bad Request** - Has active policies
```json
{
  "success": false,
  "error": "Cannot delete farmer with active policies",
  "activePolicies": 2
}
```

---

## Data Models

### Farmer Object
```typescript
{
  id: string;              // UUID
  phoneNumber: string;     // Normalized format: +254712345678
  nationalId: string | null;
  firstName: string;
  lastName: string;
  county: string;
  subCounty: string;
  ward: string | null;
  village: string | null;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}
```

### Phone Number Normalization
All phone numbers are automatically normalized to the format `+254712345678`:
- `0712345678` → `+254712345678`
- `254712345678` → `+254712345678`
- `712345678` → `+254712345678`
- `+254712345678` → `+254712345678` (no change)

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error (only in development mode)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (duplicate records)
- `500` - Internal Server Error

---

## Testing with cURL

### Register a Farmer
```bash
curl -X POST http://localhost:3000/api/farmers/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "0712345678",
    "firstName": "John",
    "lastName": "Kamau",
    "county": "Nairobi",
    "subCounty": "Westlands",
    "nationalId": "12345678"
  }'
```

### Get Farmer by Phone
```bash
curl http://localhost:3000/api/farmers/phone/0712345678
```

### Update KYC Status
```bash
curl -X PUT http://localhost:3000/api/farmers/{farmer-id}/kyc \
  -H "Content-Type: application/json" \
  -d '{
    "kycStatus": "APPROVED"
  }'
```

### List Farmers with Filters
```bash
curl "http://localhost:3000/api/farmers?kycStatus=APPROVED&county=Nairobi&page=1&limit=10"
```

---

## Notes

1. **Phone Number Validation**: Only Kenya mobile numbers are accepted (07XX, 01XX formats)
2. **KYC Status**: Farmers start with `PENDING` KYC status
3. **Cascade Deletion**: When a farmer is deleted, all related plots, policies, and transactions are also deleted (database cascade)
4. **Protection**: Farmers with active policies cannot be deleted
5. **Logging**: All operations are logged with Winston logger
6. **Pagination**: Default pagination is 20 records per page, maximum 100
7. **Search**: Search functionality uses case-insensitive matching on firstName, lastName, and phoneNumber

---

## Integration with USSD

The farmer routes integrate seamlessly with the USSD system:

1. USSD registration creates farmers via `/api/farmers/register`
2. USSD login retrieves farmers via `/api/farmers/phone/:phoneNumber`
3. Policy creation requires approved KYC status
4. Farmer data is used for policy issuance and payout processing

---

## Security Considerations

**Future Enhancements:**
1. Add authentication middleware (JWT tokens)
2. Add authorization for admin-only endpoints (KYC update, delete)
3. Rate limiting on registration endpoint
4. Input sanitization for all string fields
5. Audit logging for sensitive operations

---

## Related Documentation

- [USSD Flow Documentation](./USSD_FLOW.md)
- [Payment Integration](./SWYPT_INTEGRATION.md)
- [Backend Build Summary](./BUILD_SUMMARY.md)
