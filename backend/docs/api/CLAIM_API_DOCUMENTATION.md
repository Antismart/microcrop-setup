# Claims API Documentation

Complete API documentation for claims and payout management endpoints in the MicroCrop parametric insurance platform.

## Base URL
```
http://localhost:3000/api/claims
```

---

## Damage Calculation Formula

### Damage Index Calculation
```
damageIndex = (weatherStressIndex × 0.6) + (vegetationIndex × 0.4)
```

**Where:**
- `weatherStressIndex`: 0-1 scale (0 = no stress, 1 = severe stress)
- `vegetationIndex`: 0-1 scale (0 = healthy vegetation, 1 = severely damaged)
- **Weight**: 60% weather, 40% vegetation/satellite data

### Payout Calculation

**Thresholds:**
- `damageIndex < 0.3`: No payout (0%)
- `damageIndex 0.3-0.5`: Partial payout (30-50%)
- `damageIndex 0.5-0.7`: Moderate payout (50-70%)
- `damageIndex > 0.7`: Major payout (70-100%)

**Formula:**
```
payoutPercentage = 0.30 + ((damageIndex - 0.3) / 0.7) × 0.70
payoutAmount = sumInsured × payoutPercentage
```

**Example:**
```
damageIndex = 0.65
payoutPercentage = 0.30 + ((0.65 - 0.3) / 0.7) × 0.70 = 0.65 (65%)
For sumInsured = 50,000 KES
payoutAmount = 50,000 × 0.65 = 32,500 KES
```

---

## Endpoints

### 1. Get Policy Claims

Retrieve all damage assessments and payouts for a specific policy.

**Endpoint:** `GET /api/claims/:policyId`

**URL Parameters:**
- `policyId` (string): Policy UUID

**Success Response (200):**
```json
{
  "success": true,
  "policy": {
    "id": "policy-uuid",
    "policyNumber": "POL-20251106-A1B2C3",
    "status": "ACTIVE",
    "coverageType": "DROUGHT",
    "sumInsured": 50000,
    "premium": 2500,
    "startDate": "2025-11-06T00:00:00.000Z",
    "endDate": "2026-05-06T00:00:00.000Z",
    "farmer": {
      "id": "farmer-uuid",
      "phoneNumber": "+254712345678",
      "firstName": "John",
      "lastName": "Kamau"
    },
    "plot": {
      "id": "plot-uuid",
      "name": "Main Farm",
      "acreage": 2.5,
      "cropType": "MAIZE",
      "latitude": -1.2921,
      "longitude": 36.8219
    }
  },
  "claims": {
    "damageAssessments": [
      {
        "id": "assessment-uuid",
        "policyId": "policy-uuid",
        "weatherStressIndex": 0.75,
        "vegetationIndex": 0.55,
        "damageIndex": 0.67,
        "triggerDate": "2025-12-15T00:00:00.000Z",
        "proofHash": "ipfs://Qm...",
        "createdAt": "2025-12-15T12:00:00.000Z",
        "payoutEligibility": 33500,
        "severity": "Severe"
      }
    ],
    "payouts": [
      {
        "id": "payout-uuid",
        "policyId": "policy-uuid",
        "farmerId": "farmer-uuid",
        "amount": 33500,
        "status": "COMPLETED",
        "transactionHash": "0xabc...",
        "mpesaRef": "QA12XY89ZZ",
        "initiatedAt": "2025-12-15T13:00:00.000Z",
        "completedAt": "2025-12-15T13:05:00.000Z",
        "failureReason": null
      }
    ]
  },
  "summary": {
    "totalDamageAssessments": 1,
    "totalPayouts": 1,
    "completedPayouts": 1,
    "totalPayoutAmount": 33500,
    "pendingPayouts": 0,
    "pendingPayoutAmount": 0,
    "remainingCoverage": 16500,
    "canReceivePayouts": true,
    "utilizationRate": "67.00%"
  }
}
```

**Severity Levels:**
- `Minor`: damageIndex < 0.3 (no payout)
- `Moderate`: damageIndex 0.3-0.5
- `Severe`: damageIndex 0.5-0.7
- `Critical`: damageIndex > 0.7

---

### 2. Get Farmer Payouts

Retrieve all payouts for a specific farmer with pagination.

**Endpoint:** `GET /api/claims/payouts/:farmerId`

**URL Parameters:**
- `farmerId` (string): Farmer UUID

**Query Parameters:**
- `status` (string): Filter by payout status (PENDING, PROCESSING, COMPLETED, FAILED)
- `page` (number): Page number (default: 1)
- `limit` (number): Records per page (default: 20)

