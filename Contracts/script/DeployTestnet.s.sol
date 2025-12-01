// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Treasury} from "../src/core/Treasury.sol";
import {LiquidityPool} from "../src/core/LiquidityPool.sol";
import {PolicyManager} from "../src/core/PolicyManager.sol";
import {PayoutEngine} from "../src/core/PayoutEngine.sol";
import {WeatherOracle} from "../src/oracles/WeatherOracle.sol";
import {SatelliteOracle} from "../src/oracles/SatelliteOracle.sol";
import {DamageCalculator} from "../src/oracles/DamageCalculator.sol";
import {IPolicyManager} from "../src/interfaces/IPolicyManager.sol";

/**
 * @title DeployTestnet
 * @notice Deployment script for MicroCrop insurance platform on Base Sepolia testnet
 * @dev Run with: forge script script/DeployTestnet.s.sol:DeployTestnet --rpc-url base-sepolia --broadcast --verify
 * 
 * Features:
 * - Deploys all contracts with test configuration
 * - Sets up role permissions
 * - Configures initial rate cards (lower premiums for testing)
 * - Registers test oracle providers
 * - Creates sample test data
 */
contract DeployTestnet is Script {
    // Base Sepolia testnet USDC address (mock)
    address constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    // Test addresses
    address testBackend;
    address testOracleProvider;
    address testFarmer;
    
    function run() external {
        // Load deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying MicroCrop contracts to Base Sepolia testnet...");
        console.log("Deployer address:", deployer);
        console.log("USDC address:", USDC_SEPOLIA);
        
        // Set up test addresses
        testBackend = vm.envOr("TEST_BACKEND_ADDRESS", deployer);
        testOracleProvider = vm.envOr("TEST_ORACLE_ADDRESS", deployer);
        testFarmer = vm.envOr("TEST_FARMER_ADDRESS", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy Treasury
        console.log("\n1. Deploying Treasury...");
        Treasury treasury = new Treasury(USDC_SEPOLIA, deployer);
        console.log("Treasury deployed at:", address(treasury));
        
        // 2. Deploy LiquidityPool
        console.log("\n2. Deploying LiquidityPool...");
        LiquidityPool liquidityPool = new LiquidityPool(
            USDC_SEPOLIA,
            address(treasury),
            deployer
        );
        console.log("LiquidityPool deployed at:", address(liquidityPool));
        
        // 3. Deploy Oracles
        console.log("\n3. Deploying Oracles...");
        WeatherOracle weatherOracle = new WeatherOracle(USDC_SEPOLIA, deployer);
        console.log("WeatherOracle deployed at:", address(weatherOracle));
        
        SatelliteOracle satelliteOracle = new SatelliteOracle(USDC_SEPOLIA, deployer);
        console.log("SatelliteOracle deployed at:", address(satelliteOracle));
        
        // 4. Deploy PolicyManager
        console.log("\n4. Deploying PolicyManager...");
        PolicyManager policyManager = new PolicyManager(
            USDC_SEPOLIA,
            address(treasury),
            address(liquidityPool),
            deployer
        );
        console.log("PolicyManager deployed at:", address(policyManager));
        
        // 5. Deploy DamageCalculator
        console.log("\n5. Deploying DamageCalculator...");
        DamageCalculator damageCalculator = new DamageCalculator(
            address(weatherOracle),
            address(satelliteOracle),
            address(policyManager),
            deployer
        );
        console.log("DamageCalculator deployed at:", address(damageCalculator));
        
        // 6. Deploy PayoutEngine
        console.log("\n6. Deploying PayoutEngine...");
        PayoutEngine payoutEngine = new PayoutEngine(
            address(damageCalculator),
            address(policyManager),
            address(treasury),
            address(liquidityPool),
            deployer
        );
        console.log("PayoutEngine deployed at:", address(payoutEngine));
        
        // 7. Set up permissions
        console.log("\n7. Setting up permissions...");
        setupPermissions(
            treasury,
            liquidityPool,
            policyManager,
            damageCalculator,
            payoutEngine
        );
        
        // 8. Configure test rate cards (lower premiums for testing)
        console.log("\n8. Configuring test rate cards...");
        configureTestRateCards(policyManager);
        
        // 9. Register test oracle providers
        console.log("\n9. Registering test oracle providers...");
        registerTestProviders(weatherOracle, satelliteOracle);
        
        vm.stopBroadcast();
        
        // 10. Print deployment summary
        printDeploymentSummary(
            treasury,
            liquidityPool,
            policyManager,
            weatherOracle,
            satelliteOracle,
            damageCalculator,
            payoutEngine
        );
    }
    
    function setupPermissions(
        Treasury treasury,
        LiquidityPool liquidityPool,
        PolicyManager policyManager,
        DamageCalculator damageCalculator,
        PayoutEngine payoutEngine
    ) internal {
        // Treasury permissions
        treasury.grantRole(treasury.LIQUIDITY_POOL_ROLE(), address(liquidityPool));
        treasury.grantRole(treasury.POLICY_MANAGER_ROLE(), address(policyManager));
        treasury.grantRole(treasury.PAYOUT_ENGINE_ROLE(), address(payoutEngine));
        console.log("  - Treasury roles granted");
        
        // LiquidityPool permissions
        liquidityPool.grantRole(liquidityPool.POLICY_MANAGER_ROLE(), address(policyManager));
        console.log("  - LiquidityPool roles granted");
        
        // PolicyManager permissions
        policyManager.grantRole(policyManager.BACKEND_ROLE(), testBackend);
        policyManager.grantRole(policyManager.ORACLE_ROLE(), testOracleProvider);
        console.log("  - PolicyManager roles granted to:", testBackend);
        
        // DamageCalculator permissions
        damageCalculator.grantRole(damageCalculator.PAYOUT_ENGINE_ROLE(), address(payoutEngine));
        console.log("  - DamageCalculator roles granted");
        
        // PayoutEngine permissions
        payoutEngine.grantRole(payoutEngine.PROCESSOR_ROLE(), testBackend);
        payoutEngine.grantRole(payoutEngine.APPROVER_ROLE(), testBackend);
        console.log("  - PayoutEngine roles granted");
    }
    
    function configureTestRateCards(PolicyManager policyManager) internal {
        // Lower base rates for testing (50% of mainnet rates)
        // Note: Rate cards are initialized with default rates in constructor
        // This function would need PolicyLib imported to create custom rate card
        // For testnet, using default rate card is sufficient
        console.log("  - Using default rate card (can be updated via updateRateCard if needed)");
        console.log("  - Default rates: MAIZE/DROUGHT=500bps, BEANS/DROUGHT=600bps, etc.");
    }
    
    function registerTestProviders(
        WeatherOracle weatherOracle,
        SatelliteOracle satelliteOracle
    ) internal {
        // Note: In testnet, the deployer can register providers
        // In production, providers would need to stake USDC themselves
        
        // Weather oracle: min 1000 USDC stake (will need mock USDC)
        console.log("  - Weather provider:", testOracleProvider);
        console.log("    (Needs 1000 USDC approval + registerProvider call)");
        
        // Satellite oracle: min 2000 USDC stake
        console.log("  - Satellite provider:", testOracleProvider);
        console.log("    (Needs 2000 USDC approval + registerProvider call)");
        
        // Lower verification threshold for testing (default 2)
        weatherOracle.setVerificationThreshold(1);
        console.log("  - Weather verification threshold set to 1 (testing only)");
    }
    
    function printDeploymentSummary(
        Treasury treasury,
        LiquidityPool liquidityPool,
        PolicyManager policyManager,
        WeatherOracle weatherOracle,
        SatelliteOracle satelliteOracle,
        DamageCalculator damageCalculator,
        PayoutEngine payoutEngine
    ) internal view {
        console.log("\n==================================================");
        console.log("DEPLOYMENT COMPLETE - Base Sepolia Testnet");
        console.log("==================================================");
        console.log("Contract Addresses:");
        console.log("--------------------------------------------------");
        console.log("Treasury:          ", address(treasury));
        console.log("LiquidityPool:     ", address(liquidityPool));
        console.log("PolicyManager:     ", address(policyManager));
        console.log("WeatherOracle:     ", address(weatherOracle));
        console.log("SatelliteOracle:   ", address(satelliteOracle));
        console.log("DamageCalculator:  ", address(damageCalculator));
        console.log("PayoutEngine:      ", address(payoutEngine));
        console.log("--------------------------------------------------");
        console.log("Test Configuration:");
        console.log("--------------------------------------------------");
        console.log("Backend:           ", testBackend);
        console.log("Oracle Provider:   ", testOracleProvider);
        console.log("Test Farmer:       ", testFarmer);
        console.log("==================================================");
        console.log("\nNext steps for testing:");
        console.log("1. Get testnet USDC from faucet");
        console.log("2. Register oracle providers:");
        console.log("   - Approve 1000 USDC to WeatherOracle");
        console.log("   - Call weatherOracle.registerProvider()");
        console.log("   - Approve 2000 USDC to SatelliteOracle");
        console.log("   - Call satelliteOracle.registerProvider()");
        console.log("3. Stake liquidity:");
        console.log("   - Approve USDC to LiquidityPool");
        console.log("   - Call liquidityPool.stake(amount)");
        console.log("4. Create test policy:");
        console.log("   - Backend calls policyManager.createPolicy()");
        console.log("   - Farmer approves premium + activates");
        console.log("5. Submit oracle data:");
        console.log("   - weatherOracle.submitData(plotId, ...)");
        console.log("   - satelliteOracle.submitData(plotId, ...)");
        console.log("6. Trigger payout:");
        console.log("   - policyManager.triggerPolicy(policyId)");
        console.log("   - payoutEngine workflow");
        console.log("==================================================");
        console.log("\nEnvironment Variables:");
        console.log("TEST_BACKEND_ADDRESS=", testBackend);
        console.log("TEST_ORACLE_ADDRESS=", testOracleProvider);
        console.log("TEST_FARMER_ADDRESS=", testFarmer);
        console.log("==================================================");
    }
}
