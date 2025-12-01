# MicroCrop Smart Contract Testing Guide

## Overview

Comprehensive testing strategy for the MicroCrop parametric crop insurance platform covering unit tests, integration tests, and fuzzing.

## Test Architecture

### Test Categories

1. **Unit Tests** (~800 lines)
   - Individual contract functions
   - Library functions
   - Edge cases and boundaries
   - Access control
   - Events and state changes

2. **Integration Tests** (~500 lines)
   - Cross-contract workflows
   - Full policy lifecycle
   - Oracle data flow
   - Payout processing
   - Capital management

3. **Fuzzing Tests** (~400 lines)
   - Random input generation
   - Invariant testing
   - Edge case discovery
   - Gas optimization

## Test Suite Structure

```
test/
├── unit/
│   ├── Treasury.t.sol
│   ├── LiquidityPool.t.sol
│   ├── PolicyManager.t.sol
│   ├── WeatherOracle.t.sol
│   ├── SatelliteOracle.t.sol
│   ├── DamageCalculator.t.sol
│   ├── PayoutEngine.t.sol
│   └── Libraries.t.sol
├── integration/
│   ├── PolicyLifecycle.t.sol
│   ├── CapitalManagement.t.sol
│   └── PayoutWorkflow.t.sol
└── fuzzing/
    ├── PolicyFuzzing.t.sol
    ├── DamageFuzzing.t.sol
    └── InvariantTests.t.sol
```

## Unit Test Specifications

### 1. Treasury.t.sol

**Coverage Target**: >95%

**Test Cases**:
```solidity
// Setup
- testInitialization()
- testUSDCAddress()
- testInitialReserves()

// Reserve Management
- testDepositReserves()
- testDepositReservesUnauthorized()
- testWithdrawReserves()
- testWithdrawReservesInsufficientFunds()
- testWithdrawReservesUnauthorized()
- testGetReserves()

// Premium Collection
- testCollectPremium()
- testCollectPremiumUnauthorized()
- testCollectPremiumInsufficientApproval()
- testRefundPremium()
- testRefundPremiumUnauthorized()

// Payout Execution
- testExecutePayout()
- testExecutePayoutInsufficientFunds()
- testExecutePayoutUnauthorized()
- testExecutePayoutToZeroAddress()

// Emergency
- testPause()
- testUnpause()
- testPauseUnauthorized()
- testCollectPremiumWhenPaused()
```

### 2. LiquidityPool.t.sol

**Coverage Target**: >95%

**Test Cases**:
```solidity
// Staking
- testStake()
- testStakeMinimum()
- testStakeBelowMinimum()
- testStakeWithoutApproval()
- testStakeMultipleTimes()

// Unstaking
- testUnstake()
- testUnstakePartial()
- testUnstakeAll()
- testUnstakeWithLockedCapital()
- testUnstakeExcessAmount()

// Capital Locking
- testLockCapital()
- testLockCapitalUnauthorized()
- testLockCapitalExceedsAvailable()
- testUnlockCapital()
- testUnlockCapitalUnauthorized()

// Rewards
- testAccrueReward()
- testMultipleRewards()
- testRewardCalculation()

// Views
- testGetStake()
- testTotalStaked()
- testTotalAvailable()
- testUtilizationRate()

// ERC4626 Compliance
- testDeposit()
- testWithdraw()
- testTotalAssets()
- testConvertToShares()
```

### 3. PolicyManager.t.sol

**Coverage Target**: >95%

