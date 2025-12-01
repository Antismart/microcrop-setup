# MicroCrop Smart Contracts - Quick Reference

## 🚀 Quick Start

```bash
# Clone and setup
cd /Users/onchainchef/Desktop/microcrop-setup/Contracts
forge install
forge build

# Run tests (when available)
forge test
forge coverage

# Deploy to testnet
forge script script/DeployTestnet.s.sol:DeployTestnet \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast

# Deploy to mainnet
forge script script/Deploy.s.sol:Deploy \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify
```

## 📝 Contract Addresses

### Base Mainnet (Production)
```
USDC:              0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Treasury:          [Deploy and update]
LiquidityPool:     [Deploy and update]
PolicyManager:     [Deploy and update]
WeatherOracle:     [Deploy and update]
SatelliteOracle:   [Deploy and update]
DamageCalculator:  [Deploy and update]
PayoutEngine:      [Deploy and update]
```

### Base Sepolia (Testnet)
```
USDC (Mock):       0x036CbD53842c5426634e7929541eC2318f3dCF7e
Treasury:          [Deploy and update]
LiquidityPool:     [Deploy and update]
PolicyManager:     [Deploy and update]
WeatherOracle:     [Deploy and update]
SatelliteOracle:   [Deploy and update]
DamageCalculator:  [Deploy and update]
PayoutEngine:      [Deploy and update]
```

## 🔑 Key Functions

### PolicyManager
```solidity
// Create policy (BACKEND_ROLE)
createPolicy(address farmer, string externalId, uint256 plotId, uint256 sumInsured, 
             uint256 startTime, uint256 endTime, CropType crop, CoverageType coverage, 
             ThresholdParams thresholds)

// Activate policy (farmer)
activatePolicy(uint256 policyId) // Must approve premium first

// Trigger policy (ORACLE_ROLE)
triggerPolicy(uint256 policyId)

// Cancel policy (farmer)
cancelPolicy(uint256 policyId) // 80% refund if active

// Expire policy (ADMIN)
expirePolicy(uint256 policyId)
batchExpirePolicies(uint256[] policyIds)

// View policy
getPolicy(uint256 policyId) returns (Policy)
getFarmerPolicies(address farmer) returns (uint256[])
```

### LiquidityPool
```solidity
// Stake capital
stake(uint256 amount) // Min 100 USDC, must approve first

// Unstake capital
unstake(uint256 amount) // Cannot unstake locked capital

// View functions
getStake(address staker) returns (Stake)
totalAvailable() returns (uint256)
utilizationRate() returns (uint256)
```

### Treasury
```solidity
// Deposit reserves (ADMIN)
depositReserves(uint256 amount) // Must approve USDC first

// Withdraw reserves (ADMIN)
withdrawReserves(uint256 amount)

// View reserves
getReserves() returns (uint256)
```

### WeatherOracle
```solidity
// Register provider (requires 1000 USDC stake)
registerProvider() // Must approve 1000 USDC first

// Submit weather data (provider)
submitData(uint256 plotId, uint256 periodStart, uint256 periodEnd, 
           WeatherData data)

// View data
getWeatherData(uint256 plotId, uint256 periodStart, uint256 periodEnd) 
    returns (WeatherData)
```

### SatelliteOracle
```solidity
// Register provider (requires 2000 USDC stake)
registerProvider() // Must approve 2000 USDC first

// Submit satellite data (provider)
submitData(uint256 plotId, uint256 periodStart, uint256 periodEnd,
           SatelliteData data)

// View data
getSatelliteData(uint256 plotId, uint256 periodStart, uint256 periodEnd)
    returns (SatelliteData)
```

### DamageCalculator
```solidity
// Assess damage (PAYOUT_ENGINE_ROLE)
assessDamage(uint256 policyId) returns (uint256 damagePercentage)

// Simulate damage (no storage, for testing)
simulateDamage(uint256 policyId) returns (uint256 damagePercentage)

// Check if policy should be triggered
checkTriggerConditions(uint256 policyId) returns (bool shouldTrigger)
```