**Examples:**
```
GET /api/claims/payouts/farmer-uuid
GET /api/claims/payouts/farmer-uuid?status=COMPLETED
GET /api/claims/payouts/farmer-uuid?page=1&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "payouts": [
    {
      "id": "payout-uuid",
      "policyId": "policy-uuid",
      "farmerId": "farmer-uuid",
      "amount": 33500,
      "status": "COMPLETED",
      "transactionHash": "0xabc...",
      "mpesaRef": "QA12XY89ZZ",
      "initiatedAt": "2025-12-15T13:00:00.000Z",
      "completedAt": "2025-12-15T13:05:00.000Z",
      "failureReason": null,
      "policy": {
        "id": "policy-uuid",
        "policyNumber": "POL-20251106-A1B2C3",
        "coverageType": "DROUGHT",
        "sumInsured": 50000,
        "status": "CLAIMED",
        "plot": {
          "id": "plot-uuid",
          "name": "Main Farm",
          "cropType": "MAIZE",
          "acreage": 2.5
        }
      },
      "farmer": {
        "id": "farmer-uuid",
        "phoneNumber": "+254712345678",
        "firstName": "John",
        "lastName": "Kamau"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 1,
    "limit": 20,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "summary": {
    "totalPayouts": 3,
    "completedPayouts": 2,
    "pendingPayouts": 1,
    "failedPayouts": 0,
    "totalAmountReceived": 60000,
    "totalAmountPending": 15000
  }
}
```

---

### 3. Process Payout

Manually process a payout based on damage assessment (admin/automated function).

**Endpoint:** `POST /api/claims/process`

**Request Body:**
```json
{
  "policyId": "policy-uuid",
  "weatherStressIndex": 0.75,
  "vegetationIndex": 0.55,
  "triggerDate": "2025-12-15T00:00:00.000Z",
  "proofHash": "ipfs://Qm..."
}
```

**Required Fields:**
- `policyId` (string): Policy UUID
- `weatherStressIndex` (number): 0-1 scale
- `vegetationIndex` (number): 0-1 scale

**Optional Fields:**
- `triggerDate` (date): Date of event (default: now)
- `proofHash` (string): IPFS or blockchain proof hash

**Success Response (201):**
```json
{
  "success": true,
  "message": "Payout processed successfully",
  "damageAssessment": {
    "id": "assessment-uuid",
    "weatherStressIndex": 0.75,
    "vegetationIndex": 0.55,
    "damageIndex": 0.67,
    "triggerDate": "2025-12-15T00:00:00.000Z",
    "proofHash": "ipfs://Qm...",
    "severity": "Severe"
  },
  "payout": {
    "id": "payout-uuid",
    "amount": 33500,
    "status": "PENDING",
    "initiatedAt": "2025-12-15T13:00:00.000Z",
    "capped": false,
    "requestedAmount": 33500,
    "actualAmount": 33500
  },
  "policy": {
    "policyNumber": "POL-20251106-A1B2C3",
    "sumInsured": 50000,
    "previousPayouts": 0,
    "remainingCoverage": 16500
  },
  "farmer": {
    "id": "farmer-uuid",
    "name": "John Kamau",
    "phoneNumber": "+254712345678"
  },
  "instructions": {
    "next": "Payout is pending. Complete M-Pesa transfer to activate.",
    "amount": 33500,
    "phoneNumber": "+254712345678"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Indices out of range
```json
{
  "success": false,
  "error": "Indices must be between 0 and 1"
}
```

- **400 Bad Request** - Below payout threshold
```json
{
  "success": false,
  "error": "Damage index below payout threshold (minimum 0.3 required)",
  "damageIndex": 0.25,
  "minimumRequired": 0.3
}
```

- **400 Bad Request** - Coverage exhausted
```json
{
  "success": false,
  "error": "Policy coverage exhausted. No remaining coverage available.",
  "sumInsured": 50000,
  "totalPayouts": 50000
}
```

---

### 4. Get Payout Details

Get detailed information about a specific payout.

**Endpoint:** `GET /api/claims/payout/:payoutId`

**URL Parameters:**
- `payoutId` (string): Payout UUID

**Success Response (200):**
```json
{
  "success": true,
  "payout": {
    "id": "payout-uuid",
    "amount": 33500,
    "status": "COMPLETED",
    "transactionHash": "0xabc...",
    "mpesaRef": "QA12XY89ZZ",
    "initiatedAt": "2025-12-15T13:00:00.000Z",
    "completedAt": "2025-12-15T13:05:00.000Z",
    "failureReason": null,
    "farmer": {
      "id": "farmer-uuid",
      "phoneNumber": "+254712345678",
      "firstName": "John",
      "lastName": "Kamau"
    },
    "policy": {
      "id": "policy-uuid",
      "policyNumber": "POL-20251106-A1B2C3",
      "coverageType": "DROUGHT",
      "sumInsured": 50000,
      "status": "CLAIMED",
      "plot": {
        "name": "Main Farm",
        "cropType": "MAIZE",
        "acreage": 2.5
      },
      "latestDamageAssessment": {
        "id": "assessment-uuid",
        "weatherStressIndex": 0.75,
        "vegetationIndex": 0.55,
        "damageIndex": 0.67,
        "triggerDate": "2025-12-15T00:00:00.000Z"
      }
    }
  }
}
```

---

### 5. Update Payout Status

Update the status of a payout (typically called by payment webhook or admin).

**Endpoint:** `PUT /api/claims/payout/:payoutId/status`

**URL Parameters:**
- `payoutId` (string): Payout UUID

**Request Body:**
```json
{
  "status": "COMPLETED",
  "transactionHash": "0xabc123...",
  "mpesaRef": "QA12XY89ZZ",
  "failureReason": null
}
```

**Required Fields:**
- `status` (string): PENDING, PROCESSING, COMPLETED, or FAILED

**Optional Fields:**
- `transactionHash` (string): Blockchain transaction hash
- `mpesaRef` (string): M-Pesa reference number
- `failureReason` (string): Reason if status is FAILED

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payout status updated to COMPLETED",
  "payout": {
    "id": "payout-uuid",
    "amount": 33500,
    "status": "COMPLETED",
    "transactionHash": "0xabc123...",
    "mpesaRef": "QA12XY89ZZ",
    "initiatedAt": "2025-12-15T13:00:00.000Z",
    "completedAt": "2025-12-15T13:05:00.000Z",
    "failureReason": null
  },
  "policy": {
    "policyNumber": "POL-20251106-A1B2C3"
  },
  "farmer": {
    "name": "John Kamau"
  }
}
```

