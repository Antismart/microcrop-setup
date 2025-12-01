# MicroCrop CRE Architecture

**Date**: November 30, 2025  
**Blockchain**: Base Mainnet  
**Runtime**: Chainlink Runtime Environment (CRE)  
**Language**: TypeScript

---

## 🎯 System Overview

MicroCrop uses **Chainlink Runtime Environment (CRE)** to automate crop insurance damage assessment by:

1. **Monitoring active policies** on a daily schedule
2. **Fetching real-time data** from WeatherXM (weather) and Planet Labs (satellite NDVI)
3. **Computing damage** using the 60% weather + 40% satellite formula
4. **Submitting signed reports** on-chain when damage is detected
5. **Triggering automatic payouts** through the Treasury

---

## 🏗️ Architecture Components

### **1. CRE Workflow** (`cre-workflow/`)
**File**: `damage-assessment-workflow/main.ts`

**Triggers**:
- **Primary**: Cron (runs daily at 00:00 UTC to check all active policies)
- **Fallback**: HTTP endpoint (for manual triggers if automation fails)

**Data Sources**:
- **WeatherXM API**: Rainfall, temperature, dry days, flood days
- **Planet Labs API**: NDVI values, vegetation health indices

**Computation**:
- Runs `DamageLib` calculation logic off-chain
- Formula: `Total Damage = (Weather Score × 0.60) + (Satellite Score × 0.40)`
- Only submits reports when damage > 10% (1000 basis points)

**Output**:
- Generates cryptographically signed report with:
  - `policyId`
  - `damagePercentage` (0-10000 bps)
  - `weatherDamage` (0-10000 bps)
  - `satelliteDamage` (0-10000 bps)
  - `payoutAmount` (USDC, 6 decimals)
  - `assessedAt` (timestamp)

---

### **2. Smart Contracts** (`Contracts/src/`)

#### **A. PayoutReceiver.sol** (NEW)
**Purpose**: Consumer contract that receives CRE damage reports

**Key Features**:
- Implements `IReceiver` interface (required by CRE)
- Validates reports come from authorized CRE workflow
- Validates workflow owner is the MicroCrop admin
- Prevents duplicate payouts for the same policy
- Calls `Treasury.requestPayout()` for approved payouts

**Security**:
- Uses `IReceiverTemplate` from CRE for built-in validation
- Checks `forwarderAddress` (KeystoneForwarder on Base)
- Checks `expectedWorkflowId` (your deployed workflow ID)
- Checks `expectedAuthor` (your wallet address)

**Events**:
```solidity
event DamageReportReceived(
    uint256 indexed policyId,
    uint256 damagePercentage,
    uint256 payoutAmount,
    uint256 timestamp
);
event PayoutInitiated(uint256 indexed policyId, uint256 amount);
```

---

#### **B. PolicyManager.sol** (UPDATED)
**Changes**:
- Add `getActivePolicies()` view function (for CRE to read)
- Add `getPolicyDetails(uint256 policyId)` view function
- Emit `PolicyActivated(uint256 policyId, address farmer, uint256 coverage)` event

**Why**: CRE workflow needs to query which policies to assess

---

#### **C. Treasury.sol** (UPDATED)
**Changes**:
- Add `requestPayoutFromOracle(uint256 policyId, uint256 amount)` function
- Only callable by `PayoutReceiver` contract
- Transfers USDC directly to farmer
- Emits `PayoutProcessed(uint256 policyId, address farmer, uint256 amount)`

**Why**: Bypass the old `PayoutEngine` and let CRE trigger payouts directly

---

### **3. Deprecated Contracts** (Remove from deployment)

These contracts are **no longer needed** with CRE:

- ❌ **WeatherOracle.sol** - CRE fetches weather data off-chain
- ❌ **SatelliteOracle.sol** - CRE fetches satellite data off-chain
- ❌ **DamageCalculator.sol** - CRE runs damage calculation off-chain
- ❌ **PayoutEngine.sol** - CRE triggers payouts via `PayoutReceiver.sol`

**Keep**:
- ✅ **PolicyManager.sol** - Still needed for policy state
- ✅ **LiquidityPool.sol** - Still needed for capital management
- ✅ **Treasury.sol** - Still needed for fund management

---

## 📊 Data Flow

### **Daily Damage Assessment (Automatic)**

