# Admin API Documentation

Complete API documentation for administrative operations, analytics, and system management in the MicroCrop parametric insurance platform.

## Base URL
```
http://localhost:3000/api/admin
```

> **⚠️ SECURITY NOTE**: All admin endpoints should be protected with authentication middleware. Add role-based access control (RBAC) before production deployment.

---

## Endpoints

### 1. Get Dashboard Metrics

Retrieve comprehensive dashboard metrics and analytics for system monitoring.

**Endpoint:** `GET /api/admin/dashboard`

**Query Parameters:**
- `period` (number): Days to analyze (default: 30)

**Examples:**
```
GET /api/admin/dashboard
GET /api/admin/dashboard?period=7   # Last 7 days
GET /api/admin/dashboard?period=90  # Last 90 days
```

**Success Response (200):**
```json
{
  "success": true,
  "period": 30,
  "data": {
    "overview": {
      "totalFarmers": 1247,
      "totalPolicies": 856,
      "totalPlots": 1893,
      "activePolicies": 645,
      "claimedPolicies": 128,
      "expiredPolicies": 83,
      "pendingPayouts": 23
    },
    "financial": {
      "premiumsCollected": 4250000,
      "payoutsDisbursed": 1875000,
      "netIncome": 2375000,
      "lossRatio": 0.44,
      "averagePremium": 4964.95,
      "averagePayout": 14648.44
    },
    "growth": {
      "newFarmers": 89,
      "newPolicies": 156,
      "farmerGrowthRate": 7.69,
      "policyGrowthRate": 22.27
    },
    "farmers": {
      "byKycStatus": {
        "PENDING": 234,
        "APPROVED": 987,
        "REJECTED": 26
      },
      "topCounties": [
        {
          "county": "Nakuru",
          "count": 312,
          "percentage": 25.02
        },
        {
          "county": "Kiambu",
          "count": 289,
          "percentage": 23.17
        }
      ]
    },
    "policies": {
      "byStatus": {
        "PENDING": 45,
        "ACTIVE": 645,
        "CLAIMED": 128,
        "EXPIRED": 83
      },
      "byCoverageType": {
        "DROUGHT": 456,
        "FLOOD": 234,
        "BOTH": 166
      },
      "utilizationRate": 14.95
    },
    "plots": {
      "byCropType": {
        "MAIZE": 567,
        "BEANS": 345,
        "WHEAT": 289,
        "SORGHUM": 234,
        "MILLET": 123
      },
      "averageAcreage": 3.45
    },
    "payouts": {
      "byStatus": {
        "PENDING": 23,
        "PROCESSING": 12,
        "COMPLETED": 456,
        "FAILED": 8
      },
      "totalAmount": 1875000,
      "averageAmount": 14648.44
    },
    "recentActivity": {
      "policies": [
        {
          "id": "policy-uuid",
          "policyNumber": "POL-20251106-A1B2C3",
          "farmer": "John Kamau",
          "premium": 2500,
          "status": "ACTIVE",
          "startDate": "2025-11-06T00:00:00.000Z"
        }
      ],
      "payouts": [
        {
          "id": "payout-uuid",
          "farmer": "Jane Wanjiru",
          "amount": 15000,
          "status": "COMPLETED",
          "completedAt": "2025-11-05T10:30:00.000Z"
        }
      ],
      "transactions": [
        {
          "id": "tx-uuid",
          "type": "PREMIUM",
          "amount": 2500,
          "farmer": "Peter Otieno",
          "createdAt": "2025-11-06T08:45:00.000Z"
        }
      ]
    },
    "pendingActions": {
      "kycPending": 234,
      "payoutsPending": 23,
      "policiesNeedingActivation": 45
    }
  }
}
```

**Dashboard Sections Explained:**

#### Overview
- Total counts of key entities
- Policy status breakdown
- Pending administrative actions

#### Financial Metrics
- **Loss Ratio**: `payoutsDisbursed / premiumsCollected` (target: < 0.80)
- **Net Income**: Total premiums - total payouts
- Average premium and payout amounts

#### Growth Analytics
- New entities added in the period
- Growth rates as percentage of total

#### Distribution Analytics
- Farmers by KYC status and county
- Policies by status and coverage type
- Plots by crop type
- Policy utilization rate

