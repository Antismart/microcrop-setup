# MicroCrop Smart Contracts - Implementation Guide

**Date**: November 7, 2025  
**Status**: 🚧 In Progress  
**Foundry Project**: Ready  
**OpenZeppelin**: ✅ Installed (v5.5.0)

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Interfaces & Libraries) ✅ STARTED

- [x] Install OpenZeppelin contracts
- [x] Create directory structure
- [x] IPolicyManager interface ✅ CREATED
- [ ] ILiquidityPool interface
- [ ] IOracle interface
- [ ] IPayoutEngine interface
- [ ] ITreasury interface
- [ ] MathLib library
- [ ] PolicyLib library
- [ ] DamageLib library

### Phase 2: Core Contracts

- [ ] PolicyManager contract
- [ ] LiquidityPool contract
- [ ] Treasury contract
- [ ] PayoutEngine contract

### Phase 3: Oracle Contracts

- [ ] WeatherOracle contract
- [ ] SatelliteOracle contract
- [ ] DamageCalculator contract

### Phase 4: Testing

- [ ] Unit tests for PolicyManager
- [ ] Unit tests for LiquidityPool
- [ ] Unit tests for PayoutEngine
- [ ] Integration test: Full flow
- [ ] Fuzzing test: Damage calculator
- [ ] Coverage > 95%

### Phase 5: Deployment

- [ ] Deploy.s.sol script
- [ ] DeployTestnet.s.sol script
- [ ] Update foundry.toml
- [ ] Create .env from .env.example
- [ ] Deploy to Base Sepolia
- [ ] Verify contracts on Basescan

---

## 🏗️ Project Structure (Current)

```
Contracts/
├── lib/
│   ├── forge-std/              ✅ Installed
│   └── openzeppelin-contracts/ ✅ Installed (v5.5.0)
├── src/
│   ├── core/                   📁 Created
│   ├── oracles/                📁 Created
│   ├── interfaces/             📁 Created
│   │   └── IPolicyManager.sol  ✅ Implemented
│   ├── libraries/              📁 Created
│   └── utils/                  📁 Created
├── test/
│   ├── unit/                   📁 Created
│   ├── integration/            📁 Created
│   └── fuzzing/                📁 Created
├── script/                     📁 Exists
├── foundry.toml                📝 Needs update
└── .env.example                📝 Exists
```

---

## 📝 Next Steps (Immediate)

### Step 1: Complete Interfaces

Create remaining interface files:

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/Contracts/src/interfaces

# Files to create:
# - ILiquidityPool.sol
# - IOracle.sol  
# - IPayoutEngine.sol
# - ITreasury.sol
```

### Step 2: Implement Libraries

Create library files in `src/libraries/`:

```solidity
// MathLib.sol - Mathematical utilities
// PolicyLib.sol - Policy calculations
// DamageLib.sol - Damage assessment utilities
```

### Step 3: Implement Core Contracts

Priority order:
1. **Treasury.sol** - Manages reserves
2. **LiquidityPool.sol** - LP staking and capital management
3. **PolicyManager.sol** - Policy lifecycle
4. **PayoutEngine.sol** - Automated payouts

### Step 4: Implement Oracle Contracts

1. **WeatherOracle.sol** - Weather data verification
2. **SatelliteOracle.sol** - NDVI/vegetation data
3. **DamageCalculator.sol** - Damage index calculation

---

## 🔧 Implementation Commands

### Build & Test

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/Contracts

# Build contracts
forge build

# Run all tests
forge test -vvv

# Run specific test file
forge test --match-path test/unit/PolicyManager.t.sol -vvv

# Gas report
forge test --gas-report

# Coverage
forge coverage

# Format code
forge fmt
```

### Deployment

```bash
# Load environment variables
source .env

# Deploy to testnet
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY

# Verify specific contract
forge verify-contract \
  --chain-id 84532 \
  --compiler-version v0.8.20 \
  <CONTRACT_ADDRESS> \
  src/core/PolicyManager.sol:PolicyManager
```

---

## 📚 Key Implementation Notes

### Gas Optimization

