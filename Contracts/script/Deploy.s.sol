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

/**
 * @title Deploy
 * @notice Deployment script for MicroCrop insurance platform on Base mainnet
 * @dev Run with: forge script script/Deploy.s.sol:Deploy --rpc-url base --broadcast --verify
 */
contract Deploy is Script {
    // Base mainnet USDC address
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    
    function run() external {
        // Load deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying MicroCrop contracts to Base mainnet...");
        console.log("Deployer address:", deployer);
        console.log("USDC address:", USDC_BASE);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy Treasury
        console.log("\n1. Deploying Treasury...");
        Treasury treasury = new Treasury(USDC_BASE, deployer);
        console.log("Treasury deployed at:", address(treasury));
        
        // 2. Deploy LiquidityPool
        console.log("\n2. Deploying LiquidityPool...");
        LiquidityPool liquidityPool = new LiquidityPool(
            USDC_BASE,
            address(treasury),
            deployer
        );
        console.log("LiquidityPool deployed at:", address(liquidityPool));
        
        // 3. Deploy Oracles
        console.log("\n3. Deploying Oracles...");
        WeatherOracle weatherOracle = new WeatherOracle(USDC_BASE, deployer);
        console.log("WeatherOracle deployed at:", address(weatherOracle));
        
        SatelliteOracle satelliteOracle = new SatelliteOracle(USDC_BASE, deployer);
        console.log("SatelliteOracle deployed at:", address(satelliteOracle));
        
        // 4. Deploy PolicyManager (placeholder, needs calculator)
        console.log("\n4. Deploying PolicyManager...");
        PolicyManager policyManager = new PolicyManager(
            USDC_BASE,
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
        
        // Treasury permissions
        treasury.grantRole(treasury.LIQUIDITY_POOL_ROLE(), address(liquidityPool));
        treasury.grantRole(treasury.POLICY_MANAGER_ROLE(), address(policyManager));
        treasury.grantRole(treasury.PAYOUT_ENGINE_ROLE(), address(payoutEngine));
        console.log("Treasury roles granted");
        
        // LiquidityPool permissions
        liquidityPool.grantRole(liquidityPool.POLICY_MANAGER_ROLE(), address(policyManager));
        console.log("LiquidityPool roles granted");
        
        // PolicyManager permissions (backend will be set separately)
        policyManager.grantRole(policyManager.ORACLE_ROLE(), deployer);
        console.log("PolicyManager roles granted");
        
        // DamageCalculator permissions
        damageCalculator.grantRole(damageCalculator.PAYOUT_ENGINE_ROLE(), address(payoutEngine));
        console.log("DamageCalculator roles granted");
        
        vm.stopBroadcast();
        
        // 8. Print deployment summary
        console.log("\n==================================================");
        console.log("DEPLOYMENT COMPLETE - Base Mainnet");
        console.log("==================================================");
        console.log("Treasury:          ", address(treasury));
        console.log("LiquidityPool:     ", address(liquidityPool));
        console.log("PolicyManager:     ", address(policyManager));
        console.log("WeatherOracle:     ", address(weatherOracle));
        console.log("SatelliteOracle:   ", address(satelliteOracle));
        console.log("DamageCalculator:  ", address(damageCalculator));
        console.log("PayoutEngine:      ", address(payoutEngine));
        console.log("==================================================");
        console.log("\nNext steps:");
        console.log("1. Verify contracts on Basescan");
        console.log("2. Grant BACKEND_ROLE to backend server");
        console.log("3. Register initial oracle providers");
        console.log("4. Fund treasury reserves");
        console.log("5. Test with small pilot policies");
    }
}
