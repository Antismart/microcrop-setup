# MicroCrop Smart Contracts - Implementation Plan

## 📋 Project Overview

Smart contracts for **MicroCrop** parametric crop insurance platform on **Base (Ethereum L2)** using **Foundry**.

### Technology Stack
- **Solidity**: 0.8.20+
- **Framework**: Foundry
- **Network**: Base (Sepolia testnet, then mainnet)
- **Token**: USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on Base)
- **Libraries**: OpenZeppelin, Chainlink-compatible oracles

---

## 🏗️ Project Structure Created

```
Contracts/
├── src/
│   ├── core/              ✅ Created
│   ├── oracles/           ✅ Created
│   ├── interfaces/        ✅ Created
│   ├── libraries/         ✅ Created
│   └── Counter.sol        ⚠️  To be removed
├── script/                ✅ Exists
├── test/
│   ├── unit/              ✅ Created
│   └── integration/       ✅ Created
├── foundry.toml           ✅ Updated
└── .env.example           ⏳ To be created
```

---

## 📝 Contracts to Implement

### 1. Core Contracts (`src/core/`)

#### PolicyManager.sol
**Purpose**: Manage insurance policies lifecycle

**Key Features:**
- Policy creation with customizable thresholds
- Policy activation after premium payment
- Policy triggering based on damage assessment
- Support for multiple crop and coverage types

**Structs:**
- `Policy`: policyId, farmer, externalId, plotId, sumInsured, premium, startTime, endTime, cropType, coverageType, status, thresholds
- `ThresholdParams`: droughtThreshold, droughtDays, floodThreshold, floodHours, heatThreshold, heatDays

**Enums:**
- `CropType`: MAIZE, BEANS, WHEAT, SORGHUM, MILLET, RICE
- `CoverageType`: DROUGHT, FLOOD, MULTI_PERIL
- `PolicyStatus`: PENDING, ACTIVE, EXPIRED, TRIGGERED, PAID_OUT, CANCELLED

**Key Functions:**
- `createPolicy()` - Create new policy
- `activatePolicy()` - Activate after premium payment
- `triggerPolicy()` - Trigger based on damage index
- `cancelPolicy()` - Cancel pending policy
- `isPolicyActive()` - Check if policy is active
- `getPolicyPayout()` - Calculate payout amount

#### LiquidityPool.sol
**Purpose**: Manage USDC liquidity for backing policies

**Key Features:**
- LP staking/unstaking with shares
- Capital locking for active policies
- Premium accumulation
- Payout execution
- Rewards distribution

**Structs:**
- `Pool`: totalCapital, availableCapital, lockedCapital, totalPremiums, totalPayouts, minStake, acceptingStakes
- `LiquidityProvider`: stakedAmount, shares, rewardsClaimed, stakedAt, isActive

**Key Functions:**
- `stake()` - Stake USDC, receive shares
- `unstake()` - Burn shares, withdraw USDC
- `claimRewards()` - Claim premium rewards
- `lockCapitalForPolicy()` - Lock capital for policy
- `unlockCapital()` - Unlock capital after policy ends
- `addPremium()` - Add premium to pool
- `requestPayout()` - Process payout request

#### PayoutEngine.sol
**Purpose**: Handle automated payouts

**Key Features:**
- Payout request initiation
- Batch processing for gas efficiency
- Off-chain payout confirmation (M-Pesa integration)
- Emergency pause/resume
- Payout status tracking

**Struct:**
- `PayoutRequest`: policyId, beneficiary, amount, damageIndex, requestTime, status, offChainRef, proofHash

**Enum:**
- `PayoutStatus`: PENDING, PROCESSING, COMPLETED, FAILED, REJECTED

**Key Functions:**
- `initiatePayout()` - Start payout process
- `processPayout()` - Execute single payout
- `processBatchPayouts()` - Process multiple payouts
- `confirmOffChainPayout()` - Confirm M-Pesa transfer
- `rejectPayout()` - Reject invalid payout
- `pausePayouts()` / `resumePayouts()` - Emergency controls

#### Treasury.sol
**Purpose**: Manage funds, reserves, and treasury operations

**Key Features:**
- Premium collection
- Reserve management
- Payout approval
- Operating fee distribution
- Rebalancing logic

**Structs:**
- `ReserveRequirements`: minReserveRatio, targetReserveRatio, maxExposure
- `TreasuryStats`: totalPremiums, totalPayouts, totalReserves, totalCoverage, operatingExpenses, lastRebalance

**Key Functions:**
- `receivePremium()` - Record premium payment
- `requestPayout()` - Approve payout request
- `rebalanceReserves()` - Maintain healthy reserve ratio
- `distributeOperatingFees()` - Pay platform fees
- `calculateReserveRatio()` - Check solvency
- `getAvailableForPayouts()` - Available liquidity

---

### 2. Oracle Contracts (`src/oracles/`)

#### WeatherOracle.sol
**Purpose**: Verify and store weather data from WeatherXM

**Key Features:**
- Weather station registration
- Weather data submission with signatures
- Batch data submission
- Drought/flood index calculation
- Data integrity verification

**Structs:**
- `WeatherData`: stationId, timestamp, rainfall, temperature, humidity, windSpeed, dataHash, signature
- `WeatherStation`: stationId, latitude, longitude, isActive, lastUpdate

**Key Functions:**
- `submitWeatherData()` - Submit single data point
- `submitBatchWeatherData()` - Submit multiple data points
- `calculateDroughtIndex()` - Calculate drought severity
- `calculateFloodIndex()` - Calculate flood severity
- `verifyDataIntegrity()` - Verify oracle signature