```
┌─────────────────────────────────────────────────────────────┐
│  1. CRON TRIGGER (Every day at 00:00 UTC)                  │
└─────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  2. CRE Workflow Execution (on Chainlink DON)              │
│     - Read active policies from PolicyManager.sol          │
│     - For each policy with coverage period ending soon:    │
└─────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Fetch Weather Data (WeatherXM API)                     │
│     - Query weather station near farm GPS coordinates      │
│     - Get: totalRainfall, avgTemp, dryDays, floodDays     │
│     - Multiple DON nodes fetch independently               │
│     - Consensus aggregation (median)                       │
└─────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Fetch Satellite Data (Planet Labs API)                 │
│     - Query NDVI for farm plot coordinates                 │
│     - Get: avgNDVI, minNDVI, ndviTrend, baselineNDVI      │
│     - Multiple DON nodes fetch independently               │
│     - Consensus aggregation (median)                       │
└─────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Calculate Damage (Off-Chain in CRE)                    │
│     - Run DamageLib logic (60% weather + 40% satellite)   │
│     - Calculate payout amount based on coverage           │
│     - If damage < 10%, skip (no payout needed)            │
└─────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Generate Signed Report                                  │
│     - ABI-encode: (policyId, damagePercentage, etc.)      │
│     - Sign with CRE DON private keys                       │
│     - Generate cryptographic proof                         │
└─────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Submit to Base Blockchain                               │
│     - EVM Write Capability calls KeystoneForwarder         │
│     - Forwarder validates signatures                       │
│     - Forwarder calls PayoutReceiver.onReport()            │
└─────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  8. PayoutReceiver.sol Processing                           │
│     - Validate report came from authorized workflow        │
│     - Check policy hasn't been paid already                │
│     - Call Treasury.requestPayoutFromOracle()              │
│     - Emit DamageReportReceived & PayoutInitiated events   │
└─────────────────────────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Treasury.sol Payout                                     │
│     - Transfer USDC from Treasury to farmer                │
│     - Unlock capital from LiquidityPool                    │
│     - Emit PayoutProcessed event                           │
└─────────────────────────────────────────────────────────────┘
```

---

### **Manual Trigger (Fallback)**

```
Farmer/Admin calls HTTP endpoint
         ▼
CRE HTTP Trigger receives authenticated request
         ▼
Same flow as steps 2-9 above
```

---

## 🔐 Privacy & Security

### **Privacy-Preserving Features**

1. **GPS Coordinates**: Never stored on-chain
   - CRE workflow accesses them from encrypted secrets
   - WeatherXM/Planet Labs APIs called off-chain
   - Only the final damage percentage goes on-chain

2. **Weather Data**: Never stored on-chain
   - Raw rainfall, temperature data stays off-chain
   - Only aggregated damage score submitted

3. **Satellite Imagery**: Never stored on-chain
   - NDVI values processed off-chain
   - Only vegetation health score submitted

### **Security Measures**

1. **Cryptographic Signing**: All reports signed by CRE DON
2. **Workflow Authorization**: `PayoutReceiver` validates workflow ID and owner
3. **Forwarder Validation**: KeystoneForwarder checks DON signatures
4. **Duplicate Prevention**: Policy can only be paid once
5. **Access Control**: Only PayoutReceiver can trigger Treasury payouts

---

## 🗂️ File Structure

```
microcrop-setup/
├── Contracts/
│   └── src/
│       ├── core/
│       │   ├── PolicyManager.sol          (UPDATED)
│       │   ├── Treasury.sol               (UPDATED)
│       │   ├── LiquidityPool.sol          (UNCHANGED)
│       │   └── PayoutReceiver.sol         (NEW - CRE Consumer Contract)
│       ├── oracles/                       (DEPRECATED - Delete)
│       │   ├── WeatherOracle.sol
│       │   ├── SatelliteOracle.sol
│       │   └── DamageCalculator.sol
│       └── interfaces/
│           ├── IPayoutReceiver.sol        (NEW)
│           └── IReceiver.sol              (Import from CRE)
│
├── cre-workflow/                          (NEW - TypeScript CRE Project)
│   ├── damage-assessment-workflow/
│   │   ├── main.ts                        (Main workflow logic)
│   │   ├── config.staging.json            (Staging config - Base Sepolia)
│   │   └── config.production.json         (Production config - Base Mainnet)
│   ├── contracts/
│   │   └── abi/
│   │       ├── PolicyManager.ts           (ABI for reading policies)
│   │       └── PayoutReceiver.ts          (ABI for consumer contract)
│   ├── secrets.yaml                       (Secret names: WEATHERXM_API_KEY, etc.)
│   ├── workflow.yaml                      (Workflow configuration)
│   ├── project.yaml                       (RPC URLs, chain selectors)
│   ├── package.json
│   └── .env                               (Private key, API keys)
│
└── CRE_ARCHITECTURE.md                    (This file)
```

---

## 📡 API Integration Details

### **WeatherXM API**
**Endpoints**:
- `GET /api/v1/devices/{deviceId}/history`
- Query Parameters: `fromDate`, `toDate`

**Response Fields Needed**:
- `temperature` (°C)
- `precipitation` (mm)
- `humidity` (%)

