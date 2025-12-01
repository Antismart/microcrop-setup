# Claude Code Prompt for MicroCrop Smart Contracts (Foundry)

## Smart Contract Context

You are building the blockchain layer for **MicroCrop**, a parametric crop insurance platform. The contracts handle policy management, liquidity pools, oracle data verification, and automated payouts. The system must be trustless, transparent, and gas-efficient, deployed on Base (Ethereum L2).

## Technical Architecture

**Blockchain Stack:**
- Solidity 0.8.20+
- Foundry for development/testing
- Base (Ethereum L2) for deployment
- OpenZeppelin contracts for security
- Chainlink-compatible oracle pattern
- USDC for stablecoin payments

**Contract Interaction Flow:**
1. Farmers purchase policies (registered off-chain, reference on-chain)
2. Liquidity providers stake USDC to back policies
3. Oracle submits weather/satellite data with signatures
4. Damage assessment triggers automatic payouts
5. Treasury manages premiums and reserves

## Detailed Contract Requirements

### Project Structure
```
smart-contracts/
├── src/
│   ├── core/
│   │   ├── PolicyManager.sol
│   │   ├── LiquidityPool.sol
│   │   ├── PayoutEngine.sol
│   │   └── Treasury.sol
│   ├── oracles/
│   │   ├── WeatherOracle.sol
│   │   ├── SatelliteOracle.sol
│   │   └── DamageCalculator.sol
│   ├── interfaces/
│   │   ├── IPolicyManager.sol
│   │   ├── ILiquidityPool.sol
│   │   ├── IOracle.sol
│   │   └── IPayoutEngine.sol
│   ├── libraries/
│   │   ├── PolicyLib.sol
│   │   ├── DamageLib.sol
│   │   └── MathLib.sol
│   └── utils/
│       ├── AccessControl.sol
│       ├── Pausable.sol
│       └── ReentrancyGuard.sol
├── script/
│   ├── Deploy.s.sol
│   ├── DeployTestnet.s.sol
│   └── UpgradePolicy.s.sol
├── test/
│   ├── unit/
│   │   ├── PolicyManager.t.sol
│   │   ├── LiquidityPool.t.sol
│   │   └── PayoutEngine.t.sol
│   ├── integration/
│   │   ├── FullFlow.t.sol
│   │   └── OracleIntegration.t.sol
│   └── fuzzing/
│       └── DamageCalculator.t.sol
├── foundry.toml
└── .env.example
```

### 1. PolicyManager Contract

```solidity
// src/core/PolicyManager.sol
pragma solidity ^0.8.20;

contract PolicyManager {
    struct Policy {
        uint256 policyId;
        address farmer;           // Wallet linked to farmer
        string externalId;        // Off-chain reference
        uint256 plotId;
        uint256 sumInsured;       // USDC amount (6 decimals)
        uint256 premium;          // USDC amount paid
        uint256 startTime;
        uint256 endTime;
        CropType cropType;
        CoverageType coverageType;
        PolicyStatus status;
        ThresholdParams thresholds;
    }
    
    struct ThresholdParams {
        uint256 droughtThreshold;   // Rainfall mm * 100 for precision
        uint256 droughtDays;        // Consecutive days
        uint256 floodThreshold;     // Rainfall mm * 100
        uint256 floodHours;         // Time period
        uint256 heatThreshold;      // Temperature °C * 100
        uint256 heatDays;           // Consecutive days
    }
    
    enum CropType { MAIZE, BEANS, WHEAT, SORGHUM, MILLET, RICE }
    enum CoverageType { DROUGHT, FLOOD, MULTI_PERIL }
    enum PolicyStatus { PENDING, ACTIVE, EXPIRED, TRIGGERED, PAID_OUT, CANCELLED }
    
    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public farmerPolicies;
    mapping(string => uint256) public externalIdToPolicy;
    
    // Events
    event PolicyCreated(uint256 indexed policyId, address indexed farmer, uint256 sumInsured);
    event PolicyActivated(uint256 indexed policyId, uint256 premium);
    event PolicyTriggered(uint256 indexed policyId, uint256 damageIndex);
    
    // Core functions
    function createPolicy(
        address farmer,
        string calldata externalId,
        uint256 plotId,
        uint256 sumInsured,
        CropType cropType,
        CoverageType coverageType,
        ThresholdParams calldata thresholds
    ) external returns (uint256 policyId);
    
    function activatePolicy(uint256 policyId) external;
    function triggerPolicy(uint256 policyId, uint256 damageIndex) external;
    function cancelPolicy(uint256 policyId) external;
    function isPolicyActive(uint256 policyId) external view returns (bool);
    function getPolicyPayout(uint256 policyId, uint256 damageIndex) external pure returns (uint256);
}
```

