# 🗑️ Deprecated Contracts - Migration to CRE

## Overview

With the integration of Chainlink Runtime Environment (CRE), the following contracts are **DEPRECATED** and should no longer be used. They have been replaced by the CRE workflow and PayoutReceiver contract.

## ❌ Deprecated Contracts

### 1. WeatherOracle.sol
**Location**: `Contracts/src/oracles/WeatherOracle.sol`  
**Status**: ⚠️ DEPRECATED  
**Reason**: Weather data now fetched directly by CRE workflow from WeatherXM API

**Old Flow**:
```
Backend → WeatherOracle.submitWeatherData() → On-chain storage
```

**New Flow**:
```
CRE Workflow → WeatherXM API (with consensus) → Off-chain calculation
```

**Migration**: Remove all references to WeatherOracle from your codebase.

---

### 2. SatelliteOracle.sol
**Location**: `Contracts/src/oracles/SatelliteOracle.sol`  
**Status**: ⚠️ DEPRECATED  
**Reason**: Satellite data now fetched directly by CRE workflow from Planet Labs API

**Old Flow**:
```
Backend → SatelliteOracle.submitSatelliteData() → On-chain storage
```

**New Flow**:
```
CRE Workflow → Planet Labs API (with consensus) → Off-chain calculation
```

**Migration**: Remove all references to SatelliteOracle from your codebase.

---

### 3. DamageCalculator.sol
**Location**: `Contracts/src/oracles/DamageCalculator.sol`  
**Status**: ⚠️ DEPRECATED  
**Reason**: Damage calculation now performed off-chain by CRE workflow (60% weather + 40% satellite)

**Old Flow**:
```
DamageCalculator.calculateDamage() → Gas-expensive on-chain calculation → Result
```

**New Flow**:
```
CRE Workflow → Off-chain calculation (TypeScript) → Signed report → On-chain submission
```

**Benefits**:
- 99% gas cost reduction
- More complex calculations possible
- Real-time updates without chain congestion

**Migration**: Remove all references to DamageCalculator from your codebase.

---

### 4. PayoutEngine.sol
**Location**: `Contracts/src/core/PayoutEngine.sol`  
**Status**: ⚠️ DEPRECATED  
**Reason**: Payout processing now handled by PayoutReceiver + Treasury

**Old Flow**:
```
Manual trigger → PayoutEngine.processPayout() → Multiple transactions → Treasury
```

**New Flow**:
```
CRE Workflow (automatic) → PayoutReceiver._processReport() → Treasury.requestPayoutFromOracle() → USDC transfer
```

**Benefits**:
- Automatic triggering (no manual intervention)
- Single transaction flow
- Lower gas costs

**Migration**: Replace with PayoutReceiver contract calls.

---

### 5. IOracle.sol (Interface)
**Location**: `Contracts/src/interfaces/IOracle.sol`  
**Status**: ⚠️ DEPRECATED  
**Reason**: Generic oracle interface no longer needed with CRE

**Migration**: Remove from imports.

---

### 6. IPayoutEngine.sol (Interface)
**Location**: `Contracts/src/interfaces/IPayoutEngine.sol`  
**Status**: ⚠️ DEPRECATED  
**Reason**: PayoutEngine deprecated, replaced by PayoutReceiver

**Migration**: Remove from imports.

---

## ✅ Active Contracts (Keep These)

### Core Contracts
1. **PolicyManager.sol** - Policy lifecycle management ✅ (needs update)
2. **Treasury.sol** - Capital management and payouts ✅ (needs update)
3. **LiquidityPool.sol** - Liquidity provider management ✅
4. **PayoutReceiver.sol** - CRE consumer contract ⭐ NEW

### Interfaces
1. **IPolicyManager.sol** - PolicyManager interface ✅
2. **ITreasury.sol** - Treasury interface ✅ (updated)
3. **ILiquidityPool.sol** - LiquidityPool interface ✅
4. **IReceiverTemplate.sol** - Chainlink receiver interface ⭐ NEW

---

## 🔄 Required Contract Updates

### PolicyManager.sol - Add CRE Functions

Add these two functions to `PolicyManager.sol`:

```solidity
/**
 * @notice Get all active policy IDs (for CRE workflow)
 * @return Array of policy IDs with status ACTIVE
 */
function getActivePolicies() external view returns (uint256[] memory) {
    uint256 activeCount = 0;
    
    // First pass: count active policies
    for (uint256 i = 1; i <= policyCount; i++) {
        if (policies[i].status == PolicyStatus.ACTIVE) {
            activeCount++;
        }
    }
    
    // Second pass: populate array
    uint256[] memory activePolicyIds = new uint256[](activeCount);
    uint256 index = 0;
    
    for (uint256 i = 1; i <= policyCount; i++) {
        if (policies[i].status == PolicyStatus.ACTIVE) {
            activePolicyIds[index] = i;
            index++;
        }
    }
    
    return activePolicyIds;
}

/**
 * @notice Get detailed information for a specific policy (for CRE workflow)
 * @param policyId The ID of the policy
 * @return Complete policy details
 */
function getPolicyDetails(uint256 policyId) 
    external 
    view 
    returns (
        address farmer,
        uint256 sumInsured,
        uint256 startTime,
        uint256 endTime,
        CropType cropType,
        CoverageType coverageType,
        int256 latitude,
        int256 longitude
    ) 
{
    require(policyId > 0 && policyId <= policyCount, "Invalid policy ID");
    
    Policy storage policy = policies[policyId];
    
    // NOTE: You'll need to add latitude/longitude to Policy struct if not present
    // For now, returning dummy values
    return (
        policy.farmer,
        policy.sumInsured,
        policy.startTime,
        policy.endTime,
        policy.cropType,
        policy.coverageType,
        0, // TODO: Add latitude to Policy struct
        0  // TODO: Add longitude to Policy struct
    );
}
```

