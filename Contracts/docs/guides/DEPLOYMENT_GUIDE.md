# MicroCrop Smart Contract Deployment Guide

## Overview

This guide covers deployment of the MicroCrop parametric crop insurance platform to Base L2 (mainnet and Sepolia testnet).

## Contract Architecture

### Core Contracts (5)
- **Treasury**: Reserve management, premium collection, payout execution
- **LiquidityPool**: ERC4626-style capital pool with locking mechanism
- **PolicyManager**: Full policy lifecycle management
- **PayoutEngine**: Multi-stage payout workflow
- **DamageCalculator**: Weighted damage assessment (60% weather + 40% satellite)

### Oracle Contracts (2)
- **WeatherOracle**: Multi-source weather data verification
- **SatelliteOracle**: NDVI satellite data with trend calculation

### Dependencies
- **Libraries**: MathLib, PolicyLib, DamageLib
- **Interfaces**: IPolicyManager, ILiquidityPool, IOracle, IPayoutEngine
- **OpenZeppelin**: AccessControl, ReentrancyGuard, Pausable, SafeERC20

## Prerequisites

### 1. Environment Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Clone repository
cd /Users/onchainchef/Desktop/microcrop-setup/Contracts

# Install dependencies
forge install

# Compile contracts
forge build
```

### 2. Environment Variables

Create `.env` file in project root:

```env
# Deployment
PRIVATE_KEY=your_deployer_private_key_here

# RPC Endpoints
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Etherscan API (for verification)
ETHERSCAN_API_KEY=your_basescan_api_key

# Testnet addresses (optional)
TEST_BACKEND_ADDRESS=0x...
TEST_ORACLE_ADDRESS=0x...
TEST_FARMER_ADDRESS=0x...
```

### 3. Gas Requirements

Estimated deployment gas costs on Base:
- **Treasury**: ~2.5M gas (~$0.50 @ 1 gwei)
- **LiquidityPool**: ~3.0M gas (~$0.60)
- **PolicyManager**: ~4.0M gas (~$0.80)
- **WeatherOracle**: ~3.5M gas (~$0.70)
- **SatelliteOracle**: ~3.5M gas (~$0.70)
- **DamageCalculator**: ~2.5M gas (~$0.50)
- **PayoutEngine**: ~3.5M gas (~$0.70)
- **Total**: ~22.5M gas (~$4.50)

## Deployment Procedures

### Option 1: Base Mainnet Deployment

```bash
# 1. Load environment
source .env

# 2. Dry run (simulation)
forge script script/Deploy.s.sol:Deploy \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY

# 3. Actual deployment
forge script script/Deploy.s.sol:Deploy \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast

# 4. Verify contracts on Basescan
forge script script/Deploy.s.sol:Deploy \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

**Mainnet Configuration:**
- USDC Address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Network: Base (Chain ID: 8453)
- Gas Price: ~1 gwei (typical)

### Option 2: Base Sepolia Testnet Deployment

```bash
# 1. Load environment
source .env

# 2. Get testnet USDC from faucet (if available)
# Or deploy mock USDC for testing

# 3. Deploy to testnet
forge script script/DeployTestnet.s.sol:DeployTestnet \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

**Testnet Configuration:**
- USDC Address: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Mock)
- Network: Base Sepolia (Chain ID: 84532)
- Lower rate cards (50% of mainnet)
- Single verification threshold

## Post-Deployment Configuration

### 1. Grant Backend Role

After deployment, grant BACKEND_ROLE to your backend server:

```solidity
// Using cast (Foundry CLI)
cast send <POLICY_MANAGER_ADDRESS> \
    "grantRole(bytes32,address)" \
    $(cast keccak "BACKEND_ROLE") \
    <BACKEND_ADDRESS> \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY
```

### 2. Configure Rate Cards (Mainnet Only)

Set production premium rates:

```solidity
// Example: MAIZE + DROUGHT = 5% base rate
cast send <POLICY_MANAGER_ADDRESS> \
    "setRateCard(uint8,uint8,uint256)" \
    0 0 500 \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY
```

**Recommended Mainnet Rates (basis points):**

| Crop Type | Drought | Flood | Heat Stress |
|-----------|---------|-------|-------------|
| MAIZE     | 500     | 400   | 300         |
| BEANS     | 600     | 500   | 400         |
| SORGHUM   | 400     | 300   | 200         |
| MILLET    | 350     | 250   | 200         |
| CASSAVA   | 300     | 400   | 250         |
| GROUNDNUTS| 550     | 450   | 350         |

### 3. Register Oracle Providers

**Weather Oracle:**
```solidity
// 1. Approve 1000 USDC
cast send <USDC_ADDRESS> \
    "approve(address,uint256)" \
    <WEATHER_ORACLE_ADDRESS> \
    1000000000 \
    --rpc-url $BASE_RPC_URL \
    --private-key $PROVIDER_KEY