### 2. LiquidityPool Contract

```solidity
// src/core/LiquidityPool.sol
pragma solidity ^0.8.20;

contract LiquidityPool {
    struct Pool {
        uint256 totalCapital;      // Total USDC deposited
        uint256 availableCapital;  // Available for payouts
        uint256 lockedCapital;     // Locked in active policies  
        uint256 totalPremiums;     // Accumulated premiums
        uint256 totalPayouts;      // Total paid out
        uint256 minStake;          // Minimum LP investment
        bool acceptingStakes;      // Is pool open for deposits
    }
    
    struct LiquidityProvider {
        uint256 stakedAmount;      // USDC staked
        uint256 shares;            // LP token shares
        uint256 rewardsClaimed;    // Premiums claimed
        uint256 stakedAt;          // Timestamp
        bool isActive;
    }
    
    Pool public pool;
    mapping(address => LiquidityProvider) public providers;
    uint256 public totalShares;
    
    // Events
    event Staked(address indexed provider, uint256 amount, uint256 shares);
    event Unstaked(address indexed provider, uint256 amount);
    event PremiumAdded(uint256 amount);
    event PayoutExecuted(uint256 amount);
    event RewardsClaimed(address indexed provider, uint256 amount);
    
    // LP functions
    function stake(uint256 amount) external returns (uint256 shares);
    function unstake(uint256 shares) external returns (uint256 amount);
    function claimRewards() external returns (uint256 rewards);
    function calculateShares(uint256 amount) public view returns (uint256);
    
    // Pool management
    function lockCapitalForPolicy(uint256 amount) external;
    function unlockCapital(uint256 amount) external;
    function addPremium(uint256 amount) external;
    function requestPayout(uint256 amount) external returns (bool);
    
    // View functions
    function getPoolHealth() external view returns (uint256 ratio);
    function getAvailableLiquidity() external view returns (uint256);
    function getProviderRewards(address provider) external view returns (uint256);
}
```

### 3. Oracle Contracts

