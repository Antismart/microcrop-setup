# Policy API Documentation

Complete API documentation for insurance policy management endpoints in the MicroCrop parametric insurance platform.

## Base URL
```
http://localhost:3000/api/policies
```

---

## Premium Calculation Formula

### Base Formula
```
Premium = SumInsured × BaseRate × CropRiskFactor × DurationFactor
```

### Base Rates by Coverage Type
- **Drought**: 5% of sum insured
- **Flood**: 4% of sum insured  
- **Both**: 8% of sum insured (10% discount vs buying separately)

### Crop Risk Factors
| Crop Type | Factor | Notes |
|-----------|--------|-------|
| MAIZE | 1.0 | Baseline crop |
| BEANS | 1.2 | More vulnerable |
| POTATOES | 0.9 | Less vulnerable |
| WHEAT | 1.1 | Moderate risk |
| RICE | 1.3 | Water-intensive, high risk |
| SORGHUM | 0.8 | Drought-resistant |
| MILLET | 0.7 | Very drought-resistant |
| CASSAVA | 0.75 | Hardy crop |
| SWEET_POTATO | 0.85 | Moderate resilience |
| VEGETABLES | 1.4 | High value, high risk |
| OTHER | 1.0 | Default |

### Duration Factors
| Duration | Factor | Discount |
|----------|--------|----------|
| ≤ 3 months | 0.8 | 20% discount |
| 4-6 months | 1.0 | Standard |
| 7-9 months | 1.2 | 20% premium |
| 10+ months | 1.4 | 40% premium |

### Example Calculation
```
Plot: 2.5 acres of MAIZE
Coverage: DROUGHT (both drought & flood)
Sum Insured: KES 50,000
Duration: 6 months

Premium = 50,000 × 0.08 × 1.0 × 1.0 = KES 4,000
```

---

## Endpoints

### 1. Get Insurance Quote

Get a premium quote for insurance coverage without creating a policy.

**Endpoint:** `POST /api/policies/quote`

**Request Body:**
```json
{
  "plotId": "uuid-string",
  "coverageType": "DROUGHT",
  "sumInsured": 50000,
  "durationMonths": 6
}
```

**Required Fields:**
- `plotId` (string): UUID of the plot to insure
- `coverageType` (string): Must be `DROUGHT`, `FLOOD`, or `BOTH`
- `sumInsured` (number): Amount to insure (KES 1,000 - 1,000,000)

**Optional Fields:**
- `durationMonths` (number): Coverage duration in months (default: 6)