#### Recent Activity
- Last 10 policies (sorted by most recent)
- Last 10 payouts (sorted by completion date)
- Last 10 transactions (all types)

---

### 2. Get System Statistics

Get comprehensive system-wide statistics and ratios.

**Endpoint:** `GET /api/admin/stats`

**Success Response (200):**
```json
{
  "success": true,
  "stats": {
    "counts": {
      "farmers": 1247,
      "policies": 856,
      "plots": 1893,
      "damageAssessments": 234,
      "payouts": 499,
      "transactions": 1734
    },
    "premiums": {
      "total": 4250000,
      "average": 4964.95,
      "maximum": 15000,
      "minimum": 1200
    },
    "payouts": {
      "total": 1875000,
      "average": 14648.44,
      "count": 128,
      "pending": 23
    },
    "coverage": {
      "totalSumInsured": 42800000,
      "totalClaimed": 6450000,
      "utilizationRate": 15.07
    },
    "ratios": {
      "lossRatio": 0.44,
      "plotsPerFarmer": 1.52,
      "policiesPerFarmer": 0.69,
      "claimRate": 14.95,
      "kycApprovalRate": 79.15
    }
  }
}
```

**Key Metrics Explained:**

- **Loss Ratio**: Payouts ÷ Premiums (healthy range: 0.40-0.70)
- **Plots Per Farmer**: Total plots ÷ Total farmers
- **Policies Per Farmer**: Total policies ÷ Total farmers
- **Claim Rate**: (Claimed policies ÷ Total policies) × 100
- **Utilization Rate**: (Total claimed ÷ Total sum insured) × 100
- **KYC Approval Rate**: (Approved ÷ Total) × 100

---

### 3. Simulate Weather Event

Create a simulated weather event for testing payout triggers (development/demo purposes).

**Endpoint:** `POST /api/admin/weather/simulate`

**Request Body:**
```json
{
  "policyId": "policy-uuid",
  "eventType": "DROUGHT",
  "weatherStressIndex": 0.80,
  "vegetationIndex": 0.65
}
```

**Required Fields:**
- `policyId` (string): Policy UUID to simulate event for
- `eventType` (string): DROUGHT, FLOOD, or HEAT

**Optional Fields:**
- `weatherStressIndex` (number): 0-1 scale (defaults based on event type)
- `vegetationIndex` (number): 0-1 scale (defaults based on event type)

**Default Indices by Event Type:**
```javascript
DROUGHT: {
  weatherStressIndex: 0.8,
  vegetationIndex: 0.7
}

FLOOD: {
  weatherStressIndex: 0.7,
  vegetationIndex: 0.5
}

HEAT: {
  weatherStressIndex: 0.6,
  vegetationIndex: 0.4
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Weather event simulated successfully",
  "simulation": {
    "eventType": "DROUGHT",
    "weatherStressIndex": 0.8,
    "vegetationIndex": 0.7,
    "damageIndex": 0.76
  },
  "damageAssessment": {
    "id": "assessment-uuid",
    "policyId": "policy-uuid",
    "weatherStressIndex": 0.8,
    "vegetationIndex": 0.7,
    "damageIndex": 0.76,
    "triggerDate": "2025-11-06T10:30:00.000Z",
    "proofHash": "SIMULATED_EVENT_2025-11-06",
    "createdAt": "2025-11-06T10:30:00.000Z"
  },
  "payout": {
    "id": "payout-uuid",
    "amount": 32857,
    "status": "PENDING",
    "initiatedAt": "2025-11-06T10:30:00.000Z",
    "calculationDetails": {
      "damageIndex": 0.76,
      "payoutPercentage": 0.7657,
      "sumInsured": 50000,
      "calculatedAmount": 38285,
      "cappedAmount": 32857,
      "remainingCoverage": 32857
    }
  },
  "policy": {
    "policyNumber": "POL-20251106-A1B2C3",
    "sumInsured": 50000,
    "status": "CLAIMED"
  },
  "farmer": {
    "name": "John Kamau",
    "phoneNumber": "+254712345678"
  }
}
```

**Use Cases:**
- Testing payout calculation logic
- Demonstrating system to stakeholders
- Training staff on claim processing
- Validating damage assessment algorithms

---

### 4. Approve/Reject Payout

Manually approve or reject a pending payout.

**Endpoint:** `POST /api/admin/payout/approve`