```solidity
// src/oracles/WeatherOracle.sol
pragma solidity ^0.8.20;

contract WeatherOracle {
    struct WeatherData {
        uint256 stationId;
        uint256 timestamp;
        uint256 rainfall;         // mm * 100 for precision
        int256 temperature;       // °C * 100 (can be negative)
        uint256 humidity;         // percentage * 100
        uint256 windSpeed;        // km/h * 100
        bytes32 dataHash;         // Hash of raw data
        bytes signature;          // Oracle signature
    }
    
    struct WeatherStation {
        uint256 stationId;
        int256 latitude;          // Degrees * 1e6
        int256 longitude;         // Degrees * 1e6
        bool isActive;
        uint256 lastUpdate;
    }
    
    mapping(uint256 => WeatherStation) public stations;
    mapping(uint256 => mapping(uint256 => WeatherData)) public stationData; // stationId => timestamp => data
    mapping(address => bool) public authorizedOracles;
    
    // Events
    event WeatherDataSubmitted(uint256 indexed stationId, uint256 timestamp, uint256 rainfall);
    event StationRegistered(uint256 indexed stationId, int256 latitude, int256 longitude);
    event OracleAuthorized(address indexed oracle);
    
    // Oracle functions
    function submitWeatherData(
        uint256 stationId,
        WeatherData calldata data,
        bytes calldata signature
    ) external;
    
    function submitBatchWeatherData(
        WeatherData[] calldata dataArray
    ) external;
    
    // Aggregation functions
    function calculateDroughtIndex(
        uint256 stationId,
        uint256 fromTime,
        uint256 toTime
    ) external view returns (uint256);
    
    function calculateFloodIndex(
        uint256 stationId,
        uint256 periodHours
    ) external view returns (uint256);
    
    // Verification
    function verifyDataIntegrity(
        WeatherData calldata data,
        bytes calldata signature
    ) public pure returns (bool);
}

// src/oracles/SatelliteOracle.sol
contract SatelliteOracle {
    struct SatelliteData {
        uint256 plotId;
        uint256 captureDate;
        uint256 ndvi;             // Normalized to 0-10000 (0.0000-1.0000)
        uint256 evi;              // Enhanced Vegetation Index
        uint256 cloudCover;       // Percentage * 100
        string ipfsHash;          // IPFS hash of imagery
        bytes32 dataHash;
        bytes signature;
    }
    
    struct VegetationBaseline {
        uint256 plotId;
        uint256 seasonalNDVI;     // 3-year average for this time
        uint256 prePlantingNDVI;  // Before season started
        uint256 lastUpdate;
    }
    
    mapping(uint256 => mapping(uint256 => SatelliteData)) public plotData; // plotId => timestamp => data
    mapping(uint256 => VegetationBaseline) public baselines;
    
    event SatelliteDataSubmitted(uint256 indexed plotId, uint256 captureDate, uint256 ndvi);
    event BaselineUpdated(uint256 indexed plotId, uint256 seasonalNDVI);
    
    function submitSatelliteData(
        uint256 plotId,
        SatelliteData calldata data,
        bytes calldata signature
    ) external;
    
    function calculateVegetationStressIndex(
        uint256 plotId,
        uint256 currentDate
    ) external view returns (uint256);
    
    function updateBaseline(
        uint256 plotId,
        uint256 seasonalNDVI,
        uint256 prePlantingNDVI
    ) external;
}
```

### 4. DamageCalculator Contract

```solidity
// src/oracles/DamageCalculator.sol
pragma solidity ^0.8.20;

contract DamageCalculator {
    struct DamageAssessment {
        uint256 policyId;
        uint256 weatherStressIndex;    // 0-10000 (0.00-1.00)
        uint256 vegetationIndex;        // 0-10000 (0.00-1.00)
        uint256 damageIndex;            // 0-10000 (0.00-1.00)
        uint256 timestamp;
        bytes32 proofHash;              // IPFS hash of evidence
        bool verified;
    }
    
    struct CalculationWeights {
        uint256 weatherWeight;          // Default 6000 (60%)
        uint256 satelliteWeight;        // Default 4000 (40%)
    }
    
    mapping(uint256 => DamageAssessment) public assessments;
    mapping(uint256 => CalculationWeights) public cropWeights; // Per crop type
    
    uint256 constant PRECISION = 10000;
    uint256 constant NO_PAYOUT_THRESHOLD = 3000;      // 30%
    uint256 constant PARTIAL_PAYOUT_THRESHOLD = 6000; // 60%
    
    event DamageAssessed(uint256 indexed policyId, uint256 damageIndex, uint256 payoutPercentage);
    event ProofSubmitted(uint256 indexed policyId, bytes32 proofHash);
    
    function calculateDamageIndex(
        uint256 policyId,
        uint256 weatherStressIndex,
        uint256 vegetationIndex
    ) external returns (uint256 damageIndex);
    
    function getPayoutPercentage(uint256 damageIndex) public pure returns (uint256) {
        if (damageIndex < NO_PAYOUT_THRESHOLD) return 0;
        if (damageIndex < PARTIAL_PAYOUT_THRESHOLD) {
            // Linear interpolation: 30% to 60% damage = 30% to 70% payout
            return 3000 + ((damageIndex - 3000) * 4000) / 3000;
        }
        return PRECISION; // 100% payout
    }
    
    function submitProof(uint256 policyId, bytes32 proofHash) external;
    function verifyAssessment(uint256 policyId) external;
}
```