**Secrets Required**:
- `WEATHERXM_API_KEY`

**CRE Implementation**:
```typescript
const weatherResponse = httpClient.sendRequest(nodeRuntime, {
  url: `https://api.weatherxm.com/api/v1/devices/${deviceId}/history`,
  method: "GET",
  headers: {
    "Authorization": `Bearer ${runtime.getSecret("WEATHERXM_API_KEY").result().value}`
  }
}).result()
```

---

### **Planet Labs API**
**Endpoints**:
- `POST /data/v1/stats` (NDVI time series)
- Query: Geometry (GeoJSON polygon of farm), Date range

**Response Fields Needed**:
- `mean` (average NDVI)
- `min` (minimum NDVI)
- `max` (maximum NDVI)

**Secrets Required**:
- `PLANET_API_KEY`

**CRE Implementation**:
```typescript
const ndviResponse = httpClient.sendRequest(nodeRuntime, {
  url: "https://api.planet.com/data/v1/stats",
  method: "POST",
  headers: {
    "Authorization": `Basic ${btoa(runtime.getSecret("PLANET_API_KEY").result().value + ":")}`
  },
  body: JSON.stringify({
    interval: "day",
    item_types: ["PSScene"],
    geometry: { type: "Point", coordinates: [longitude, latitude] }
  })
}).result()
```

---

## 🚀 Deployment Workflow

### **Phase 1: Simulation (Local Testing)**
1. Install CRE CLI: `brew install chainlink-cre` (macOS)
2. Create CRE account: Visit [cre.chain.link](https://cre.chain.link)
3. Initialize project: `cre init` (select TypeScript)
4. Configure `.env` with test API keys
5. Run simulation: `cre workflow simulate damage-assessment-workflow`
6. Verify output: Check logs for damage calculations

### **Phase 2: Contract Deployment (Base Sepolia)**
1. Deploy `PayoutReceiver.sol` to Base Sepolia
2. Configure `PayoutReceiver` with MockForwarder address
3. Update `PolicyManager.sol` with new `getActivePolicies()` function
4. Fund Treasury with test USDC

### **Phase 3: CRE Deployment (Request Early Access)**
1. Request Early Access: [cre.chain.link/request-access](https://cre.chain.link/request-access)
2. Link wallet: `cre account link-key`
3. Deploy workflow: `cre workflow deploy damage-assessment-workflow`
4. Activate workflow: `cre workflow activate <workflow-id>`
5. Configure `PayoutReceiver` with real workflow ID

### **Phase 4: Production (Base Mainnet)**
1. Deploy contracts to Base Mainnet
2. Configure `PayoutReceiver` with Base KeystoneForwarder address
3. Update workflow config to production RPC URLs
4. Deploy workflow to production
5. Monitor via [cre.chain.link/workflows](https://cre.chain.link/workflows)

---

## 📈 Cost Analysis

### **Gas Costs (Base Mainnet)**
- CRE report submission: ~150,000 gas (~$0.02 at 0.5 gwei)
- Treasury payout: ~65,000 gas (~$0.01 at 0.5 gwei)
- **Total per claim**: ~$0.03

### **CRE Costs**
- Cron trigger: Included in workflow execution
- HTTP capability: ~0.1 LINK per API call
- EVM write: ~0.5 LINK per report submission
- **Total per daily check (100 policies)**: ~60 LINK (~$900/day)

**Note**: This is significantly cheaper than running custom oracle nodes 24/7.

---

## 🔄 Migration Path

### **What Stays**
- ✅ `PolicyManager.sol` (add read functions)
- ✅ `LiquidityPool.sol` (unchanged)
- ✅ `Treasury.sol` (add oracle payout function)

### **What Gets Replaced**
- 🔄 `WeatherOracle.sol` → CRE HTTP capability
- 🔄 `SatelliteOracle.sol` → CRE HTTP capability
- 🔄 `DamageCalculator.sol` → CRE off-chain computation
- 🔄 `PayoutEngine.sol` → `PayoutReceiver.sol` (CRE consumer)

### **What's New**
- ✨ `PayoutReceiver.sol` (CRE consumer contract)
- ✨ `cre-workflow/` (TypeScript workflow)
- ✨ Automatic damage detection (no manual claims)

---

## 📚 Resources

- **CRE Documentation**: [docs.chain.link/cre](https://docs.chain.link/cre)
- **Base Network Info**: [docs.base.org](https://docs.base.org)
- **WeatherXM API Docs**: [docs.weatherxm.com](https://docs.weatherxm.com)
- **Planet Labs API Docs**: [developers.planet.com](https://developers.planet.com)

---

**Status**: ✅ Architecture Complete - Ready for Implementation  
**Next Step**: Create `PayoutReceiver.sol` and TypeScript workflow