### PayoutEngine
```solidity
// Initiate payout (PROCESSOR_ROLE)
initiatePayout(uint256 policyId, string externalId) returns (uint256 payoutId)

// Calculate payout (PROCESSOR_ROLE)
calculatePayout(uint256 payoutId)

// Approve payout (APPROVER_ROLE)
approvePayout(uint256 payoutId)

// Process payout (PROCESSOR_ROLE)
processPayout(uint256 payoutId, string swyptTxId)

// Confirm payout (PROCESSOR_ROLE)
confirmPayout(uint256 payoutId, string transactionHash)

// Batch processing
createBatch(uint256[] payoutIds) returns (uint256 batchId)
processBatch(uint256 batchId)

// View functions
getPayout(uint256 payoutId) returns (Payout)
totalPayouts() returns (uint256)
totalAmountPaid() returns (uint256)
```

## 🎭 Roles & Permissions

| Role | Grant Command | Purpose |
|------|---------------|---------|
| ADMIN | `grantRole(DEFAULT_ADMIN_ROLE, address)` | Full control |
| BACKEND_ROLE | `grantRole(BACKEND_ROLE, address)` | Create policies |
| ORACLE_ROLE | `grantRole(ORACLE_ROLE, address)` | Trigger policies |
| PROCESSOR_ROLE | `grantRole(PROCESSOR_ROLE, address)` | Process payouts |
| APPROVER_ROLE | `grantRole(APPROVER_ROLE, address)` | Approve payouts |

Example:
```bash
cast send <POLICY_MANAGER_ADDRESS> \
    "grantRole(bytes32,address)" \
    $(cast keccak "BACKEND_ROLE") \
    <BACKEND_ADDRESS> \
    --rpc-url $BASE_RPC_URL \
    --private-key $PRIVATE_KEY
```

## 📊 Data Structures

### Policy
```solidity
struct Policy {
    uint256 policyId;
    address farmer;
    string externalId;        // Backend reference
    uint256 plotId;
    uint256 sumInsured;       // USDC (6 decimals)
    uint256 premium;
    uint256 startTime;
    uint256 endTime;
    CropType cropType;        // 0-5: MAIZE, BEANS, WHEAT, SORGHUM, MILLET, RICE
    CoverageType coverageType; // 0-2: DROUGHT, FLOOD, MULTI_PERIL
    PolicyStatus status;      // PENDING, ACTIVE, TRIGGERED, CANCELLED, EXPIRED
    ThresholdParams thresholds;
}
```

### ThresholdParams
```solidity
struct ThresholdParams {
    uint256 minRainfall;      // mm * 100
    uint256 maxRainfall;
    uint256 minTemperature;   // °C * 100
    uint256 maxTemperature;
    uint256 maxDryDays;       // consecutive days
    uint256 maxFloodHours;    // hours
    uint256 maxHeatStressDays; // days
}
```

### WeatherData
```solidity
struct WeatherData {
    uint256 totalRainfall;    // mm * 100
    uint256 avgTemperature;   // °C * 100
    uint256 maxTemperature;
    uint256 dryDays;
    uint256 floodDays;
    uint256 heatStressDays;
}
```

### SatelliteData
```solidity
struct SatelliteData {
    uint256 avgNDVI;          // 0-10000 (0.00-1.00)
    uint256 minNDVI;
    int256 ndviTrend;         // -10000 to +10000
    uint256 baselineNDVI;
}
```

### Payout
```solidity
struct Payout {
    uint256 payoutId;
    uint256 policyId;
    address farmer;
    string externalId;
    uint256 sumInsured;
    uint256 damagePercentage; // 0-10000 bps
    uint256 payoutAmount;     // USDC
    PayoutStatus status;      // PENDING → CALCULATED → APPROVED → PROCESSING → COMPLETED
    uint256 createdAt;
    uint256 processedAt;
    string transactionHash;   // Off-chain reference
}
```

## 🔢 Constants

### Limits
```solidity
MIN_STAKE = 100_000000;              // 100 USDC
MAX_ACTIVE_POLICIES = 5;             // Per farmer
MAX_CLAIMS_PER_YEAR = 3;             // Per farmer
MIN_WEATHER_STAKE = 1000_000000;     // 1000 USDC
MIN_SATELLITE_STAKE = 2000_000000;   // 2000 USDC
CANCELLATION_REFUND_PCT = 80;        // 80% refund
DEDUCTIBLE = 3000;                   // 30% deductible on damage
```

### Weights
```solidity
WEATHER_WEIGHT = 6000;               // 60%
SATELLITE_WEIGHT = 4000;             // 40%
BASIS_POINTS = 10000;                // 100%
```