### 5. PayoutEngine Contract

```solidity
// src/core/PayoutEngine.sol
pragma solidity ^0.8.20;

contract PayoutEngine {
    struct PayoutRequest {
        uint256 policyId;
        address beneficiary;
        uint256 amount;
        uint256 damageIndex;
        uint256 requestTime;
        PayoutStatus status;
        string offChainRef;      // M-Pesa reference
        bytes32 proofHash;
    }
    
    enum PayoutStatus { PENDING, PROCESSING, COMPLETED, FAILED, REJECTED }
    
    mapping(uint256 => PayoutRequest) public payoutRequests;
    mapping(address => uint256[]) public beneficiaryPayouts;
    uint256 public totalPayoutsPending;
    uint256 public totalPayoutsCompleted;
    
    // Batch processing
    uint256[] public payoutQueue;
    uint256 public constant MAX_BATCH_SIZE = 50;
    
    event PayoutInitiated(uint256 indexed requestId, uint256 policyId, uint256 amount);
    event PayoutProcessed(uint256 indexed requestId, address beneficiary, uint256 amount);
    event PayoutBatchProcessed(uint256[] requestIds);
    event OffChainPayoutConfirmed(uint256 indexed requestId, string reference);
    
    function initiatePayout(
        uint256 policyId,
        address beneficiary,
        uint256 damageIndex,
        bytes32 proofHash
    ) external returns (uint256 requestId);
    
    function processPayout(uint256 requestId) external;
    
    function processBatchPayouts(uint256[] calldata requestIds) external;
    
    function confirmOffChainPayout(
        uint256 requestId,
        string calldata offChainRef
    ) external;
    
    function rejectPayout(uint256 requestId, string calldata reason) external;
    
    // Emergency functions
    function pausePayouts() external;
    function resumePayouts() external;
    function emergencyWithdraw(address recipient, uint256 amount) external;
}
```

### 6. Treasury Contract

```solidity
// src/core/Treasury.sol
pragma solidity ^0.8.20;

contract Treasury {
    struct ReserveRequirements {
        uint256 minReserveRatio;     // Minimum reserve to coverage ratio
        uint256 targetReserveRatio;  // Target for optimal operation
        uint256 maxExposure;         // Max coverage per pool
    }
    
    struct TreasuryStats {
        uint256 totalPremiums;
        uint256 totalPayouts;
        uint256 totalReserves;
        uint256 totalCoverage;       // Sum of all active policies
        uint256 operatingExpenses;
        uint256 lastRebalance;
    }
    
    TreasuryStats public stats;
    ReserveRequirements public requirements;
    
    mapping(address => uint256) public poolAllocations;
    mapping(uint256 => uint256) public monthlyPremiums; // timestamp => amount
    mapping(uint256 => uint256) public monthlyPayouts;
    
    event PremiumReceived(uint256 amount, uint256 policyId);
    event PayoutApproved(uint256 amount, uint256 policyId);
    event ReservesRebalanced(uint256 newReserve);
    event FeeDistributed(uint256 amount, address recipient);
    
    function receivePremium(uint256 amount, uint256 policyId) external;
    function requestPayout(uint256 amount, uint256 policyId) external returns (bool approved);
    function rebalanceReserves() external;
    function distributeOperatingFees(address recipient, uint256 amount) external;
    function calculateReserveRatio() public view returns (uint256);
    function getAvailableForPayouts() public view returns (uint256);
}
```

### 7. Libraries