**Test Cases**:
```solidity
// Policy Creation
- testCreatePolicy()
- testCreatePolicyUnauthorized()
- testCreatePolicyInvalidParams()
- testCreatePolicyZeroSumInsured()
- testCreatePolicyInvalidDates()
- testCreatePolicyDuplicateExternalId()

// Policy Activation
- testActivatePolicy()
- testActivatePolicyAlreadyActive()
- testActivatePolicyExpired()
- testActivatePolicyInsufficientPremium()
- testActivatePolicyInsufficientCapital()

// Policy Triggering
- testTriggerPolicy()
- testTriggerPolicyNotActive()
- testTriggerPolicyUnauthorized()
- testTriggerPolicyAlreadyTriggered()

// Policy Cancellation
- testCancelPolicy()
- testCancelPolicyNotActive()
- testCancelPolicyRefundCalculation()

// Policy Expiration
- testExpirePolicy()
- testExpirePolicyNotExpired()
- testBatchExpirePolicies()

// Farmer Eligibility
- testMaxActivePolicies()
- testMaxClaimsPerYear()
- testEligibilityAfterPayout()

// Rate Cards
- testSetRateCard()
- testSetRateCardUnauthorized()
- testSetRateCardInvalidValues()
- testGetRateCard()

// Views
- testGetPolicy()
- testGetFarmerPolicies()
- testIsPolicyActive()
- testGetPolicyPayout()
```

### 4. WeatherOracle.t.sol

**Coverage Target**: >95%

**Test Cases**:
```solidity
// Provider Registration
- testRegisterProvider()
- testRegisterProviderInsufficientStake()
- testRegisterProviderAlreadyRegistered()
- testRegisterProviderWithoutApproval()

// Data Submission
- testSubmitData()
- testSubmitDataUnregistered()
- testSubmitDataInvalidTemperature()
- testSubmitDataInvalidRainfall()
- testSubmitDataInvalidDays()
- testSubmitDuplicateData()

// Data Verification
- testVerifyData()
- testVerifyDataAutomatically()
- testVerifyDataMultipleSources()
- testDisputeData()
- testRejectData()

// Reputation System
- testReputationIncrease()
- testReputationDecrease()
- testSlashProvider()
- testSlashProviderBelowMinimum()

// Configuration
- testSetVerificationThreshold()
- testSetMinStake()
- testSetVerificationThresholdUnauthorized()

// Views
- testGetWeatherData()
- testGetProviderReputation()
- testIsProviderActive()
```

### 5. SatelliteOracle.t.sol

**Coverage Target**: >95%

**Test Cases**:
```solidity
// Provider Registration
- testRegisterProvider()
- testRegisterProviderHigherStake()

// Data Submission
- testSubmitData()
- testSubmitDataSetsBaseline()
- testSubmitDataInvalidNDVI()
- testSubmitDataAutoVerification()

// NDVI Management
- testCalculateNDVITrend()
- testCalculateNDVITrendPositive()
- testCalculateNDVITrendNegative()
- testGetPlotNDVI()
- testUpdatePlotBaseline()
- testUpdatePlotBaselineUnauthorized()

// Historical Tracking
- testNDVIHistory()
- testMultipleSubmissionsHistory()

// Views
- testGetSatelliteData()
- testGetPlotBaseline()
```

### 6. DamageCalculator.t.sol

**Coverage Target**: >95%

**Test Cases**:
```solidity
// Damage Assessment
- testAssessDamage()
- testAssessDamageWeatherOnly()
- testAssessDamageSatelliteOnly()
- testAssessDamageCombined()
- testAssessDamageNoDamage()

// Drought Damage
- testDroughtDamageRainfallDeficit()
- testDroughtDamageDryDays()
- testDroughtDamageCombined()

// Flood Damage
- testFloodDamage24Hours()
- testFloodDamage48Hours()
- testFloodDamage72Hours()

// Heat Stress Damage
- testHeatStressDamageTemperature()
- testHeatStressDamageDuration()
- testHeatStressDamageCombined()

// Satellite Damage
- testSatelliteDamageNDVIDecline()
- testSatelliteDamageMinNDVI()
- testSatelliteDamageTrend()

// Trigger Conditions
- testCheckTriggerConditions()
- testCheckTriggerConditionsNotMet()

// Simulation
- testSimulateDamage()
- testSimulateDamageNoStorage()

// Payout Calculation
- testCalculatePayoutBelowDeductible()
- testCalculatePayoutAboveDeductible()
- testCalculatePayoutMaximum()

// Reassessment
- testReassessDamage()
- testReassessDamageUnauthorized()
```