#### SatelliteOracle.sol
**Purpose**: Verify and store satellite/NDVI data from Spexi

**Key Features:**
- Satellite data submission
- NDVI baseline tracking
- Vegetation stress index calculation
- IPFS hash storage for imagery

**Structs:**
- `SatelliteData`: plotId, captureDate, ndvi, evi, cloudCover, ipfsHash, dataHash, signature
- `VegetationBaseline`: plotId, seasonalNDVI, prePlantingNDVI, lastUpdate

**Key Functions:**
- `submitSatelliteData()` - Submit NDVI data
- `calculateVegetationStressIndex()` - Calculate vegetation stress
- `updateBaseline()` - Update seasonal baseline

#### DamageCalculator.sol
**Purpose**: Calculate damage index and payout percentage

**Key Features:**
- Combine weather and satellite data
- Weighted damage index calculation (60% weather, 40% satellite)
- Payout percentage determination
- Proof submission (IPFS)
- Assessment verification

**Struct:**
- `DamageAssessment`: policyId, weatherStressIndex, vegetationIndex, damageIndex, timestamp, proofHash, verified

**Constants:**
- `NO_PAYOUT_THRESHOLD`: 3000 (30%)
- `PARTIAL_PAYOUT_THRESHOLD`: 6000 (60%)

**Key Functions:**
- `calculateDamageIndex()` - Compute final damage index
- `getPayoutPercentage()` - Determine payout percentage
  - < 30% damage = 0% payout
  - 30-60% damage = 30-70% payout (linear)
  - > 60% damage = 100% payout
- `submitProof()` - Submit evidence hash
- `verifyAssessment()` - Verify assessment

---

### 3. Libraries (`src/libraries/`)

#### PolicyLib.sol
- `calculatePremium()` - Premium calculation logic
- `isEligibleForPayout()` - Payout eligibility check
- `calculateRiskScore()` - Risk scoring algorithm

#### DamageLib.sol
- `normalizeWeatherData()` - Normalize weather metrics
- `calculateNDVIDrop()` - Calculate NDVI decline
- `weightedAverage()` - Weighted average calculation

#### MathLib.sol
- `min()` / `max()` - Min/max functions
- `average()` - Array average
- `standardDeviation()` - Statistical calculation
- `percentageOf()` - Percentage calculation

---

### 4. Interfaces (`src/interfaces/`)

#### IPolicyManager.sol
- Policy management interface

#### ILiquidityPool.sol
- Liquidity pool interface

#### IOracle.sol
- Oracle data submission interface

#### IPayoutEngine.sol
- Payout execution interface

---

## 🔐 Security Features

1. **OpenZeppelin Integration**
   - AccessControl for role management
   - ReentrancyGuard for state-changing functions
   - Pausable for emergency stops

2. **Signature Verification**
   - Oracle data signatures
   - ECDSA recovery for data integrity

3. **Emergency Controls**
   - Pause/unpause functionality
   - Emergency withdrawal
   - Time locks for critical operations

4. **Gas Optimization**
   - Batch processing
   - Struct packing
   - `calldata` over `memory`
   - `unchecked` blocks for safe math

---

## 📊 Key Metrics & Thresholds

### Damage Assessment Formula
```
damageIndex = (weatherStressIndex * 0.6) + (vegetationIndex * 0.4)
```

### Payout Logic
```
if damageIndex < 30%: payout = 0%
if damageIndex 30-60%: payout = 30-70% (linear interpolation)
if damageIndex > 60%: payout = 100%
```

### Reserve Requirements
- Minimum Reserve Ratio: TBD
- Target Reserve Ratio: TBD  
- Max Exposure per Pool: TBD

---

## 🧪 Testing Strategy

### Unit Tests (test/unit/)
- PolicyManager.t.sol
- LiquidityPool.t.sol
- PayoutEngine.t.sol
- Treasury.t.sol
- WeatherOracle.t.sol
- SatelliteOracle.t.sol
- DamageCalculator.t.sol

### Integration Tests (test/integration/)
- FullFlow.t.sol (end-to-end)
- OracleIntegration.t.sol

### Fuzzing
- Damage calculation fuzzing
- Premium calculation fuzzing

### Target: >95% Coverage

---

## 🚀 Deployment Plan

### Phase 1: Testnet (Base Sepolia)
1. Deploy all contracts
2. Configure access control
3. Authorize oracle addresses
4. Initialize liquidity pool
5. Test with mock data

### Phase 2: Mainnet (Base)
1. Audit contracts
2. Deploy with multisig
3. Gradual liquidity addition
4. Monitor initial policies

---

## 📦 Dependencies

```bash
# Install OpenZeppelin
forge install OpenZeppelin/openzeppelin-contracts

# Install Chainlink (if needed)
forge install smartcontractkit/chainlink
```

---

## 🔧 Development Commands

```bash
# Build
forge build

# Test
forge test -vvv

# Gas report
forge test --gas-report

# Coverage
forge coverage

# Deploy to testnet
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

# Format
forge fmt
```

---

## ⏭️ Next Steps

1. ✅ Update foundry.toml
2. ✅ Create directory structure
3. ⏳ Install OpenZeppelin
4. ⏳ Implement core contracts
5. ⏳ Implement oracle contracts
6. ⏳ Implement libraries
7. ⏳ Write deployment scripts
8. ⏳ Write comprehensive tests
9. ⏳ Deploy to testnet
10. ⏳ Integrate with backend

---

**Status**: 🚧 **IN PROGRESS - Structure Created**

**Last Updated**: November 5, 2025