```solidity
// src/libraries/PolicyLib.sol
library PolicyLib {
    function calculatePremium(
        uint256 sumInsured,
        uint256 riskScore,
        uint256 duration
    ) internal pure returns (uint256);
    
    function isEligibleForPayout(
        Policy memory policy,
        uint256 currentTime
    ) internal pure returns (bool);
    
    function calculateRiskScore(
        CropType cropType,
        uint256 plotLocation,
        uint256 historicalYield
    ) internal pure returns (uint256);
}

// src/libraries/DamageLib.sol
library DamageLib {
    function normalizeWeatherData(
        int256 rainfall,
        int256 temperature,
        uint256 period
    ) internal pure returns (uint256);
    
    function calculateNDVIDrop(
        uint256 currentNDVI,
        uint256 baselineNDVI
    ) internal pure returns (uint256);
    
    function weightedAverage(
        uint256 value1,
        uint256 weight1,
        uint256 value2,
        uint256 weight2
    ) internal pure returns (uint256);
}

// src/libraries/MathLib.sol
library MathLib {
    function min(uint256 a, uint256 b) internal pure returns (uint256);
    function max(uint256 a, uint256 b) internal pure returns (uint256);
    function average(uint256[] memory values) internal pure returns (uint256);
    function standardDeviation(uint256[] memory values) internal pure returns (uint256);
    function percentageOf(uint256 value, uint256 percentage) internal pure returns (uint256);
}
```

### 8. Deployment Scripts

```solidity
// script/Deploy.s.sol
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/core/PolicyManager.sol";
import "../src/core/LiquidityPool.sol";
import "../src/core/PayoutEngine.sol";
import "../src/core/Treasury.sol";
import "../src/oracles/WeatherOracle.sol";
import "../src/oracles/SatelliteOracle.sol";
import "../src/oracles/DamageCalculator.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address authorizedOracle = vm.envAddress("ORACLE_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy core contracts
        Treasury treasury = new Treasury();
        LiquidityPool pool = new LiquidityPool(address(treasury), usdc);
        PolicyManager policyManager = new PolicyManager(address(pool), address(treasury));
        PayoutEngine payoutEngine = new PayoutEngine(address(policyManager), address(pool), usdc);
        
        // Deploy oracle contracts
        WeatherOracle weatherOracle = new WeatherOracle();
        SatelliteOracle satelliteOracle = new SatelliteOracle();
        DamageCalculator calculator = new DamageCalculator(
            address(weatherOracle),
            address(satelliteOracle),
            address(policyManager)
        );
        
        // Configure access control
        weatherOracle.authorizeOracle(authorizedOracle);
        satelliteOracle.authorizeOracle(authorizedOracle);
        policyManager.grantRole(TRIGGER_ROLE, address(calculator));
        payoutEngine.grantRole(PROCESSOR_ROLE, address(calculator));
        
        // Initialize pool
        pool.initialize(1000000 * 1e6); // 1M USDC minimum
        
        vm.stopBroadcast();
        
        // Log deployed addresses
        console.log("Treasury:", address(treasury));
        console.log("LiquidityPool:", address(pool));
        console.log("PolicyManager:", address(policyManager));
        console.log("PayoutEngine:", address(payoutEngine));
        console.log("WeatherOracle:", address(weatherOracle));
        console.log("SatelliteOracle:", address(satelliteOracle));
        console.log("DamageCalculator:", address(calculator));
    }
}
```

### 9. Testing Requirements

```solidity
// test/unit/PolicyManager.t.sol
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/PolicyManager.sol";

contract PolicyManagerTest is Test {
    PolicyManager public policyManager;
    address public farmer = address(0x1);
    address public oracle = address(0x2);
    
    function setUp() public {
        policyManager = new PolicyManager();
    }
    
    function testCreatePolicy() public {
        // Test policy creation with valid parameters
        uint256 policyId = policyManager.createPolicy(
            farmer,
            "EXT-001",
            1,
            10000e6, // 10,000 USDC
            PolicyManager.CropType.MAIZE,
            PolicyManager.CoverageType.DROUGHT,
            PolicyManager.ThresholdParams({
                droughtThreshold: 2000, // 20mm
                droughtDays: 30,
                floodThreshold: 15000,  // 150mm
                floodHours: 48,
                heatThreshold: 3500,     // 35°C
                heatDays: 5
            })
        );
        
        assertEq(policyId, 1);
        // Add more assertions
    }
    
    function testCannotCreatePolicyWithZeroSum() public {
        vm.expectRevert("Sum insured cannot be zero");
        policyManager.createPolicy(farmer, "EXT-002", 1, 0, ...);
    }
    
    function testPolicyTriggerCalculation() public {
        // Test damage index triggers correct payout
    }
    
    function testFuzzPremiumCalculation(uint256 sumInsured) public {
        vm.assume(sumInsured > 0 && sumInsured < 1000000e6);
        // Fuzz test premium calculation
    }
}

// test/integration/FullFlow.t.sol
contract FullFlowTest is Test {
    // Test complete flow from policy creation to payout
    function testEndToEndInsuranceFlow() public {
        // 1. LP provides liquidity
        // 2. Farmer creates policy
        // 3. Premium payment
        // 4. Weather event occurs
        // 5. Oracle submits data
        // 6. Damage calculated
        // 7. Payout triggered
        // 8. Funds transferred
    }
}
```