---

## Data Models

### DamageAssessment Object
```typescript
{
  id: string;
  policyId: string;
  weatherStressIndex: number;    // 0-1
  vegetationIndex: number;        // 0-1
  damageIndex: number;            // 0-1 (calculated)
  triggerDate: Date;
  proofHash: string | null;       // IPFS/blockchain proof
  createdAt: Date;
}
```

### Payout Object
```typescript
{
  id: string;
  policyId: string;
  farmerId: string;
  amount: number;                 // KES
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transactionHash: string | null; // Blockchain tx
  mpesaRef: string | null;        // M-Pesa reference
  initiatedAt: Date;
  completedAt: Date | null;
  failureReason: string | null;
}
```

---

## Damage Assessment Examples

### Example 1: Severe Drought
```json
{
  "weatherStressIndex": 0.85,
  "vegetationIndex": 0.70,
  "damageIndex": 0.79,
  "severity": "Critical",
  "payoutPercentage": 79%
}
```

### Example 2: Moderate Flood
```json
{
  "weatherStressIndex": 0.60,
  "vegetationIndex": 0.40,
  "damageIndex": 0.52,
  "severity": "Severe",
  "payoutPercentage": 52%
}
```

### Example 3: Minor Stress (No Payout)
```json
{
  "weatherStressIndex": 0.25,
  "vegetationIndex": 0.20,
  "damageIndex": 0.23,
  "severity": "Minor",
  "payoutPercentage": 0%
}
```

---

## Testing with cURL

### Get Policy Claims
```bash
curl http://localhost:3000/api/claims/{policy-id}
```

### Get Farmer Payouts
```bash
curl "http://localhost:3000/api/claims/payouts/{farmer-id}?status=COMPLETED"
```

### Process Payout
```bash
curl -X POST http://localhost:3000/api/claims/process \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "policy-uuid",
    "weatherStressIndex": 0.75,
    "vegetationIndex": 0.55,
    "proofHash": "ipfs://Qm..."
  }'
```

### Update Payout Status
```bash
curl -X PUT http://localhost:3000/api/claims/payout/{payout-id}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "mpesaRef": "QA12XY89ZZ"
  }'
```

---

## Business Rules

1. **Damage Threshold**: Minimum damage index of 0.3 required for payout
2. **Coverage Limits**: Total payouts cannot exceed policy sum insured
3. **Payout Capping**: If calculated payout exceeds remaining coverage, it's capped
4. **Policy Status**: Policy must be ACTIVE to process new payouts
5. **Trigger Date**: Must be within policy coverage period
6. **Weight Formula**: 60% weather data, 40% vegetation/satellite data
7. **Status Updates**: Payouts go PENDING → PROCESSING → COMPLETED/FAILED
8. **Auto Policy Update**: Policy status changes to CLAIMED if damage > 0.7 or payout > 80%

---

## Integration Notes

### Weather Worker Integration
```javascript
// Automated damage assessment
1. Weather worker detects threshold breach
2. Fetches satellite/vegetation data
3. Calculates damage indices
4. Calls POST /api/claims/process
5. Payout created automatically
```

### Payment Integration
```javascript
// Payout execution flow
1. Payout created with PENDING status
2. Payment service initiates M-Pesa transfer
3. On success: PUT /api/claims/payout/:id/status → COMPLETED
4. On failure: PUT /api/claims/payout/:id/status → FAILED
```

---

## Error Handling

All endpoints follow consistent error format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Technical details (dev mode only)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Related Documentation

- [Policy API Documentation](./POLICY_API_DOCUMENTATION.md)
- [Admin API Documentation](./ADMIN_API_DOCUMENTATION.md)
- [Weather Integration](./WEATHERXM_INTEGRATION.md)
- [Payment Integration](./SWYPT_INTEGRATION.md)