- Use `calldata` instead of `memory` for function parameters
- Pack struct variables (use uint256, uint128, uint64 strategically)
- Use `unchecked{}` blocks for safe arithmetic
- Implement batch operations
- Use events instead of storage for historical data
- Optimize loops with early exits

### Security Best Practices

- ✅ Use OpenZeppelin's AccessControl for roles
- ✅ Implement ReentrancyGuard on all state-changing functions
- ✅ Add Pausable for emergency stops
- ✅ Validate all oracle signatures
- ✅ Use pull pattern for withdrawals
- ✅ Time locks for critical operations
- ✅ Comprehensive input validation

### Testing Strategy

**Unit Tests** (>80% coverage):
- Test each function in isolation
- Test edge cases and error conditions
- Test access control
- Test state transitions

**Integration Tests** (End-to-end flows):
- Policy creation → activation → trigger → payout
- LP staking → premium collection → reward claiming
- Oracle data submission → damage calculation → payout

**Fuzzing Tests** (Mathematical correctness):
- Damage calculation with random inputs
- Premium calculation validation
- Payout percentage calculation
- LP share calculation

### Contract Interaction Flow

```
1. Treasury.sol (Manages reserves)
   ↓
2. LiquidityPool.sol (LP stakes USDC)
   ↓
3. PolicyManager.sol (Farmer creates policy)
   ↓
4. WeatherOracle.sol (Submits weather data)
   ↓
5. SatelliteOracle.sol (Submits NDVI data)
   ↓
6. DamageCalculator.sol (Calculates damage index)
   ↓
7. PayoutEngine.sol (Executes payout)
   ↓
8. Treasury.sol (Releases funds)
```

---

## 🎯 Success Criteria

### Compilation
- [x] All contracts compile without errors
- [ ] No compiler warnings
- [ ] Optimizer enabled (200 runs)

### Testing
- [ ] >95% code coverage
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Fuzzing tests passing (256 runs)
- [ ] Gas costs optimized:
  - Policy creation: <200k gas
  - Policy activation: <100k gas
  - LP stake: <150k gas
  - Payout execution: <250k gas

### Security
- [ ] All functions have access control
- [ ] Reentrancy guards on critical functions
- [ ] Emergency pause implemented
- [ ] No floating pragmas
- [ ] External audit (planned)

### Deployment
- [ ] Successful testnet deployment
- [ ] All contracts verified on Basescan
- [ ] Integration with backend oracle
- [ ] Test transactions executed

---

## 🔗 Resources

### Documentation
- Foundry Book: https://book.getfoundry.sh/
- OpenZeppelin Docs: https://docs.openzeppelin.com/contracts/5.x/
- Base Network: https://docs.base.org/

### Testing Tools
- Forge Test: https://book.getfoundry.sh/forge/tests
- Forge Coverage: https://book.getfoundry.sh/reference/forge/forge-coverage
- Forge Fuzz: https://book.getfoundry.sh/forge/fuzz-testing

### Base Network (Ethereum L2)
- Sepolia RPC: https://sepolia.base.org
- Mainnet RPC: https://mainnet.base.org
- Explorer: https://basescan.org
- Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

### USDC on Base
- Sepolia: Deploy mock or use official test token
- Mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

---

## 🚀 Quick Start for Continuation

To continue implementation, use the contracts.md specifications and:

1. **Implement remaining interfaces** based on contracts.md
2. **Create library contracts** (MathLib, PolicyLib, DamageLib)
3. **Implement core contracts** one by one
4. **Write tests** alongside each contract
5. **Deploy to testnet** and verify
6. **Integrate with backend** oracle system

Each contract should follow this structure:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/...";
import "../interfaces/...";
import "../libraries/...";

contract ContractName {
    // State variables
    // Events
    // Modifiers
    // Constructor
    // External functions
    // Public functions
    // Internal functions
    // Private functions
    // View functions
}
```

---

## 📞 Support

- **Documentation**: See contracts.md for full specifications
- **Foundry Help**: `forge --help`
- **OpenZeppelin**: https://docs.openzeppelin.com

---

**Status**: Foundation complete, ready for core contract implementation  
**Next**: Implement ILiquidityPool, IOracle, IPayoutEngine interfaces  
**Priority**: Core contracts (Treasury → LiquidityPool → PolicyManager → PayoutEngine)