### Rates (Default)
```solidity
MAIZE_DROUGHT = 500;      // 5.0%
MAIZE_FLOOD = 400;        // 4.0%
BEANS_DROUGHT = 600;      // 6.0%
BEANS_FLOOD = 450;        // 4.5%
SORGHUM_DROUGHT = 400;    // 4.0%
SORGHUM_FLOOD = 350;      // 3.5%
// ... see PolicyLib.sol for full rate card
```

## 🔍 Events

### PolicyManager
```solidity
event PolicyCreated(uint256 indexed policyId, address indexed farmer, 
                   string externalId, uint256 sumInsured, uint256 premium);
event PolicyActivated(uint256 indexed policyId, uint256 timestamp);
event PolicyTriggered(uint256 indexed policyId, uint256 timestamp);
event PolicyCancelled(uint256 indexed policyId, string reason);
event PolicyExpired(uint256 indexed policyId);
```

### LiquidityPool
```solidity
event Staked(address indexed staker, uint256 amount, uint256 shares);
event Unstaked(address indexed staker, uint256 amount, uint256 shares);
event CapitalLocked(uint256 indexed policyId, uint256 amount);
event CapitalUnlocked(uint256 indexed policyId, uint256 amount);
event RewardAccrued(address indexed staker, uint256 amount);
```

### WeatherOracle
```solidity
event ProviderRegistered(address indexed provider, uint256 stake);
event DataSubmitted(address indexed provider, uint256 indexed plotId, 
                   uint256 periodStart, uint256 periodEnd);
event DataVerified(uint256 indexed plotId, uint256 periodStart);
event ProviderSlashed(address indexed provider, uint256 amount);
```

### PayoutEngine
```solidity
event PayoutInitiated(uint256 indexed payoutId, uint256 indexed policyId);
event PayoutCalculated(uint256 indexed payoutId, uint256 amount, 
                      uint256 damagePercentage);
event PayoutApproved(uint256 indexed payoutId, address indexed approver);
event PayoutProcessed(uint256 indexed payoutId, string swyptTxId);
event PayoutCompleted(uint256 indexed payoutId, string transactionHash);
event PayoutFailed(uint256 indexed payoutId, string reason);
```

## ⚡ Common Workflows

### 1. Create and Activate Policy
```javascript
// 1. Backend creates policy
const tx1 = await policyManager.createPolicy({
    farmer: farmerAddress,
    externalId: "POLICY-001",
    plotId: 123,
    sumInsured: 1000_000000, // 1000 USDC
    startTime: startTimestamp,
    endTime: endTimestamp,
    cropType: 0, // MAIZE
    coverageType: 0, // DROUGHT
    thresholds: {...}
});
const policyId = tx1.events.PolicyCreated.policyId;

// 2. Get premium amount
const policy = await policyManager.getPolicy(policyId);
const premium = policy.premium;

// 3. Farmer approves premium
await usdc.approve(policyManagerAddress, premium);

// 4. Farmer activates policy
await policyManager.activatePolicy(policyId);
```

### 2. Submit Oracle Data
```javascript
// Weather oracle provider
await weatherOracle.submitData(
    plotId,
    periodStart,
    periodEnd,
    {
        totalRainfall: 25000,   // 250mm
        avgTemperature: 2500,   // 25°C
        maxTemperature: 3200,   // 32°C
        dryDays: 20,
        floodDays: 0,
        heatStressDays: 3
    }
);

// Satellite oracle provider
await satelliteOracle.submitData(
    plotId,
    periodStart,
    periodEnd,
    {
        avgNDVI: 4500,    // 0.45
        minNDVI: 3500,    // 0.35
        ndviTrend: -2000, // -20%
        baselineNDVI: 7000 // 0.70
    }
);
```

### 3. Trigger and Process Payout
```javascript
// 1. Oracle triggers policy
await policyManager.triggerPolicy(policyId);

// 2. Processor initiates payout
const tx = await payoutEngine.initiatePayout(policyId, "PAYOUT-001");
const payoutId = tx.events.PayoutInitiated.payoutId;

// 3. Calculate damage and payout (automatic)
await payoutEngine.calculatePayout(payoutId);

// 4. Approver approves
await payoutEngine.approvePayout(payoutId);

// 5. Processor processes (initiates off-chain payment)
await payoutEngine.processPayout(payoutId, "SWYPT-TX-123");

// 6. Processor confirms (after Swypt confirmation)
await payoutEngine.confirmPayout(payoutId, "0x123abc...");
```