**Request Body:**
```json
{
  "payoutId": "payout-uuid",
  "approved": true,
  "transactionHash": "0xabc123...",
  "mpesaRef": "QA12XY89ZZ",
  "failureReason": null
}
```

**Required Fields:**
- `payoutId` (string): Payout UUID
- `approved` (boolean): true = approve, false = reject

**Optional Fields (for approval):**
- `transactionHash` (string): Blockchain transaction hash
- `mpesaRef` (string): M-Pesa reference number

**Optional Fields (for rejection):**
- `failureReason` (string): Reason for rejection

**Success Response (200) - Approval:**
```json
{
  "success": true,
  "message": "Payout approved successfully",
  "payout": {
    "id": "payout-uuid",
    "amount": 32857,
    "status": "COMPLETED",
    "transactionHash": "0xabc123...",
    "mpesaRef": "QA12XY89ZZ",
    "initiatedAt": "2025-11-06T10:30:00.000Z",
    "completedAt": "2025-11-06T11:00:00.000Z",
    "failureReason": null
  },
  "policy": {
    "policyNumber": "POL-20251106-A1B2C3",
    "status": "CLAIMED"
  },
  "farmer": {
    "name": "John Kamau",
    "phoneNumber": "+254712345678"
  }
}
```

**Success Response (200) - Rejection:**
```json
{
  "success": true,
  "message": "Payout rejected",
  "payout": {
    "id": "payout-uuid",
    "amount": 32857,
    "status": "FAILED",
    "failureReason": "Insufficient proof of damage",
    "initiatedAt": "2025-11-06T10:30:00.000Z",
    "completedAt": "2025-11-06T11:00:00.000Z"
  }
}
```

**Error Responses:**

- **404 Not Found** - Payout doesn't exist
- **400 Bad Request** - Payout already completed/failed

---

### 5. Bulk Approve KYC

Approve KYC status for multiple farmers at once.

**Endpoint:** `POST /api/admin/kyc/bulk-approve`

**Request Body:**
```json
{
  "farmerIds": [
    "farmer-uuid-1",
    "farmer-uuid-2",
    "farmer-uuid-3"
  ]
}
```

**Required Fields:**
- `farmerIds` (array): Array of farmer UUIDs

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bulk KYC approval completed",
  "results": {
    "requested": 3,
    "approved": 2,
    "alreadyApproved": 1,
    "notFound": 0
  },
  "farmers": [
    {
      "id": "farmer-uuid-1",
      "phoneNumber": "+254712345678",
      "firstName": "John",
      "lastName": "Kamau",
      "kycStatus": "APPROVED",
      "updatedAt": "2025-11-06T11:00:00.000Z"
    },
    {
      "id": "farmer-uuid-2",
      "phoneNumber": "+254723456789",
      "firstName": "Jane",
      "lastName": "Wanjiru",
      "kycStatus": "APPROVED",
      "updatedAt": "2025-11-06T11:00:00.000Z"
    }
  ]
}
```

**Business Logic:**
- Only approves farmers with `kycStatus = 'PENDING'`
- Skips farmers already approved
- Ignores non-existent farmer IDs
- Updates all valid farmers in a single transaction

---

## Analytics & Reporting

### Dashboard Refresh Rate
- **Recommended**: Every 5 minutes for real-time monitoring
- **Minimum**: Every 30 seconds (consider caching)

### Key Performance Indicators (KPIs)

#### Financial Health
```
Loss Ratio = Payouts / Premiums
Target: 0.40 - 0.70 (healthy range)
Alert if: > 0.80 (unsustainable)
```

#### Growth Metrics
```
Farmer Growth Rate = (New Farmers / Total Farmers) × 100
Policy Growth Rate = (New Policies / Total Policies) × 100
Target: > 5% monthly growth
```

#### Operational Efficiency
```
KYC Approval Rate = (Approved / Total) × 100
Target: > 75%

Claim Processing Time = Average time PENDING → COMPLETED
Target: < 24 hours
```

#### Risk Metrics
```
Claim Rate = (Claimed Policies / Total Policies) × 100
Target: 10-20% (normal agricultural risk)
Alert if: > 30% (high risk period)