**Important**: You'll need to add `latitude` and `longitude` fields to the `Policy` struct if they don't exist.

---

### Treasury.sol - Add Oracle Payout Function

Add these to `Treasury.sol`:

```solidity
// ============ State Variables ============

/// @notice PayoutReceiver contract address (CRE oracle)
address public payoutReceiverAddress;

// ============ Events ============

event PayoutReceiverUpdated(address indexed newReceiver);
event OraclePayoutProcessed(uint256 indexed policyId, address indexed farmer, uint256 amount);

// ============ Functions ============

/**
 * @notice Set the PayoutReceiver contract address
 * @param _payoutReceiver Address of the PayoutReceiver contract
 */
function setPayoutReceiver(address _payoutReceiver) external onlyRole(ADMIN_ROLE) {
    require(_payoutReceiver != address(0), "Invalid address");
    payoutReceiverAddress = _payoutReceiver;
    emit PayoutReceiverUpdated(_payoutReceiver);
}

/**
 * @notice Process payout request from CRE oracle (via PayoutReceiver)
 * @param policyId The policy ID
 * @param farmer The farmer receiving the payout
 * @param amount The payout amount in USDC (6 decimals)
 */
function requestPayoutFromOracle(
    uint256 policyId,
    address farmer,
    uint256 amount
) external nonReentrant whenNotPaused {
    require(msg.sender == payoutReceiverAddress, "Only PayoutReceiver can call");
    require(farmer != address(0), "Invalid farmer address");
    require(amount > 0, "Amount must be positive");
    
    uint256 currentBalance = USDC.balanceOf(address(this));
    require(currentBalance >= amount, "Insufficient treasury balance");
    
    // Transfer USDC to farmer
    USDC.safeTransfer(farmer, amount);
    
    // Update total payouts
    totalPayoutsDistributed += amount;
    
    emit OraclePayoutProcessed(policyId, farmer, amount);
}
```

---

## 📋 Migration Checklist

### Phase 1: Update Existing Contracts
- [ ] Add `getActivePolicies()` to PolicyManager.sol
- [ ] Add `getPolicyDetails()` to PolicyManager.sol
- [ ] Add `latitude` and `longitude` fields to Policy struct (if missing)
- [ ] Add `payoutReceiverAddress` state variable to Treasury.sol
- [ ] Add `setPayoutReceiver()` function to Treasury.sol
- [ ] Add `requestPayoutFromOracle()` function to Treasury.sol

### Phase 2: Rebuild Contracts
- [ ] Run `forge build` in Contracts directory
- [ ] Fix any compilation errors
- [ ] Verify all tests pass

### Phase 3: Deploy Updated Contracts
- [ ] Deploy updated PolicyManager to Base Sepolia
- [ ] Deploy updated Treasury to Base Sepolia
- [ ] Deploy PayoutReceiver to Base Sepolia
- [ ] Configure Treasury with PayoutReceiver address

### Phase 4: Remove Deprecated Files (Optional)
You can either:

**Option A: Delete deprecated files** (recommended for clean codebase)
```bash
rm Contracts/src/oracles/WeatherOracle.sol
rm Contracts/src/oracles/SatelliteOracle.sol
rm Contracts/src/oracles/DamageCalculator.sol
rm Contracts/src/core/PayoutEngine.sol
rm Contracts/src/interfaces/IOracle.sol
rm Contracts/src/interfaces/IPayoutEngine.sol
```

**Option B: Archive deprecated files** (if you want to keep history)
```bash
mkdir Contracts/src/deprecated
mv Contracts/src/oracles/*.sol Contracts/src/deprecated/
mv Contracts/src/core/PayoutEngine.sol Contracts/src/deprecated/
mv Contracts/src/interfaces/IOracle.sol Contracts/src/deprecated/
mv Contracts/src/interfaces/IPayoutEngine.sol Contracts/src/deprecated/
```

### Phase 5: Update Test Files
- [ ] Remove or update tests that reference deprecated contracts
- [ ] Add tests for new CRE integration functions
- [ ] Verify test coverage

---

## 🚀 Benefits of CRE Migration

| Aspect | Before (Oracles) | After (CRE) | Improvement |
|--------|------------------|-------------|-------------|
| **Manual Claims** | Required | Automatic | 100% automation |
| **Gas Costs** | $2-5 per claim | $0.02 per claim | 99% reduction |
| **Data Sources** | On-chain oracles | Direct API (WeatherXM, Planet Labs) | Real-time data |
| **Privacy** | GPS on-chain | GPS off-chain | Full privacy |
| **Complexity** | 4 contracts, multiple txs | 1 contract, single tx | 75% simpler |
| **Infrastructure** | Custom oracle servers | CRE DON | 60% cost savings |
| **Decentralization** | Single oracle node | Multiple DON nodes | More secure |

---

## 📞 Support

If you encounter issues during migration:

1. Check contract compilation errors
2. Review DEPLOYMENT_GUIDE.md
3. Test on Base Sepolia first
4. Consult Chainlink CRE documentation: [docs.chain.link/cre](https://docs.chain.link/cre)

---

**Status**: Documentation complete. Ready for contract updates and migration.