### 7. PayoutEngine.t.sol

**Coverage Target**: >95%

**Test Cases**:
```solidity
// Payout Initiation
- testInitiatePayout()
- testInitiatePayoutUnauthorized()
- testInitiatePayoutDuplicate()

// Payout Calculation
- testCalculatePayout()
- testCalculatePayoutWrongStatus()
- testCalculatePayoutZeroDamage()

// Payout Approval
- testApprovePayout()
- testApprovePayoutUnauthorized()
- testApprovePayoutWrongStatus()

// Payout Processing
- testProcessPayout()
- testProcessPayoutInsufficientFunds()
- testProcessPayoutUnauthorized()

// Payout Confirmation
- testConfirmPayout()
- testConfirmPayoutUnauthorized()

// Payout Retry
- testRetryPayout()
- testRetryPayoutWrongStatus()

// Batch Processing
- testCreateBatch()
- testCreateBatchInvalidPayouts()
- testProcessBatch()
- testProcessBatchPartialSuccess()

// Views
- testGetPayout()
- testGetPayoutsByPolicy()
- testGetPendingPayouts()
- testGetTotalPayouts()
- testGetTotalAmountPaid()

// Statistics
- testPayoutStatistics()
- testPayoutStatisticsMultiplePolicies()
```

### 8. Libraries.t.sol

**Coverage Target**: 100%

**Test Cases**:
```solidity
// MathLib
- testMin()
- testMax()
- testAbs()
- testMulDiv()
- testCalculatePercentage()
- testCalculateProRata()
- testBpsToDecimal()

// PolicyLib
- testCalculatePremium()
- testCalculatePremiumAllCrops()
- testCalculatePremiumAllCoverageTypes()
- testCalculateRiskFactor()
- testCalculateRefund()

// DamageLib
- testCalculateDroughtDamage()
- testCalculateFloodDamage()
- testCalculateHeatStressDamage()
- testCalculateSatelliteDamage()
- testCalculateTotalDamage()
- testCalculatePayout()
```

## Integration Test Specifications

### 1. PolicyLifecycle.t.sol

**Workflow Tests**:
```solidity
- testFullPolicyLifecycle()
  1. Create policy (backend)
  2. Activate policy (farmer pays premium)
  3. Submit oracle data (weather + satellite)
  4. Trigger policy (damage detected)
  5. Process payout
  6. Confirm completion

- testPolicyCancellation()
  1. Create and activate policy
  2. Cancel early
  3. Verify pro-rata refund
  4. Check capital unlocked

- testPolicyExpiration()
  1. Create and activate policy
  2. Wait for expiration
  3. Expire policy
  4. Check no payout
  5. Verify capital unlocked
  6. Verify premium retained

- testMultiplePoliciesSameFarmer()
  1. Create 5 policies (max)
  2. Try to create 6th (should fail)
  3. Complete one policy
  4. Create new policy (should succeed)

- testMaxClaimsPerYear()
  1. Create and trigger 3 policies in same year
  2. Try 4th claim (should fail)
  3. Wait for next year
  4. Create new policy (should succeed)
```

### 2. CapitalManagement.t.sol

**Capital Flow Tests**:
```solidity
- testCapitalLockingUnlocking()
  1. Stake liquidity
  2. Create multiple policies
  3. Verify capital locked
  4. Complete policies
  5. Verify capital unlocked

- testCapitalExhaustion()
  1. Stake limited liquidity
  2. Create policies until capital exhausted
  3. Try to activate new policy (should fail)
  4. Complete one policy
  5. Activate queued policy (should succeed)

- testReserveUtilization()
  1. Start with reserves
  2. Create policies
  3. Trigger payouts
  4. Monitor reserve ratio
  5. Verify alerts at thresholds

- testLiquidityProviderRewards()
  1. Stake liquidity
  2. Policies collect premiums
  3. Verify rewards accrued
  4. Unstake with rewards
  5. Verify correct amounts
```