**Success Response (200):**
```json
{
  "success": true,
  "quote": {
    "plotId": "uuid-string",
    "plotName": "Main Farm",
    "acreage": 2.5,
    "cropType": "MAIZE",
    "coverageType": "DROUGHT",
    "sumInsured": 50000,
    "premium": 4000,
    "premiumRate": "8.00%",
    "durationMonths": 6,
    "startDate": "2025-11-06T00:00:00.000Z",
    "endDate": "2026-05-06T00:00:00.000Z",
    "thresholds": {
      "precipitationThreshold": 50,
      "consecutiveDays": 21,
      "severityMultiplier": 1.5
    },
    "farmer": {
      "id": "farmer-uuid",
      "name": "John Kamau",
      "kycStatus": "APPROVED"
    },
    "breakdown": {
      "baseRate": "8.0%",
      "cropRiskFactor": 1.0,
      "durationFactor": 1.0
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing fields
```json
{
  "success": false,
  "error": "Missing required fields: plotId, coverageType, sumInsured"
}
```

- **400 Bad Request** - Invalid coverage type
```json
{
  "success": false,
  "error": "Invalid coverageType. Must be DROUGHT, FLOOD, or BOTH"
}
```

- **400 Bad Request** - Invalid sum insured
```json
{
  "success": false,
  "error": "Sum insured must be between KES 1,000 and KES 1,000,000"
}
```

- **404 Not Found** - Plot doesn't exist
```json
{
  "success": false,
  "error": "Plot not found"
}
```

---

### 2. Purchase Insurance Policy

Create a new insurance policy and initiate payment process.

**Endpoint:** `POST /api/policies/purchase`

**Request Body:**
```json
{
  "plotId": "uuid-string",
  "coverageType": "BOTH",
  "sumInsured": 50000,
  "durationMonths": 6,
  "customThresholds": {
    "droughtThreshold": 45,
    "droughtDays": 21,
    "floodThreshold": 320,
    "floodHours": 48
  }
}
```

**Required Fields:**
- `plotId` (string): UUID of the plot to insure
- `coverageType` (string): `DROUGHT`, `FLOOD`, or `BOTH`
- `sumInsured` (number): Amount to insure (KES 1,000 - 1,000,000)

**Optional Fields:**
- `durationMonths` (number): Coverage duration (default: 6)
- `customThresholds` (object): Custom trigger thresholds (uses defaults if not provided)

**Success Response (201):**
```json
{
  "success": true,
  "message": "Policy created successfully. Awaiting payment confirmation.",
  "policy": {
    "id": "policy-uuid",
    "policyNumber": "POL-20251106-A1B2C3",
    "coverageType": "BOTH",
    "sumInsured": 50000,
    "premium": 4000,
    "startDate": "2025-11-06T00:00:00.000Z",
    "endDate": "2026-05-06T00:00:00.000Z",
    "status": "PENDING_PAYMENT",
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
      "cropType": "MAIZE"
    },
    "droughtThreshold": {
      "precipitationThreshold": 45,
      "consecutiveDays": 21,
      "severityMultiplier": 1.5
    },
    "floodThreshold": {
      "precipitationThreshold": 320,
      "consecutiveHours": 48,
      "severityMultiplier": 1.8
    }
  },
  "paymentInstructions": {
    "amount": 4000,
    "phoneNumber": "+254712345678",
    "reference": "POL-20251106-A1B2C3",
    "note": "Complete payment to activate policy"
  }
}
```

**Error Responses:**

- **403 Forbidden** - KYC not approved
```json
{
  "success": false,
  "error": "KYC approval required before purchasing insurance",
  "kycStatus": "PENDING"
}
```

- **409 Conflict** - Existing active policy
```json
{
  "success": false,
  "error": "Plot already has an active or pending policy",
  "existingPolicyId": "existing-uuid",
  "existingPolicyNumber": "POL-20251105-XYZ123"
}
```

---

### 3. Get Farmer's Policies

Retrieve all policies for a specific farmer with pagination.

**Endpoint:** `GET /api/policies/farmer/:farmerId`

**URL Parameters:**
- `farmerId` (string): Farmer UUID

**Query Parameters (all optional):**
- `status` (string): Filter by policy status
- `page` (number): Page number (default: 1)
- `limit` (number): Records per page (default: 20)

**Examples:**
```
GET /api/policies/farmer/uuid-123
GET /api/policies/farmer/uuid-123?status=ACTIVE
GET /api/policies/farmer/uuid-123?page=2&limit=10
```

**Success Response (200):**
```json
{
  "success": true,
  "policies": [
    {
      "id": "policy-uuid",
      "policyNumber": "POL-20251106-A1B2C3",
      "farmerId": "farmer-uuid",
      "plotId": "plot-uuid",
      "coverageType": "BOTH",
      "sumInsured": 50000,
      "premium": 4000,
      "startDate": "2025-11-06T00:00:00.000Z",
      "endDate": "2026-05-06T00:00:00.000Z",
      "status": "ACTIVE",
      "createdAt": "2025-11-06T10:30:00.000Z",
      "updatedAt": "2025-11-06T10:35:00.000Z",
      "plot": {
        "id": "plot-uuid",
        "name": "Main Farm",
        "acreage": 2.5,
        "cropType": "MAIZE",
        "latitude": -1.2921,
        "longitude": 36.8219
      },
      "droughtThreshold": {
        "precipitationThreshold": 50,
        "consecutiveDays": 21,
        "severityMultiplier": 1.5
      },
      "floodThreshold": null,
      "damageAssessments": [],
      "payouts": []
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalRecords": 1,
    "limit": 20,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

---

### 4. Get Policy Status

Get detailed status and information about a specific policy.

**Endpoint:** `GET /api/policies/:id/status`

**URL Parameters:**
- `id` (string): Policy UUID

**Success Response (200):**
```json
{
  "success": true,
  "policy": {
    "id": "policy-uuid",
    "policyNumber": "POL-20251106-A1B2C3",
    "status": "ACTIVE",
    "coverageType": "BOTH",
    "sumInsured": 50000,
    "premium": 4000,
    "startDate": "2025-11-06T00:00:00.000Z",
    "endDate": "2026-05-06T00:00:00.000Z",
    "isActive": true,
    "daysRemaining": 180,
    "createdAt": "2025-11-06T10:30:00.000Z",
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
      "longitude": 36.8219,
      "weatherStationId": "station-123"
    },
    "droughtThreshold": {
      "precipitationThreshold": 50,
      "consecutiveDays": 21,
      "severityMultiplier": 1.5
    },
    "floodThreshold": {
      "precipitationThreshold": 300,
      "consecutiveHours": 48,
      "severityMultiplier": 1.8
    },
    "damageAssessments": [
      {
        "id": "assessment-uuid",
        "policyId": "policy-uuid",
        "weatherStressIndex": 0.65,
        "vegetationIndex": 0.3,
        "damageIndex": 0.52,
        "triggerDate": "2025-12-15T00:00:00.000Z",
        "proofHash": "ipfs://Qm...",
        "createdAt": "2025-12-15T12:00:00.000Z"
      }
    ],
    "payouts": [
      {
        "id": "payout-uuid",
        "policyId": "policy-uuid",
        "farmerId": "farmer-uuid",
        "amount": 25000,
        "status": "COMPLETED",
        "transactionHash": "0xabc...",
        "mpesaRef": "QA12XY89ZZ",
        "initiatedAt": "2025-12-15T13:00:00.000Z",
        "completedAt": "2025-12-15T13:05:00.000Z"
      }
    ],
    "summary": {
      "totalDamageAssessments": 1,
      "totalPayouts": 1,
      "totalPayoutAmount": 25000,
      "remainingCoverage": 25000
    }
  }
}
```

**Error Responses:**

- **404 Not Found**
```json
{
  "success": false,
  "error": "Policy not found"
}
```

---

### 5. Activate Policy

Activate a policy after payment confirmation (typically called by payment webhook).

**Endpoint:** `PUT /api/policies/:id/activate`

**URL Parameters:**
- `id` (string): Policy UUID

**Request Body:**
```json
{
  "transactionReference": "MPESA-REF-123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Policy activated successfully",
  "policy": {
    "id": "policy-uuid",
    "policyNumber": "POL-20251106-A1B2C3",
    "status": "ACTIVE",
    "startDate": "2025-11-06T00:00:00.000Z",
    "endDate": "2026-05-06T00:00:00.000Z"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid status
```json
{
  "success": false,
  "error": "Cannot activate policy with status: ACTIVE"
}
```

- **404 Not Found**
```json
{
  "success": false,
  "error": "Policy not found"
}
```

---

### 6. Cancel Policy

Cancel a pending policy before payment.

**Endpoint:** `PUT /api/policies/:id/cancel`

**URL Parameters:**
- `id` (string): Policy UUID

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Policy cancelled successfully",
  "policy": {
    "id": "policy-uuid",
    "policyNumber": "POL-20251106-A1B2C3",
    "status": "CANCELLED"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Cannot cancel
```json
{
  "success": false,
  "error": "Only pending policies can be cancelled",
  "currentStatus": "ACTIVE"
}
```

---

## Data Models

### Policy Object
```typescript
{
  id: string;                    // UUID
  policyNumber: string;          // Format: POL-YYYYMMDD-XXXXXX
  farmerId: string;              // UUID
  plotId: string;                // UUID
  coverageType: 'DROUGHT' | 'FLOOD' | 'BOTH';
  sumInsured: number;            // KES amount
  premium: number;               // KES amount
  startDate: Date;
  endDate: Date;
  status: 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'CLAIMED';
  droughtThreshold: object | null;
  floodThreshold: object | null;
  createdAt: Date;
  updatedAt: Date;
}
```

### Threshold Object
```typescript
{
  precipitationThreshold: number;  // mm
  consecutiveDays?: number;        // for drought
  consecutiveHours?: number;       // for flood
  severityMultiplier: number;      // damage calculation multiplier
}
```

### Policy Status
- `PENDING_PAYMENT` - Awaiting premium payment
- `ACTIVE` - Policy is active and providing coverage
- `EXPIRED` - Coverage period ended
- `CANCELLED` - Policy was cancelled
- `CLAIMED` - Payout has been triggered

---

## Default Thresholds

### Drought Coverage
```json
{
  "precipitationThreshold": 50,
  "consecutiveDays": 21,
  "severityMultiplier": 1.5
}
```
**Trigger**: When precipitation falls below 50mm per month for 21 consecutive days.

### Flood Coverage
```json
{
  "precipitationThreshold": 300,
  "consecutiveHours": 48,
  "severityMultiplier": 1.8
}
```
**Trigger**: When precipitation exceeds 300mm per week for 48 consecutive hours.

### Both Coverage
Uses both drought and flood thresholds independently.

---

## Testing with cURL

### Get Quote
```bash
curl -X POST http://localhost:3000/api/policies/quote \
  -H "Content-Type: application/json" \
  -d '{
    "plotId": "plot-uuid",
    "coverageType": "BOTH",
    "sumInsured": 50000,
    "durationMonths": 6
  }'
```

### Purchase Policy
```bash
curl -X POST http://localhost:3000/api/policies/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "plotId": "plot-uuid",
    "coverageType": "DROUGHT",
    "sumInsured": 30000,
    "durationMonths": 4
  }'
```

### Get Farmer's Policies
```bash
curl http://localhost:3000/api/policies/farmer/{farmer-id}
```

### Get Policy Status
```bash
curl http://localhost:3000/api/policies/{policy-id}/status
```

### Activate Policy
```bash
curl -X PUT http://localhost:3000/api/policies/{policy-id}/activate \
  -H "Content-Type: application/json" \
  -d '{
    "transactionReference": "MPESA-REF-123456"
  }'