### 4. Batch Payouts
```javascript
// 1. Create batch of approved payouts
const payoutIds = [1, 2, 3, 4, 5];
const tx = await payoutEngine.createBatch(payoutIds);
const batchId = tx.events.BatchCreated.batchId;

// 2. Process entire batch
const result = await payoutEngine.processBatch(batchId);
console.log(`Processed: ${result.successCount}, Failed: ${result.failureCount}`);
```

## 🛡️ Emergency Procedures

### Pause Contract
```bash
cast send <CONTRACT_ADDRESS> "pause()" \
    --rpc-url $BASE_RPC_URL \
    --private-key $ADMIN_KEY
```

### Unpause Contract
```bash
cast send <CONTRACT_ADDRESS> "unpause()" \
    --rpc-url $BASE_RPC_URL \
    --private-key $ADMIN_KEY
```

### Withdraw Reserves (Emergency)
```bash
cast send <TREASURY_ADDRESS> \
    "withdrawReserves(uint256)" \
    <AMOUNT_IN_USDC_WITH_6_DECIMALS> \
    --rpc-url $BASE_RPC_URL \
    --private-key $ADMIN_KEY
```

## 📈 Monitoring

### Health Checks
```bash
# Treasury balance
cast call <TREASURY_ADDRESS> "getReserves()" --rpc-url $BASE_RPC_URL

# Available liquidity
cast call <LIQUIDITY_POOL_ADDRESS> "totalAvailable()" --rpc-url $BASE_RPC_URL

# Active policies
cast call <POLICY_MANAGER_ADDRESS> "totalPolicies()" --rpc-url $BASE_RPC_URL

# Total payouts
cast call <PAYOUT_ENGINE_ADDRESS> "totalPayouts()" --rpc-url $BASE_RPC_URL
cast call <PAYOUT_ENGINE_ADDRESS> "totalAmountPaid()" --rpc-url $BASE_RPC_URL

# Utilization rate
cast call <LIQUIDITY_POOL_ADDRESS> "utilizationRate()" --rpc-url $BASE_RPC_URL
```

### Event Monitoring
```javascript
// Subscribe to PolicyManager events
policyManager.on("PolicyCreated", (policyId, farmer, externalId, sumInsured, premium) => {
    console.log(`New policy ${policyId} for ${farmer}: ${sumInsured} USDC`);
});

// Subscribe to PayoutEngine events
payoutEngine.on("PayoutCompleted", (payoutId, transactionHash) => {
    console.log(`Payout ${payoutId} completed: ${transactionHash}`);
});
```

## 🐛 Troubleshooting

### Policy Activation Fails
- ✅ Check USDC approval: `usdc.allowance(farmer, policyManager)`
- ✅ Check farmer balance: `usdc.balanceOf(farmer)`
- ✅ Check sufficient liquidity: `liquidityPool.totalAvailable()`
- ✅ Check farmer eligibility: `<5 active policies, <3 claims/year`

### Oracle Data Rejected
- ✅ Check provider is registered: `weatherOracle.isProviderActive(provider)`
- ✅ Check data validation: temperature (-10 to 60°C), rainfall (0-2000mm)
- ✅ Check NDVI range (0-10000)
- ✅ Check provider reputation: `weatherOracle.getProviderReputation(provider)`

### Payout Processing Fails
- ✅ Check treasury balance: `treasury.getReserves()`
- ✅ Check payout status: `payoutEngine.getPayout(payoutId)`
- ✅ Check permissions: processor and approver roles
- ✅ Check if policy was properly triggered

## 📚 Documentation Links

- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **Implementation Status**: `IMPLEMENTATION_COMPLETE.md`
- **Contract Documentation**: Run `forge doc` and open `docs/index.html`
- **Foundry Book**: https://book.getfoundry.sh/

## 🔗 Useful Commands

```bash
# Generate documentation
forge doc

# Run tests with gas report
forge test --gas-report

# Get contract size
forge build --sizes

# Flatten contract for verification
forge flatten src/core/PolicyManager.sol

# Generate coverage report
forge coverage --report lcov

# Interactive debugger
forge test --debug testFunctionName

# Verify on Basescan
forge verify-contract <ADDRESS> <CONTRACT> \
    --chain-id 8453 \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

---

**For detailed information, refer to:**
- `DEPLOYMENT_GUIDE.md` - Full deployment procedures
- `TESTING_GUIDE.md` - Comprehensive testing strategies
- `IMPLEMENTATION_COMPLETE.md` - Full implementation status

**Last Updated**: 2025  
**Version**: 1.0.0