### 3. PayoutWorkflow.t.sol

**Payout Integration Tests**:
```solidity
- testEndToEndPayout()
  1. Policy triggered
  2. Damage calculated (60% weather + 40% satellite)
  3. Payout approved
  4. Payment processed (Swypt)
  5. Confirmation received
  6. Capital unlocked

- testBatchPayoutProcessing()
  1. Trigger multiple policies
  2. Calculate all payouts
  3. Approve batch
  4. Process batch
  5. Verify all completed

- testPayoutRetry()
  1. Process payout
  2. Simulate failure
  3. Retry payout
  4. Verify success

- testPayoutWithInsufficientFunds()
  1. Trigger large payout
  2. Insufficient treasury balance
  3. Verify failure handling
  4. Add funds
  5. Retry successfully
```

## Fuzzing Test Specifications

### 1. PolicyFuzzing.t.sol

**Invariants**:
```solidity
invariant_totalPoliciesConsistent()
invariant_lockedCapitalNeverExceedsStaked()
invariant_premiumsAlwaysPositive()
invariant_farmerNeverExceedsMaxPolicies()
invariant_sumInsuredWithinBounds()

function testFuzz_CreatePolicy(
    uint256 sumInsured,
    uint256 duration,
    uint8 cropType,
    uint8 coverageType
) public {
    // Bound inputs
    sumInsured = bound(sumInsured, 100_000000, 10000_000000);
    duration = bound(duration, 30 days, 180 days);
    cropType = uint8(bound(cropType, 0, 5));
    coverageType = uint8(bound(coverageType, 0, 2));
    
    // Test policy creation with random valid inputs
}

function testFuzz_PremiumCalculation(
    uint256 sumInsured,
    uint16 baseRate
) public {
    // Test premium calculation accuracy
}
```

### 2. DamageFuzzing.t.sol

**Invariants**:
```solidity
invariant_damageNeverExceeds100Percent()
invariant_payoutNeverExceedsSumInsured()
invariant_weatherWeightIs60Percent()
invariant_satelliteWeightIs40Percent()

function testFuzz_DamageCalculation(
    uint256 rainfall,
    uint256 temperature,
    uint256 dryDays,
    uint256 ndvi
) public {
    // Bound inputs to valid ranges
    rainfall = bound(rainfall, 0, 2000_00);
    temperature = bound(temperature, -10_00, 60_00);
    dryDays = bound(dryDays, 0, 180);
    ndvi = bound(ndvi, 0, 10000);
    
    // Test damage calculation
    uint256 damage = calculator.simulateDamage(...);
    
    // Verify invariants
    assertLe(damage, 10000);
}

function testFuzz_PayoutCalculation(
    uint256 sumInsured,
    uint256 damagePercentage
) public {
    // Test payout amounts
}
```

### 3. InvariantTests.t.sol

**System-Wide Invariants**:
```solidity
invariant_totalUSDCBalanceConsistent() {
    // Treasury + LiquidityPool + stakers = total tracked
}

invariant_lockedCapitalMatchesPolicies() {
    // Locked capital = sum of all active policy coverages
}

invariant_reservesNeverNegative() {
    // Treasury reserves >= 0
}

invariant_stakedCapitalMatchesShares() {
    // LP shares * price = staked amount
}

invariant_accessControlConsistent() {
    // Only authorized addresses have roles
}

invariant_payoutNeverExceedsCoverage() {
    // Payout <= sum insured for all policies
}
```

## Running Tests

### All Tests
```bash
forge test
```

### Unit Tests Only
```bash
forge test --match-path "test/unit/**/*.sol"
```

### Integration Tests
```bash
forge test --match-path "test/integration/**/*.sol"
```