```

---

## Business Rules

1. **KYC Requirement**: Farmers must have `APPROVED` KYC status to purchase insurance
2. **One Policy Per Plot**: Each plot can only have one active or pending policy at a time
3. **Sum Insured Limits**: KES 1,000 minimum, KES 1,000,000 maximum
4. **Duration Range**: 1-12 months (recommended 4-6 months for seasonal crops)
5. **Premium Payment**: Policy remains `PENDING_PAYMENT` until payment is confirmed
6. **Auto-Expiry**: Policies automatically expire at end date if not claimed
7. **Cancellation**: Only `PENDING_PAYMENT` policies can be cancelled
8. **Payout Limits**: Total payouts cannot exceed sum insured

---

## Premium Examples

| Crop | Coverage | Sum Insured | Duration | Premium | Rate |
|------|----------|-------------|----------|---------|------|
| MAIZE | DROUGHT | 50,000 | 6 months | 2,500 | 5.0% |
| MAIZE | BOTH | 50,000 | 6 months | 4,000 | 8.0% |
| BEANS | DROUGHT | 30,000 | 4 months | 1,800 | 6.0% |
| SORGHUM | DROUGHT | 40,000 | 6 months | 1,600 | 4.0% |
| RICE | FLOOD | 60,000 | 8 months | 3,744 | 6.24% |
| VEGETABLES | BOTH | 100,000 | 3 months | 8,960 | 8.96% |

---

## Integration Notes

### USSD Flow Integration
```
Step 1: Select plot
Step 2: Choose coverage type
Step 3: Enter sum insured
Step 4: Get quote
Step 5: Confirm purchase → Creates policy
Step 6: STK Push for payment
Step 7: Payment webhook → Activates policy
```

### Payment Integration
- Policy created with `PENDING_PAYMENT` status
- Payment service initiates M-Pesa STK Push
- Payment webhook calls `/api/policies/:id/activate`
- Policy status changes to `ACTIVE`
- SMS confirmation sent to farmer

### Weather Monitoring
- Active policies monitored by weather worker
- WeatherXM data checked against thresholds
- Triggers create damage assessments
- Payouts initiated automatically

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
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Related Documentation

- [Farmer API Documentation](./FARMER_API_DOCUMENTATION.md)
- [Payment Integration](./SWYPT_INTEGRATION.md)
- [Weather Integration](./WEATHERXM_INTEGRATION.md)
- [USSD Flow](./USSD_FLOW.md)