Utilization Rate = (Total Claims / Total Sum Insured) × 100
Target: < 20%
```

---

## Testing with cURL

### Get Dashboard
```bash
curl http://localhost:3000/api/admin/dashboard
curl "http://localhost:3000/api/admin/dashboard?period=7"
```

### Get System Stats
```bash
curl http://localhost:3000/api/admin/stats
```

### Simulate Weather Event
```bash
curl -X POST http://localhost:3000/api/admin/weather/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "policy-uuid",
    "eventType": "DROUGHT"
  }'
```

### Approve Payout
```bash
curl -X POST http://localhost:3000/api/admin/payout/approve \
  -H "Content-Type: application/json" \
  -d '{
    "payoutId": "payout-uuid",
    "approved": true,
    "mpesaRef": "QA12XY89ZZ"
  }'
```

### Bulk Approve KYC
```bash
curl -X POST http://localhost:3000/api/admin/kyc/bulk-approve \
  -H "Content-Type: application/json" \
  -d '{
    "farmerIds": ["uuid-1", "uuid-2", "uuid-3"]
  }'
```

---

## Security Recommendations

### Authentication
```javascript
// Add JWT middleware to all admin routes
router.use(authMiddleware);
router.use(adminRoleMiddleware);

// Example middleware
const adminRoleMiddleware = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      error: 'Forbidden: Admin access required' 
    });
  }
  next();
};
```

### Rate Limiting
```javascript
// Protect admin endpoints from abuse
import rateLimit from 'express-rate-limit';

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.use('/api/admin', adminLimiter);
```

### Audit Logging
```javascript
// Log all admin actions
router.use((req, res, next) => {
  logger.info('Admin action', {
    user: req.user.id,
    action: req.method,
    endpoint: req.path,
    ip: req.ip
  });
  next();
});
```

---

## Frontend Integration

### Dashboard Component Example
```javascript
// React dashboard component
import { useEffect, useState } from 'react';

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    fetch(`/api/admin/dashboard?period=${period}`)
      .then(res => res.json())
      .then(data => setDashboard(data.data));
  }, [period]);

  if (!dashboard) return <div>Loading...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <select onChange={e => setPeriod(e.target.value)}>
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
      </select>

      <div className="metrics">
        <div className="card">
          <h3>Total Farmers</h3>
          <p>{dashboard.overview.totalFarmers}</p>
        </div>
        <div className="card">
          <h3>Active Policies</h3>
          <p>{dashboard.overview.activePolicies}</p>
        </div>
        <div className="card">
          <h3>Loss Ratio</h3>
          <p>{(dashboard.financial.lossRatio * 100).toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Database Query Performance

### Optimization Notes

The dashboard endpoint performs 20+ database queries. For production:

1. **Use Database Indexes:**
```sql
CREATE INDEX idx_farmer_kyc ON Farmer(kycStatus);
CREATE INDEX idx_policy_status ON Policy(status);
CREATE INDEX idx_policy_dates ON Policy(startDate, endDate);
CREATE INDEX idx_payout_status ON Payout(status);
```

2. **Implement Caching:**
```javascript
// Redis caching for dashboard
const cachedDashboard = await redis.get(`dashboard:${period}`);
if (cachedDashboard) return JSON.parse(cachedDashboard);

// Generate dashboard...
await redis.setex(`dashboard:${period}`, 300, JSON.stringify(dashboard));
```

3. **Use Materialized Views:**
```sql
-- Pre-calculate expensive aggregations
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
  COUNT(DISTINCT f.id) as total_farmers,
  COUNT(DISTINCT p.id) as total_policies,
  SUM(p.premium) as total_premiums
FROM Farmer f
LEFT JOIN Policy p ON p.farmerId = f.id;
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
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Monitoring Alerts

### Recommended Alert Thresholds

**Financial Alerts:**
- Loss Ratio > 0.80 (immediate review required)
- Net Income negative for 7+ days
- Average payout > 2× average premium

**Operational Alerts:**
- Pending payouts > 50
- Pending KYC > 500
- Claim processing time > 48 hours

**System Health:**
- Dashboard load time > 3 seconds
- Error rate > 1%
- Database connection failures

---

## Related Documentation

- [Farmer API Documentation](./FARMER_API_DOCUMENTATION.md)
- [Policy API Documentation](./POLICY_API_DOCUMENTATION.md)
- [Claims API Documentation](./CLAIM_API_DOCUMENTATION.md)
- [System Architecture](./backend-context.md)