### Fuzzing Tests
```bash
forge test --match-path "test/fuzzing/**/*.sol"
```

### Gas Report
```bash
forge test --gas-report
```

### Coverage Report
```bash
forge coverage
forge coverage --report lcov
```

### Specific Test
```bash
forge test --match-test testCreatePolicy -vvvv
```

## Test Coverage Targets

| Category          | Target | Critical |
|-------------------|--------|----------|
| Unit Tests        | >95%   | 100%     |
| Integration Tests | >90%   | N/A      |
| Fuzzing           | N/A    | All invariants |
| Overall           | >95%   | Core contracts 100% |

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: foundry-rs/foundry-toolchain@v1
      
      - name: Install dependencies
        run: forge install
      
      - name: Run tests
        run: forge test
      
      - name: Check coverage
        run: |
          forge coverage --report lcov
          lcov --list coverage.lcov
      
      - name: Fail if coverage < 95%
        run: |
          coverage=$(lcov --summary coverage.lcov | grep lines | awk '{print $2}' | sed 's/%//')
          if (( $(echo "$coverage < 95" | bc -l) )); then
            echo "Coverage $coverage% is below 95%"
            exit 1
          fi
```

## Test Data

### Mock Addresses
```solidity
address constant ADMIN = address(0x1);
address constant BACKEND = address(0x2);
address constant ORACLE = address(0x3);
address constant FARMER = address(0x4);
address constant LP_STAKER = address(0x5);
address constant PROCESSOR = address(0x6);
address constant APPROVER = address(0x7);
```

### Sample Policy Data
```solidity
uint256 constant DEFAULT_SUM_INSURED = 1000_000000; // 1000 USDC
uint256 constant DEFAULT_DURATION = 180 days;
uint8 constant DEFAULT_CROP = 0; // MAIZE
uint8 constant DEFAULT_COVERAGE = 0; // DROUGHT
```

### Sample Weather Data
```solidity
struct TestWeatherData {
    uint256 totalRainfall: 25000; // 250mm (low)
    uint256 avgTemperature: 2500; // 25°C
    uint256 maxTemperature: 3200; // 32°C
    uint256 dryDays: 20; // High
    uint256 floodDays: 0;
    uint256 heatStressDays: 3;
}
```

### Sample Satellite Data
```solidity
struct TestSatelliteData {
    uint256 avgNDVI: 4500; // 0.45 (low)
    uint256 minNDVI: 3500; // 0.35
    int256 ndviTrend: -2000; // -20%
    uint256 baselineNDVI: 7000; // 0.70
}
```

## Debugging

### Verbose Output
```bash
forge test --match-test testName -vvvv
```

### Trace Execution
```bash
forge test --match-test testName --trace
```

### Debug Failed Test
```bash
forge test --match-test testName --debug
```

### Gas Profiling
```bash
forge test --gas-report --match-test testName
```

## Next Steps

1. **Create Base Test Contract**
   - Set up common test fixtures
   - Mock USDC token
   - Helper functions

2. **Write Unit Tests** (Priority)
   - Start with Treasury and LiquidityPool
   - Then PolicyManager (most complex)
   - Oracle contracts
   - PayoutEngine

3. **Integration Tests**
   - Full workflows
   - Error scenarios
   - Edge cases

4. **Fuzzing Tests**
   - Invariant checks
   - Random input testing
   - Gas optimization

5. **Coverage Analysis**
   - Identify gaps
   - Add missing tests
   - Achieve >95% coverage

6. **Performance Testing**
   - Gas benchmarks
   - Batch operation limits
   - Stress testing

---

**Estimated Timeline**:
- Unit tests: 10-12 hours
- Integration tests: 4-5 hours
- Fuzzing tests: 3-4 hours
- Coverage & refinement: 2-3 hours
- **Total: 19-24 hours**

**Priority**: Unit tests > Integration tests > Fuzzing tests