// 2. Register provider
cast send <WEATHER_ORACLE_ADDRESS> \
    "registerProvider()" \
    --rpc-url $BASE_RPC_URL \
    --private-key $PROVIDER_KEY
```

**Satellite Oracle:**
```solidity
// 1. Approve 2000 USDC
cast send <USDC_ADDRESS> \
    "approve(address,uint256)" \
    <SATELLITE_ORACLE_ADDRESS> \
    2000000000 \
    --rpc-url $BASE_RPC_URL \
    --private-key $PROVIDER_KEY

// 2. Register provider
cast send <SATELLITE_ORACLE_ADDRESS> \
    "registerProvider()" \
    --rpc-url $BASE_RPC_URL \
    --private-key $PROVIDER_KEY
```

### 4. Fund Treasury Reserves

Initial reserve capital:

```solidity
// 1. Approve USDC to Treasury
cast send <USDC_ADDRESS> \
    "approve(address,uint256)" \
    <TREASURY_ADDRESS> \
    10000000000 \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY

// 2. Deposit reserves (example: 10,000 USDC)
cast send <TREASURY_ADDRESS> \
    "depositReserves(uint256)" \
    10000000000 \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY
```

### 5. Bootstrap Liquidity

Seed initial liquidity:

```solidity
// 1. Approve USDC to LiquidityPool
cast send <USDC_ADDRESS> \
    "approve(address,uint256)" \
    <LIQUIDITY_POOL_ADDRESS> \
    50000000000 \
    --rpc-url $BASE_RPC_URL \
    --private-key $LP_STAKER_KEY

// 2. Stake liquidity (example: 50,000 USDC)
cast send <LIQUIDITY_POOL_ADDRESS> \
    "stake(uint256)" \
    50000000000 \
    --rpc-url $BASE_RPC_URL \
    --private-key $LP_STAKER_KEY
```

## Testing Flow

### 1. Create Test Policy

```javascript
// Backend API call
const policyId = await policyManager.createPolicy({
    farmer: "0x...",
    externalId: "TEST-001",
    plotId: 1,
    sumInsured: 1000_000000, // 1000 USDC
    startTime: Math.floor(Date.now() / 1000),
    endTime: Math.floor(Date.now() / 1000) + 180 * 86400, // 180 days
    cropType: 0, // MAIZE
    coverageType: 0, // DROUGHT
    thresholds: {
        minRainfall: 30000, // 300mm
        maxRainfall: 80000,
        minTemperature: 1500,
        maxTemperature: 3500,
        maxDryDays: 14,
        maxFloodHours: 24,
        maxHeatStressDays: 7
    }
});
```

### 2. Activate Policy

```javascript
// Farmer approves premium
await usdc.approve(policyManager.address, premium);

// Activate policy
await policyManager.activatePolicy(policyId);
```

### 3. Submit Oracle Data

**Weather Data:**
```javascript
await weatherOracle.submitData(
    plotId,
    startTime,
    endTime,
    {
        totalRainfall: 25000, // 250mm (below 300mm threshold)
        avgTemperature: 2500,
        maxTemperature: 3200,
        dryDays: 20, // Above 14-day threshold
        floodDays: 0,
        heatStressDays: 3
    }
);
```

**Satellite Data:**
```javascript
await satelliteOracle.submitData(
    plotId,
    startTime,
    endTime,
    {
        avgNDVI: 4500, // 0.45 (low vegetation)
        minNDVI: 3500,
        ndviTrend: -2000, // -20% decline
        baselineNDVI: 7000
    }
);
```

### 4. Trigger Payout

```javascript
// Oracle or admin triggers policy
await policyManager.triggerPolicy(policyId);

// Payout workflow automatically initiates
// Backend monitors status via PayoutEngine events
```

### 5. Process Payout

```javascript
// 1. Calculate payout (automatic in trigger)
await payoutEngine.calculatePayout(payoutId);

// 2. Approve payout (APPROVER_ROLE)
await payoutEngine.approvePayout(payoutId);

// 3. Process payout (initiates off-chain payment)
await payoutEngine.processPayout(payoutId, "SWYPT-TX-123");

