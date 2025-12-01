# IPFS Integration Documentation
## MicroCrop Insurance Platform - Decentralized Storage

**Version:** 1.0  
**Last Updated:** 2025  
**Service:** Pinata IPFS  

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Service Methods](#service-methods)
5. [Integration Points](#integration-points)
6. [Data Structures](#data-structures)
7. [Use Cases](#use-cases)
8. [Security & Privacy](#security--privacy)
9. [Error Handling](#error-handling)
10. [Testing](#testing)
11. [Blockchain Integration](#blockchain-integration)

---

## Overview

### Purpose

The IPFS (InterPlanetary File System) integration provides **decentralized, immutable storage** for critical insurance data that requires transparency, auditability, and blockchain verification.

### Why IPFS?

1. **Immutable Proofs**: Once uploaded, content cannot be altered (content-addressed storage)
2. **Decentralization**: No single point of failure; data distributed across IPFS network
3. **Blockchain Compatibility**: IPFS CIDs (Content Identifiers) can be stored on-chain for verification
4. **Cost Efficiency**: Store large data off-chain, only store CID on-chain
5. **Transparency**: Anyone with CID can verify claim proofs independently

### Provider: Pinata

- **Service**: [Pinata Cloud](https://pinata.cloud)
- **SDK Version**: Latest (pinata npm package)
- **Authentication**: JWT-based
- **Gateway**: gateway.pinata.cloud
- **Regions**: FRA1 (Frankfurt), NYC1 (New York)
- **Replication**: Dual-region for redundancy

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    MicroCrop Backend API                          │
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Claim      │─────▶│  IPFS        │─────▶│   Pinata     │  │
│  │   Controller │      │  Service     │      │   API        │  │
│  └──────────────┘      └──────────────┘      └──────────────┘  │
│         │                      │                      │          │
│         │                      │                      ▼          │
│         ▼                      ▼              ┌──────────────┐  │
│  ┌──────────────┐      ┌──────────────┐      │ IPFS Network │  │
│  │  PostgreSQL  │      │   Logger     │      └──────────────┘  │
│  │  (proofHash) │      │              │              │          │
│  └──────────────┘      └──────────────┘              │          │
│                                                       ▼          │
└───────────────────────────────────────────────────────│──────────┘
                                                        │
                                                        ▼
                                            ┌─────────────────────┐
                                            │  Gateway Access     │
                                            │  (Public/Private)   │
                                            └─────────────────────┘
                                                        │
                                                        ▼
                                            ┌─────────────────────┐
                                            │  Smart Contracts    │
                                            │  (Blockchain)       │
                                            └─────────────────────┘
```

### Data Flow

1. **Damage Assessment Created**
   - Weather data + Vegetation data collected
   - Damage index calculated (60/40 weighted)

2. **IPFS Upload Triggered**
   - Proof document assembled with all evidence
   - JSON uploaded to Pinata
   - CID (Content Identifier) returned

3. **Database Storage**
   - CID stored in `DamageAssessment.proofHash`
   - PostgreSQL maintains reference to IPFS content

4. **Blockchain Verification** (Future)
   - Smart contract stores CID
   - Anyone can verify by retrieving IPFS content

---

## Configuration

### Environment Variables

**File:** `backend/.env`

```bash
# Pinata IPFS Configuration
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Full JWT token
PINATA_GATEWAY=gateway.pinata.cloud                    # Gateway domain
```

### JWT Token Structure

The Pinata JWT contains:
- User ID: `0244c775-eec7-4cd4-b55c-c1f1cad3513e`
- Email: `timbwamoses83@gmail.com`
- Regions: FRA1, NYC1
- Status: ACTIVE
- Expiry: 2026

### Initialization

```javascript
const ipfsService = require('./services/ipfs.service');

// Initialize on server startup or first use
await ipfsService.initialize();

// Check status
const status = ipfsService.getStatus();
console.log(status);
// {
//   initialized: true,
//   gateway: 'gateway.pinata.cloud',
//   hasCredentials: true
// }
```

---

## Service Methods

### Core Methods

#### 1. `uploadJSON(data, metadata)`

Upload JSON data to IPFS.

```javascript
const result = await ipfsService.uploadJSON(
  { key: 'value', data: [1, 2, 3] },
  {
    name: 'my-data.json',
    keyvalues: { type: 'example', version: '1.0' }
  }
);

// Returns:
// {
//   cid: 'QmXYZ123...',
//   ipfsUrl: 'ipfs://QmXYZ123...',
//   gatewayUrl: 'https://gateway.pinata.cloud/ipfs/QmXYZ123...',
//   size: 1234,
//   pinataId: 'uuid',
//   timestamp: '2025-01-15T10:30:00Z'
// }
```

#### 2. `uploadFile(buffer, filename, mimeType, metadata)`

Upload binary file to IPFS.

```javascript
const buffer = fs.readFileSync('image.png');
const result = await ipfsService.uploadFile(
  buffer,
  'image.png',
  'image/png',
  { keyvalues: { type: 'satellite-image' } }
);
```

#### 3. `getData(cid)`

Retrieve data from IPFS by CID.

```javascript
const data = await ipfsService.getData('QmXYZ123...');
```

#### 4. `getGatewayUrl(cid)`

Generate gateway URL for public access.

```javascript
const url = ipfsService.getGatewayUrl('QmXYZ123...');
// 'https://gateway.pinata.cloud/ipfs/QmXYZ123...'
```

---

### Specialized Methods

#### 1. `uploadDamageProof(proofData)`

Upload comprehensive damage assessment proof.

**Input:**
```javascript
const proofData = {
  claimId: 'CLAIM-123',
  plotId: 'plot-uuid',
  farmerId: 'farmer-uuid',
  damageIndex: 0.65,
  weatherData: {
    stationId: 'WXM-12345',
    observations: [...],
    period: { start: '2025-01-01', end: '2025-01-15' },
    metrics: { rainfall: 10, temperature: 35 }
  },
  vegetationData: {
    ndviValues: [0.8, 0.6, 0.4],
    changeDetection: { decline: 0.4 },
    analysisDate: '2025-01-15'
  },
  calculationDetails: {
    weatherStress: 0.7,
    vegetationStress: 0.6,
    components: { weatherWeight: 0.6, vegetationWeight: 0.4 },
    thresholds: { noPayout: 0.3, maxPayout: 1.0 }
  },
  assessmentTimestamp: '2025-01-15T10:00:00Z'
};

const result = await ipfsService.uploadDamageProof(proofData);
```

**Output Document Structure:**
```json
{
  "version": "1.0",
  "type": "damage-assessment",
  "timestamp": "2025-01-15T10:00:00Z",
  "claim": {
    "id": "CLAIM-123",
    "plotId": "plot-uuid",
    "farmerId": "farmer-uuid"
  },
  "assessment": {
    "damageIndex": 0.65,
    "weatherStress": 0.7,
    "vegetationStress": 0.6,
    "weights": {
      "weather": 0.6,
      "vegetation": 0.4
    }
  },
  "evidence": {
    "weather": {
      "source": "WeatherXM",
      "stationId": "WXM-12345",
      "observations": [...],
      "period": {...},
      "metrics": {...}
    },
    "vegetation": {
      "source": "Spexi",
      "ndviValues": [0.8, 0.6, 0.4],
      "changeDetection": {...},
      "analysisDate": "2025-01-15"
    }
  },
  "calculation": {
    "formula": "damageIndex = (weatherStress × 0.6) + (vegetationStress × 0.4)",
    "components": {...},
    "thresholds": {...}
  },
  "metadata": {
    "ipfsUploadTimestamp": "2025-01-15T10:05:00Z",
    "system": "MicroCrop Insurance Platform",
    "version": "1.0"
  }
}
```

#### 2. `uploadPolicyDocument(policyData)`

Upload insurance policy terms to IPFS.

```javascript
const policyData = {
  policyId: 'POL-123',
  farmerId: 'farmer-uuid',
  plotId: 'plot-uuid',
  coverageType: 'COMPREHENSIVE',
  sumInsured: 50000,
  premium: 2500,
  duration: 90,
  terms: {
    cropType: 'MAIZE',
    plotSize: 2.5,
    startDate: '2025-01-01',
    endDate: '2025-04-01',
    triggers: { drought: true, flood: true },
    payoutStructure: 'TIERED',
    exclusions: ['PEST_DAMAGE', 'FIRE']
  }
};

const result = await ipfsService.uploadPolicyDocument(policyData);
```

#### 3. `uploadWeatherSnapshot(weatherSnapshot)`

Store weather data snapshot for trigger events.

```javascript
const snapshot = {
  plotId: 'plot-uuid',
  stationId: 'WXM-12345',
  observations: [...],
  period: { start: '2025-01-01', end: '2025-01-15' },
  triggerType: 'DROUGHT'
};

const result = await ipfsService.uploadWeatherSnapshot(snapshot);
```

#### 4. `uploadSatelliteImagery(imageryData)`

Store satellite imagery analysis results.

```javascript
const imagery = {
  plotId: 'plot-uuid',
  imageUrl: 'https://spexi.com/images/12345',
  ndviData: { mean: 0.6, min: 0.4, max: 0.8 },
  analysisResults: { vegetation_decline: 0.3 },
  captureDate: '2025-01-15'
};

const result = await ipfsService.uploadSatelliteImagery(imagery);
```

---

## Integration Points

### 1. Claim Processing

**File:** `src/api/controllers/claim.controller.js`

The `processPayout()` function automatically uploads damage proof to IPFS:

```javascript
const processPayout = async (req, res) => {
  // ... validation and calculation ...

  // IPFS Upload
  await ipfsService.initialize();
  
  const proofData = {
    claimId: `CLAIM-${Date.now()}`,
    plotId: policy.plot.id,
    farmerId: policy.farmerId,
    damageIndex,
    weatherData,
    vegetationData,
    calculationDetails: {
      weatherStress: weatherStressIndex,
      vegetationStress: vegetationIndex,
      components: { weatherWeight: 0.6, vegetationWeight: 0.4 },
      thresholds: { noPayout: 0.3, maxPayout: 1.0 }
    },
    assessmentTimestamp: trigger
  };

  const ipfsResult = await ipfsService.uploadDamageProof(proofData);
  
  proofHash = ipfsResult.cid;
  ipfsUrl = ipfsResult.ipfsUrl;
  gatewayUrl = ipfsResult.gatewayUrl;

  // Store CID in database
  const damageAssessment = await prisma.damageAssessment.create({
    data: {
      policyId,
      weatherStressIndex,
      vegetationIndex,
      damageIndex,
      triggerDate: trigger,
      proofHash  // IPFS CID stored here
    }
  });

  // Return with IPFS URLs
  res.json({
    success: true,
    damageAssessment: {
      proofHash,
      ipfsUrl,
      gatewayUrl
    },
    blockchain: {
      proofVerifiable: true,
      proofCID: proofHash,
      gatewayUrl
    }
  });
};
```

### 2. Policy Creation (Future)

When a policy is created, upload policy document to IPFS:

```javascript
const createPolicy = async (req, res) => {
  // ... create policy in database ...

  const policyData = {
    policyId: policy.id,
    farmerId: policy.farmerId,
    plotId: policy.plotId,
    coverageType: policy.coverageType,
    sumInsured: policy.sumInsured,
    premium: policy.premium,
    duration: policy.duration,
    terms: {
      cropType: plot.cropType,
      plotSize: plot.acreage,
      startDate: policy.startDate,
      endDate: policy.endDate,
      triggers: policy.triggers,
      payoutStructure: 'TIERED',
      exclusions: ['PEST_DAMAGE', 'FIRE']
    }
  };

  const ipfsResult = await ipfsService.uploadPolicyDocument(policyData);

  // Update policy with IPFS CID
  await prisma.policy.update({
    where: { id: policy.id },
    data: { documentHash: ipfsResult.cid }
  });
};
```

### 3. Weather Triggers (Automated)

Weather worker can upload snapshots when triggers detected:

```javascript
// In weather.worker.js
const handleWeatherTrigger = async (trigger) => {
  const snapshot = {
    plotId: trigger.plotId,
    stationId: trigger.stationId,
    observations: trigger.observations,
    period: trigger.period,
    triggerType: trigger.type  // 'DROUGHT' or 'FLOOD'
  };

  const ipfsResult = await ipfsService.uploadWeatherSnapshot(snapshot);

  // Store CID for later verification
  await prisma.weatherEvent.update({
    where: { id: trigger.id },
    data: { proofHash: ipfsResult.cid }
  });
};
```

---

## Data Structures

### Damage Assessment Proof

```typescript
interface DamageProof {
  version: string;                    // "1.0"
  type: 'damage-assessment';
  timestamp: string;                  // ISO 8601
  claim: {
    id: string;                       // Claim ID
    plotId: string;                   // Plot UUID
    farmerId: string;                 // Farmer UUID
  };
  assessment: {
    damageIndex: number;              // 0-1
    weatherStress: number;            // 0-1
    vegetationStress: number;         // 0-1
    weights: {
      weather: 0.6;
      vegetation: 0.4;
    };
  };
  evidence: {
    weather: {
      source: 'WeatherXM';
      stationId: string;
      observations: Array<Observation>;
      period: { start: string; end: string; };
      metrics: Record<string, number>;
    };
    vegetation: {
      source: 'Spexi';
      ndviValues: number[];
      changeDetection: Record<string, any>;
      analysisDate: string;
    } | null;
  };
  calculation: {
    formula: string;
    components: Record<string, any>;
    thresholds: Record<string, number>;
  };
  metadata: {
    ipfsUploadTimestamp: string;
    system: 'MicroCrop Insurance Platform';
    version: '1.0';
  };
}
```

### Policy Document

```typescript
interface PolicyDocument {
  version: string;
  type: 'insurance-policy';
  timestamp: string;
  policy: {
    id: string;
    farmerId: string;
    plotId: string;
    status: string;
  };
  coverage: {
    type: string;
    sumInsured: number;
    premium: number;
    duration: number;
    startDate: string;
    endDate: string;
  };
  terms: {
    cropType: string;
    plotSize: number;
    triggers: Record<string, boolean>;
    payoutStructure: string;
    exclusions: string[];
  };
  metadata: {
    ipfsUploadTimestamp: string;
    system: string;
    version: string;
  };
}
```

---

## Use Cases

### Use Case 1: Damage Claim with IPFS Proof

**Scenario:** Farmer experiences drought, files claim.

**Flow:**
1. Damage assessment triggered (manual or automated)
2. Weather data collected from WeatherXM (14 days of observations)
3. Satellite imagery analyzed via Spexi (NDVI values)
4. Damage index calculated: `damageIndex = (0.8 × 0.6) + (0.6 × 0.4) = 0.72`
5. **IPFS Upload:** Comprehensive proof document uploaded to Pinata
6. **CID Returned:** `QmXYZ123abc...`
7. **Database Storage:** CID stored in `DamageAssessment.proofHash`
8. **Response:** Farmer receives claim confirmation with gateway URL
9. **Verification:** Anyone can verify claim by accessing IPFS URL

**Result:** Transparent, auditable, blockchain-ready claim proof.

### Use Case 2: Policy Transparency

**Scenario:** Farmer wants to verify policy terms.

**Flow:**
1. Policy created with terms and conditions
2. Policy document uploaded to IPFS
3. CID stored in `Policy.documentHash`
4. Farmer can access policy via gateway URL
5. Terms are immutable and publicly verifiable

**Benefits:**
- No disputes about policy terms
- Farmer can show policy to third parties
- Regulators can audit policies

### Use Case 3: Blockchain Verification

**Scenario:** Smart contract needs to verify claim before payout.

**Flow:**
1. Claim submitted with damage index 0.75
2. IPFS proof uploaded, CID returned
3. **Smart Contract Called:**
   ```solidity
   function processClaim(
     bytes32 claimId,
     string memory ipfsCID,
     uint256 damageIndex
   ) external {
     // Store CID on-chain
     claims[claimId].proofCID = ipfsCID;
     
     // Anyone can verify by retrieving IPFS content
     // and checking damage calculation
   }
   ```
4. On-chain record links to off-chain proof
5. Independent auditors can verify calculations

**Benefits:**
- Transparent claim processing
- Reduced on-chain storage costs
- Immutable proof of damage assessment

### Use Case 4: Regulatory Compliance

**Scenario:** Insurance regulator audits claim payouts.

**Flow:**
1. Regulator requests proof for specific claims
2. Backend provides list of IPFS CIDs
3. Regulator retrieves proof documents via gateway
4. Verifies:
   - Weather data is legitimate (WeatherXM)
   - Vegetation data is accurate (Spexi)
   - Damage calculations are correct
   - Payout amounts match damage index

**Benefits:**
- Complete audit trail
- No data manipulation possible
- Automated compliance reporting

---

## Security & Privacy

### Data Privacy

**Public vs Private Data:**

| Data Type | Visibility | Rationale |
|-----------|-----------|-----------|
| Damage Proofs | Public | Transparency for blockchain verification |
| Policy Documents | Public | Terms should be open and auditable |
| Weather Snapshots | Public | Weather data is not personally identifiable |
| Satellite Imagery | Public | Plot locations may be sensitive, URLs only |

**Sensitive Data Handling:**
- Farmer names: NOT stored on IPFS, only UUIDs
- Phone numbers: NOT stored on IPFS
- Bank details: NEVER uploaded to IPFS
- Plot exact coordinates: Stored in database, not IPFS

### Access Control

**Pinata Gateway:**
- Default: Public gateway (anyone can access with CID)
- Optional: Private gateways with access tokens
- Current Setup: Public gateway for transparency

**CID Privacy:**
- CIDs are content-addressed (deterministic)
- Without CID, content is effectively private
- Only share CIDs with authorized parties

### Data Integrity

**Immutability:**
- Once uploaded, content cannot be changed
- Any modification creates new CID
- Original CID always points to original content

**Verification:**
```javascript
// Verify proof hasn't been tampered with
const storedProof = await ipfsService.getData(cid);
const isValid = await ipfsService.verifyProofHash(cid, expectedData);

if (!isValid) {
  throw new Error('Proof verification failed - data mismatch');
}
```

### Key Rotation

**JWT Token Expiry:**
- Current token expires: 2026
- Before expiry: Generate new token from Pinata dashboard
- Update `PINATA_JWT` in `.env`
- Restart services

**Old CIDs:**
- Old CIDs remain accessible even after JWT rotation
- Pinata maintains historical data
- No action needed for existing proofs

---

## Error Handling

### Graceful Degradation

IPFS uploads are **non-blocking** - if IPFS fails, claims still process:

```javascript
try {
  const ipfsResult = await ipfsService.uploadDamageProof(proofData);
  proofHash = ipfsResult.cid;
} catch (ipfsError) {
  logger.error('IPFS upload failed (non-blocking):', ipfsError);
  proofHash = 'IPFS_UPLOAD_FAILED';
  // Claim processing continues
}
```

### Error Types

| Error | Cause | Handling |
|-------|-------|----------|
| `PINATA_JWT not configured` | Missing JWT in .env | Initialization fails, service unavailable |
| `Connection test failed` | Network issue / Invalid JWT | Retry with exponential backoff |
| `Upload failed` | File too large / Network timeout | Log error, mark as 'IPFS_UPLOAD_FAILED' |
| `Retrieval failed` | Invalid CID / Content deleted | Return 404, log warning |

### Retry Logic

```javascript
async function uploadWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ipfsService.uploadJSON(data);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      logger.warn(`IPFS upload retry ${i + 1}/${maxRetries}`, { error: error.message });
    }
  }
}
```

### Monitoring

**Log Events:**
- `IPFS Service initialized successfully`
- `JSON uploaded to IPFS successfully` (with CID, size)
- `Damage proof uploaded to IPFS` (with claim ID, CID)
- `Failed to upload proof to IPFS` (with error details)

**Metrics to Track:**
- Upload success rate
- Average upload time
- Failed uploads by error type
- Retrieval latency

---

## Testing

### Manual Testing

#### 1. Test Connection

```javascript
const ipfsService = require('./services/ipfs.service');

(async () => {
  await ipfsService.initialize();
  
  const status = ipfsService.getStatus();
  console.log('IPFS Service Status:', status);
  
  // Test upload
  const result = await ipfsService.uploadJSON(
    { test: true, timestamp: new Date() },
    { name: 'connection-test.json' }
  );
  
  console.log('Upload Result:', result);
  console.log('Gateway URL:', result.gatewayUrl);
  
  // Test retrieval
  const data = await ipfsService.getData(result.cid);
  console.log('Retrieved Data:', data);
})();
```

#### 2. Test Damage Proof Upload

```bash
# Create test claim
curl -X POST http://localhost:3000/api/claims/process \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "existing-policy-uuid",
    "weatherStressIndex": 0.75,
    "vegetationIndex": 0.65,
    "weatherData": {
      "stationId": "TEST-STATION",
      "observations": [{"temp": 35, "rain": 0}],
      "period": {"start": "2025-01-01", "end": "2025-01-15"},
      "metrics": {"rainfall": 10, "temperature": 35}
    }
  }'

# Response includes:
# {
#   "blockchain": {
#     "proofVerifiable": true,
#     "proofCID": "QmXYZ123...",
#     "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmXYZ123...",
#     "ipfsUrl": "ipfs://QmXYZ123..."
#   }
# }
```

#### 3. Verify Proof

```bash
# Access via gateway (replace CID)
curl https://gateway.pinata.cloud/ipfs/QmXYZ123...

# Should return complete proof document
```

### Automated Tests

**File:** `backend/tests/ipfs.service.test.js`

```javascript
const ipfsService = require('../src/services/ipfs.service');

describe('IPFS Service', () => {
  beforeAll(async () => {
    await ipfsService.initialize();
  });

  test('should upload JSON and return CID', async () => {
    const data = { test: true, value: 123 };
    const result = await ipfsService.uploadJSON(data);
    
    expect(result.cid).toBeDefined();
    expect(result.gatewayUrl).toContain('gateway.pinata.cloud');
  });

  test('should upload damage proof', async () => {
    const proofData = {
      claimId: 'TEST-CLAIM',
      plotId: 'test-plot',
      farmerId: 'test-farmer',
      damageIndex: 0.65,
      weatherData: { stationId: 'TEST', observations: [] },
      vegetationData: null,
      calculationDetails: {
        weatherStress: 0.7,
        vegetationStress: 0.6,
        components: { weatherWeight: 0.6, vegetationWeight: 0.4 }
      },
      assessmentTimestamp: new Date().toISOString()
    };

    const result = await ipfsService.uploadDamageProof(proofData);
    
    expect(result.cid).toBeDefined();
    expect(result.ipfsUrl).toContain('ipfs://');
  });

  test('should retrieve uploaded data', async () => {
    const data = { retrievalTest: true };
    const uploadResult = await ipfsService.uploadJSON(data);
    
    const retrievedData = await ipfsService.getData(uploadResult.cid);
    
    expect(retrievedData).toEqual(data);
  });
});
```

### Integration Tests

Test full claim flow with IPFS:

```javascript
test('should process claim with IPFS proof', async () => {
  // Create test policy
  const policy = await createTestPolicy();
  
  // Process claim
  const response = await request(app)
    .post('/api/claims/process')
    .send({
      policyId: policy.id,
      weatherStressIndex: 0.75,
      vegetationIndex: 0.65
    });
  
  expect(response.status).toBe(201);
  expect(response.body.blockchain.proofCID).toBeDefined();
  
  // Verify proof is accessible
  const proofUrl = response.body.blockchain.gatewayUrl;
  const proofData = await fetch(proofUrl).then(r => r.json());
  
  expect(proofData.type).toBe('damage-assessment');
  expect(proofData.assessment.damageIndex).toBeCloseTo(0.71, 2);
});
```

---

## Blockchain Integration

### Smart Contract Interface

**Claim Verification Contract:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MicroCropInsurance {
    struct Claim {
        bytes32 id;
        address farmer;
        string ipfsCID;           // IPFS proof CID
        uint256 damageIndex;      // Scaled to 10000 (100% = 10000)
        uint256 payoutAmount;
        bool verified;
        bool paid;
    }
    
    mapping(bytes32 => Claim) public claims;
    
    event ClaimSubmitted(
        bytes32 indexed claimId,
        address indexed farmer,
        string ipfsCID,
        uint256 damageIndex
    );
    
    event ClaimVerified(bytes32 indexed claimId, bool approved);
    event PayoutProcessed(bytes32 indexed claimId, uint256 amount);
    
    /**
     * Submit claim with IPFS proof
     * @param claimId Unique claim identifier
     * @param ipfsCID IPFS CID containing proof document
     * @param damageIndex Damage index (scaled to 10000)
     */
    function submitClaim(
        bytes32 claimId,
        string memory ipfsCID,
        uint256 damageIndex
    ) external {
        require(damageIndex >= 3000, "Damage below threshold (30%)");
        require(damageIndex <= 10000, "Invalid damage index");
        
        claims[claimId] = Claim({
            id: claimId,
            farmer: msg.sender,
            ipfsCID: ipfsCID,
            damageIndex: damageIndex,
            payoutAmount: 0,
            verified: false,
            paid: false
        });
        
        emit ClaimSubmitted(claimId, msg.sender, ipfsCID, damageIndex);
    }
    
    /**
     * Verify claim (Oracle or Admin)
     * Oracle retrieves IPFS proof, validates calculations
     */
    function verifyClaim(bytes32 claimId, uint256 payoutAmount) external onlyOracle {
        Claim storage claim = claims[claimId];
        require(claim.id == claimId, "Claim not found");
        require(!claim.verified, "Claim already verified");
        
        // Oracle has verified IPFS proof off-chain
        claim.verified = true;
        claim.payoutAmount = payoutAmount;
        
        emit ClaimVerified(claimId, true);
    }
    
    /**
     * Process payout (after verification)
     */
    function processPayout(bytes32 claimId) external onlyAdmin {
        Claim storage claim = claims[claimId];
        require(claim.verified, "Claim not verified");
        require(!claim.paid, "Claim already paid");
        
        // Transfer USDC to farmer
        USDC.transfer(claim.farmer, claim.payoutAmount);
        
        claim.paid = true;
        
        emit PayoutProcessed(claimId, claim.payoutAmount);
    }
    
    /**
     * Get claim details including IPFS CID
     */
    function getClaim(bytes32 claimId) external view returns (Claim memory) {
        return claims[claimId];
    }
}
```

### Backend → Blockchain Flow

```javascript
// After IPFS upload and claim approval
const submitClaimToBlockchain = async (claimId, ipfsCID, damageIndex) => {
  const web3 = new Web3(process.env.BASE_RPC_URL);
  const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
  
  // Convert damage index to scaled integer (0.75 → 7500)
  const scaledDamage = Math.floor(damageIndex * 10000);
  
  // Submit to blockchain
  const tx = await contract.methods.submitClaim(
    web3.utils.sha3(claimId),
    ipfsCID,
    scaledDamage
  ).send({
    from: ADMIN_ADDRESS,
    gas: 200000
  });
  
  logger.info('Claim submitted to blockchain', {
    claimId,
    txHash: tx.transactionHash,
    ipfsCID
  });
  
  return tx.transactionHash;
};
```

### Oracle for Verification

**Off-chain Oracle:**

```javascript
// Oracle listens for ClaimSubmitted events
contract.events.ClaimSubmitted()
  .on('data', async (event) => {
    const { claimId, ipfsCID, damageIndex } = event.returnValues;
    
    // Retrieve IPFS proof
    const proof = await ipfsService.getData(ipfsCID);
    
    // Validate calculations
    const calculatedDamage = 
      (proof.assessment.weatherStress * 0.6) +
      (proof.assessment.vegetationStress * 0.4);
    
    const onChainDamage = damageIndex / 10000;
    
    if (Math.abs(calculatedDamage - onChainDamage) < 0.01) {
      // Valid - calculate payout
      const payoutAmount = calculatePayout(
        proof.policy.sumInsured,
        calculatedDamage
      );
      
      // Verify claim on-chain
      await contract.methods.verifyClaim(claimId, payoutAmount).send({
        from: ORACLE_ADDRESS,
        gas: 150000
      });
      
      logger.info('Claim verified by oracle', { claimId, payoutAmount });
    } else {
      logger.error('Claim verification failed - calculation mismatch', {
        claimId,
        expected: calculatedDamage,
        actual: onChainDamage
      });
    }
  });
```

---

## Best Practices

### 1. Always Initialize

```javascript
// On server startup
const initializeServices = async () => {
  await ipfsService.initialize();
  logger.info('IPFS service ready');
};
```

### 2. Handle Upload Failures Gracefully

```javascript
// Don't block claim processing
try {
  const ipfsResult = await ipfsService.uploadDamageProof(proofData);
  proofHash = ipfsResult.cid;
} catch (error) {
  logger.error('IPFS upload failed:', error);
  proofHash = 'IPFS_UPLOAD_FAILED';
  // Continue with claim processing
}
```

### 3. Store CIDs in Database

```javascript
// Always store CID for future reference
await prisma.damageAssessment.create({
  data: {
    policyId,
    damageIndex,
    proofHash: ipfsResult.cid  // ← Critical
  }
});
```

### 4. Provide Gateway URLs

```javascript
// Make proofs easily accessible
res.json({
  proofHash: cid,
  gatewayUrl: ipfsService.getGatewayUrl(cid),
  ipfsUrl: `ipfs://${cid}`
});
```

### 5. Document Proof Structure

Always include metadata in uploaded documents:

```javascript
{
  version: '1.0',
  type: 'damage-assessment',
  metadata: {
    system: 'MicroCrop Insurance Platform',
    ipfsUploadTimestamp: new Date().toISOString()
  }
}
```

### 6. Monitor IPFS Health

```javascript
// Periodic health check
setInterval(async () => {
  try {
    await ipfsService.testConnection();
    logger.info('IPFS health check: OK');
  } catch (error) {
    logger.error('IPFS health check failed:', error);
    // Alert admin
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

---

## Troubleshooting

### Issue: "PINATA_JWT not configured"

**Cause:** Missing JWT in `.env`

**Solution:**
1. Check `.env` file exists in backend directory
2. Verify `PINATA_JWT=eyJhbGc...` is present
3. Restart server

### Issue: "Connection test failed"

**Cause:** Invalid JWT or network issue

**Solution:**
1. Verify JWT is not expired (check Pinata dashboard)
2. Test network connectivity: `ping gateway.pinata.cloud`
3. Check firewall rules
4. Regenerate JWT if expired

### Issue: "Upload failed - File too large"

**Cause:** Pinata has size limits (depends on plan)

**Solution:**
1. Check file size before upload
2. Compress large files
3. Split data into multiple uploads if needed
4. Upgrade Pinata plan if necessary

### Issue: "CID not found" when retrieving

**Cause:** 
- Invalid CID
- Content unpinned
- Network propagation delay

**Solution:**
1. Verify CID format (should start with Qm or bafy)
2. Wait 30-60 seconds for network propagation
3. Check Pinata dashboard for pin status
4. Retry retrieval

### Issue: Slow upload times

**Cause:** Large files or network latency

**Solution:**
1. Use regional gateway closer to users
2. Implement retry with exponential backoff
3. Upload during off-peak hours
4. Consider using Pinata's dedicated gateway (paid feature)

---

## Future Enhancements

### 1. Private Gateways

Restrict access to sensitive proofs:

```javascript
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: 'private-gateway.mypinata.cloud' // Dedicated gateway
});
```

### 2. Content Moderation

Scan uploads before IPFS:

```javascript
const validateContent = (proofData) => {
  // Check for PII
  if (proofData.farmer && proofData.farmer.phoneNumber) {
    throw new Error('PII detected - remove personal data');
  }
  
  // Validate structure
  if (!proofData.assessment || !proofData.evidence) {
    throw new Error('Invalid proof structure');
  }
};
```

### 3. Batch Uploads

Upload multiple proofs efficiently:

```javascript
const uploadBatch = async (proofs) => {
  const results = await Promise.all(
    proofs.map(proof => ipfsService.uploadDamageProof(proof))
  );
  
  return results.map(r => r.cid);
};
```

### 4. IPFS Analytics

Track usage patterns:

```javascript
const analytics = {
  totalUploads: 0,
  totalSize: 0,
  averageUploadTime: 0,
  
  recordUpload: (size, duration) => {
    analytics.totalUploads++;
    analytics.totalSize += size;
    analytics.averageUploadTime = 
      (analytics.averageUploadTime * (analytics.totalUploads - 1) + duration) /
      analytics.totalUploads;
  }
};
```

### 5. Decentralized Retrieval

Use multiple gateways for redundancy:

```javascript
const gateways = [
  'gateway.pinata.cloud',
  'ipfs.io',
  'cloudflare-ipfs.com'
];

const retrieveWithFallback = async (cid) => {
  for (const gateway of gateways) {
    try {
      const url = `https://${gateway}/ipfs/${cid}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      logger.warn(`Gateway ${gateway} failed, trying next...`);
    }
  }
  
  throw new Error('All gateways failed');
};
```

---

## Summary

### Key Takeaways

✅ **Decentralized Storage:** IPFS provides immutable, distributed storage for critical insurance data

✅ **Blockchain-Ready:** IPFS CIDs enable on-chain verification without storing large data on blockchain

✅ **Transparent Claims:** Anyone can verify claim proofs independently via IPFS gateway

✅ **Cost-Effective:** Store unlimited data off-chain, only CIDs on-chain

✅ **Audit Trail:** Complete history of damage assessments, policy terms, weather triggers

### Integration Status

| Component | Status | IPFS Integration |
|-----------|--------|------------------|
| Damage Assessment | ✅ Complete | Automatic proof upload |
| Policy Documents | 🚧 Planned | Upload on policy creation |
| Weather Triggers | 🚧 Planned | Snapshot upload on trigger |
| Satellite Imagery | 🚧 Planned | Analysis results storage |
| Smart Contracts | 🚧 Planned | CID storage and verification |

### Next Steps

1. **Test IPFS Integration:**
   ```bash
   npm test -- ipfs.service.test.js
   ```

2. **Process Test Claim:**
   - Create test policy
   - Submit claim with weather/vegetation data
   - Verify IPFS proof uploaded
   - Check gateway URL accessibility

3. **Implement Policy Document Upload:**
   - Add IPFS upload to `createPolicy()` controller
   - Store CID in `Policy.documentHash`

4. **Deploy Smart Contracts:**
   - Implement claim submission with IPFS CID
   - Build oracle for proof verification
   - Test end-to-end blockchain flow

5. **Monitor & Optimize:**
   - Track upload success rate
   - Monitor gateway latency
   - Optimize proof document size

---

**Documentation Version:** 1.0  
**Last Updated:** 2025-01-15  
**Contact:** MicroCrop Insurance Platform Team  
**IPFS Provider:** Pinata Cloud  
**Gateway:** https://gateway.pinata.cloud