### 10. Foundry Configuration

```toml
# foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
optimizer = true
optimizer_runs = 200
solc = "0.8.20"
via_ir = true

[profile.default.fuzz]
runs = 256
max_test_rejects = 65536
seed = "0x1"

[profile.default.invariant]
runs = 256
depth = 15
fail_on_revert = false

[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC}"
base_mainnet = "${BASE_MAINNET_RPC}"

[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}" }

# Gas reports
gas_reports = ["PolicyManager", "LiquidityPool", "PayoutEngine"]

# Formatting
fmt_line_length = 120
fmt_tab_width = 4
fmt_bracket_spacing = true
```

### 11. Environment Variables

```bash
# .env.example
# Deployment
PRIVATE_KEY=0x...
ORACLE_PRIVATE_KEY=0x...

# RPC Endpoints
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASE_MAINNET_RPC=https://mainnet.base.org

# Contract Addresses (after deployment)
USDC_ADDRESS=0x...
POLICY_MANAGER=0x...
LIQUIDITY_POOL=0x...
PAYOUT_ENGINE=0x...
WEATHER_ORACLE=0x...
SATELLITE_ORACLE=0x...

# API Keys
BASESCAN_API_KEY=...
IPFS_API_KEY=...

# Oracle Configuration
ORACLE_UPDATE_INTERVAL=3600
MIN_CONFIRMATIONS=3
```

### 12. Gas Optimization Requirements

- Use `calldata` instead of `memory` for function parameters
- Pack struct variables to minimize storage slots
- Use `unchecked` blocks for safe arithmetic
- Implement batch operations to reduce transaction costs
- Use events for data that doesn't need on-chain storage
- Optimize loops with early exits
- Use mappings instead of arrays where possible

### 13. Security Requirements

- Implement reentrancy guards on all state-changing functions
- Use OpenZeppelin's AccessControl for role management
- Add emergency pause functionality
- Implement time locks for critical operations
- Validate all oracle data signatures
- Add slippage protection for payouts
- Use pull pattern for withdrawals
- Implement upgrade pattern with proxy contracts

### 14. Implementation Commands

```bash
# Initialize Foundry project
forge init --no-git

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts
forge install chainlink/chainlink

# Build contracts
forge build

# Run tests
forge test -vvv

# Run specific test
forge test --match-test testCreatePolicy -vvv

# Gas report
forge test --gas-report

# Coverage
forge coverage

# Deploy to testnet
forge script script/Deploy.s.sol --rpc-url base_sepolia --broadcast --verify

# Verify contract
forge verify-contract 0x... PolicyManager --chain base_sepolia

# Generate documentation
forge doc --serve
```

## Success Criteria

The smart contract system is complete when:
- All contracts compile without warnings
- Test coverage > 95%
- Gas costs optimized (policy creation < 200k gas)
- All security best practices implemented
- Successful testnet deployment
- Integration with backend oracle system
- Automated payouts executing correctly
- Liquidity pool maintaining solvency
- Full documentation generated

Build incrementally, starting with core contracts, then oracles, then integration. Test extensively with fuzzing and invariant testing to ensure mathematical correctness of damage calculations and payout logic.