// 4. Confirm completion (after Swypt confirms)
await payoutEngine.confirmPayout(payoutId, "0x123abc...");
```

## Monitoring & Maintenance

### Health Checks

```bash
# Check contract balances
cast call <TREASURY_ADDRESS> "getReserves()" --rpc-url $BASE_RPC_URL
cast call <LIQUIDITY_POOL_ADDRESS> "totalAvailable()" --rpc-url $BASE_RPC_URL

# Check policy count
cast call <POLICY_MANAGER_ADDRESS> "totalPolicies()" --rpc-url $BASE_RPC_URL

# Check payout stats
cast call <PAYOUT_ENGINE_ADDRESS> "totalPayouts()" --rpc-url $BASE_RPC_URL
cast call <PAYOUT_ENGINE_ADDRESS> "totalAmountPaid()" --rpc-url $BASE_RPC_URL
```

### Emergency Procedures

**Pause All Operations:**
```bash
# Pause PolicyManager
cast send <POLICY_MANAGER_ADDRESS> "pause()" \
    --rpc-url $BASE_RPC_URL \
    --private-key $ADMIN_KEY

# Pause PayoutEngine
cast send <PAYOUT_ENGINE_ADDRESS> "pause()" \
    --rpc-url $BASE_RPC_URL \
    --private-key $ADMIN_KEY
```

**Unpause:**
```bash
cast send <POLICY_MANAGER_ADDRESS> "unpause()" \
    --rpc-url $BASE_RPC_URL \
    --private-key $ADMIN_KEY
```

## Upgrade Path

Current contracts are **not upgradeable** by design. To upgrade:

1. Deploy new contract versions
2. Pause old contracts
3. Migrate active policies (if possible)
4. Update backend to use new addresses
5. Communicate migration to users

**Recommended:** Design future versions with UUPS or Transparent Proxy pattern.

## Security Considerations

### 1. Access Control
- ✅ Admin keys in hardware wallet or multisig
- ✅ Backend keys rotated regularly
- ✅ Oracle provider keys secured
- ✅ Separate APPROVER_ROLE from PROCESSOR_ROLE

### 2. Rate Limits
- Max 5 active policies per farmer
- Max 3 claims per year per farmer
- Capital locking prevents over-commitment

### 3. Reserve Management
- Maintain 20-30% reserve ratio
- Monitor capital utilization
- Set alerts for low liquidity

### 4. Oracle Security
- Weather: Require 2+ confirmations
- Satellite: Single trusted source
- Slashing for bad data
- Reputation scoring

### 5. Audit Requirements
- **Critical**: Full security audit before mainnet
- **Recommended**: Continuous monitoring with Forta
- **Required**: Bug bounty program

## Gas Optimization

### Batch Operations
```solidity
// Expire multiple policies (admin)
uint256[] memory policyIds = [1, 2, 3, 4, 5];
policyManager.batchExpirePolicies(policyIds);

// Process multiple payouts
uint256[] memory payoutIds = [10, 11, 12];
payoutEngine.createBatch(payoutIds);
payoutEngine.processBatch(batchId);
```

### Off-Chain Signatures
Consider implementing EIP-712 signatures for policy creation to reduce gas costs for farmers.

## Contract Addresses

### Base Mainnet (Production)
After deployment, update these addresses:

```
Treasury:          0x...
LiquidityPool:     0x...
PolicyManager:     0x...
WeatherOracle:     0x...
SatelliteOracle:   0x...
DamageCalculator:  0x...
PayoutEngine:      0x...
USDC:              0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### Base Sepolia (Testnet)
```
Treasury:          [Deployed address]
LiquidityPool:     [Deployed address]
PolicyManager:     [Deployed address]
WeatherOracle:     [Deployed address]
SatelliteOracle:   [Deployed address]
DamageCalculator:  [Deployed address]
PayoutEngine:      [Deployed address]
USDC (Mock):       0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## Support & Resources

- **Documentation**: `/Contracts/README.md`
- **API Docs**: `/backend/FARMER_API_DOCUMENTATION.md`
- **Bug Reports**: Create GitHub issue
- **Security Issues**: security@microcrop.io (to be set up)

## Changelog

**v1.0.0** (Current)
- Initial deployment
- 7 core contracts
- 3 libraries
- 4 interfaces
- Full policy lifecycle
- Multi-stage payout workflow
- Dual oracle system (weather + satellite)

---

**Last Updated**: [Current Date]  
**Network**: Base L2  
**Solidity**: 0.8.20  
**License**: MIT
