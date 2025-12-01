# Smart Contracts Documentation

Welcome to the MicroCrop Smart Contracts documentation. This directory contains comprehensive documentation for the Solidity smart contracts that power the on-chain insurance system on Base L2.

## 📚 Documentation Structure

### Guides (`docs/guides/`)
Practical guides for deployment, testing, and reference.

- **[Deployment Guide](guides/DEPLOYMENT_GUIDE.md)** - Deploy contracts to Base L2
- **[Testing Guide](guides/TESTING_GUIDE.md)** - Test contracts with Foundry
- **[Quick Reference](guides/QUICK_REFERENCE.md)** - Quick reference for common tasks

### Implementation Details (`docs/implementation/`)
Technical implementation documentation and progress reports.

- **[Implementation Complete](implementation/IMPLEMENTATION_COMPLETE.md)** - Completion report
- **[Implementation Plan](implementation/IMPLEMENTATION_PLAN.md)** - Original implementation plan
- **[Implementation Status](implementation/IMPLEMENTATION_STATUS.md)** - Current status
- **[Implementation Summary](implementation/IMPLEMENTATION_SUMMARY.md)** - Summary overview
- **[Progress Report](implementation/PROGRESS_REPORT.md)** - Development progress
- **[Deprecated Contracts](implementation/DEPRECATED_CONTRACTS.md)** - Archived contracts

## 🚀 Quick Start

1. **Installation**: Install Foundry
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Setup**: Install dependencies
   ```bash
   forge install
   ```

3. **Test**: Run test suite
   ```bash
   forge test
   ```

4. **Deploy**: Deploy to Base Sepolia testnet
   ```bash
   forge script script/DeployTestnet.s.sol --rpc-url base-sepolia --broadcast
   ```

5. **Verify**: Verify on Basescan
   ```bash
   forge verify-contract <address> src/core/ClaimContract.sol:ClaimContract --chain base-sepolia
   ```

## 🔑 Key Features

### Core Contracts

#### **PolicyContract.sol**
- Create insurance policies for farmers
- Define coverage terms and premiums
- Set claim conditions (weather events, damage thresholds)
- Support USDC premium payments on Base L2
- Policy lifecycle management

#### **ClaimContract.sol**
- Submit claims against active policies
- Automated verification via oracles
- Multi-step approval workflow
- USDC payout processing on Base L2
- Claim status tracking

#### **CooperativeRegistry.sol**
- Register agricultural cooperatives
- Manage cooperative membership
- Role-based access control
- Cooperative verification

### Oracle Integration

#### **WeatherOracle.sol**
- Integrate WeatherXM weather data
- Verify weather-based claims
- Decentralized weather event validation
- Chainlink oracle integration

#### **SatelliteOracle.sol**
- Integrate Planet Labs satellite imagery
- Verify crop damage claims
- NDVI-based damage assessment
- Automated claim verification

### Libraries

#### **InsuranceLibrary.sol**
- Premium calculation algorithms
- Risk assessment formulas
- Payout calculation logic
- Shared utility functions

#### **ValidationLibrary.sol**
- Input validation
- Data verification
- Security checks
- Common validators

## 🏗️ Architecture

```
Contracts/
├── src/
│   ├── core/                    # Core insurance contracts
│   │   ├── PolicyContract.sol   # Policy management
│   │   ├── ClaimContract.sol    # Claim processing
│   │   └── CooperativeRegistry.sol
│   ├── oracles/                 # Oracle integrations
│   │   ├── WeatherOracle.sol    # Weather data oracle
│   │   └── SatelliteOracle.sol  # Satellite imagery oracle
│   ├── libraries/               # Shared libraries
│   │   ├── InsuranceLibrary.sol
│   │   └── ValidationLibrary.sol
│   └── interfaces/              # Contract interfaces
│       ├── IPolicy.sol
│       ├── IClaim.sol
│       └── IOracle.sol
├── test/                        # Foundry tests
├── script/                      # Deployment scripts
│   ├── Deploy.s.sol            # Mainnet deployment
│   └── DeployTestnet.s.sol     # Testnet deployment
├── lib/                         # Dependencies
└── docs/                        # This documentation
```

## 📊 Tech Stack

- **Framework**: Foundry (Forge, Anvil, Cast)
- **Language**: Solidity ^0.8.20
- **Network**: Base L2 (Ethereum L2)
- **Payment Token**: USDC (Native on Base)
- **Oracles**: Chainlink (for external data)
- **Testing**: Forge test suite
- **Gas Optimization**: Optimized for L2 efficiency

### Dependencies

```toml
[dependencies]
openzeppelin-contracts = "5.0.0"
chainlink = "1.0.0"
forge-std = "1.7.0"
```

## 🔗 Contract Addresses

### Base Mainnet (Production)
- **USDC Token**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **PolicyContract**: `TBD - Not deployed yet`
- **ClaimContract**: `TBD - Not deployed yet`
- **CooperativeRegistry**: `TBD - Not deployed yet`

### Base Sepolia (Testnet)
- **USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **PolicyContract**: Check deployment guide
- **ClaimContract**: Check deployment guide
- **CooperativeRegistry**: Check deployment guide

## 🔐 Key Concepts

### Policy Lifecycle
1. **Created**: Cooperative creates policy
2. **Active**: Policy is active after premium payment
3. **Claimed**: Farmer submits claim
4. **Verified**: Oracle verifies claim data
5. **Approved/Rejected**: Admin approves or rejects claim
6. **Paid**: USDC payout transferred to farmer
7. **Expired**: Policy expires if unused

### Claim Verification
1. **Submission**: Farmer submits claim with evidence
2. **Oracle Check**: Weather and satellite oracles verify data
3. **Automated Score**: AI/ML damage assessment
4. **Manual Review**: Admin reviews high-value claims
5. **Approval**: Claim approved and payment processed
6. **Payout**: USDC transferred to farmer's wallet

### USDC Integration
- **Base Native**: USDC is native on Base L2
- **Premium Payments**: Cooperatives pay premiums in USDC
- **Claim Payouts**: Farmers receive payouts in USDC
- **Low Fees**: Base L2 offers low transaction costs
- **Fast Settlement**: Quick confirmation times

## 🧪 Testing

### Run All Tests
```bash
forge test
```

### Run Specific Test
```bash
forge test --match-contract PolicyContractTest
forge test --match-test testCreatePolicy
```

### Gas Report
```bash
forge test --gas-report
```

### Coverage Report
```bash
forge coverage
```

### Invariant Testing
```bash
forge test --match-test invariant
```

## 🚀 Deployment

### Deploy to Base Sepolia Testnet
```bash
# Set environment variables
export PRIVATE_KEY="your-private-key"
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"

# Deploy
forge script script/DeployTestnet.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### Deploy to Base Mainnet
```bash
# Set environment variables
export PRIVATE_KEY="your-private-key"
export BASE_MAINNET_RPC_URL="https://mainnet.base.org"

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url $BASE_MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

## 🔧 Development

### Compile Contracts
```bash
forge build
```

### Format Code
```bash
forge fmt
```

### Static Analysis
```bash
slither .
```

### Local Development
```bash
# Start local Anvil node
anvil

# Deploy to local node
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

## 📈 Gas Optimization

### Current Gas Costs (Base L2)
- Create Policy: ~150,000 gas (~$0.10)
- Submit Claim: ~100,000 gas (~$0.07)
- Approve Claim: ~80,000 gas (~$0.05)
- Process Payment: ~65,000 gas (~$0.04)

### Optimization Techniques
- Pack storage variables
- Use `calldata` instead of `memory`
- Batch operations where possible
- Minimize storage writes
- Use events for historical data

## 🔒 Security

### Security Features
- OpenZeppelin security contracts
- Access control (Ownable, AccessControl)
- Reentrancy guards
- Pausable functionality
- Input validation
- Safe math (Solidity 0.8+)

### Audits
- **Status**: Not audited yet
- **Recommended**: Full security audit before mainnet
- **Tools**: Slither, Mythril, Echidna

### Best Practices
- Follow Checks-Effects-Interactions pattern
- Use latest OpenZeppelin contracts
- Comprehensive test coverage (>90%)
- Formal verification for critical functions
- Multi-sig for admin functions

## 📝 Contract Interactions

### Create Policy
```solidity
// Approve USDC
USDC.approve(policyContractAddress, premiumAmount);

// Create policy
policyContract.createPolicy(
    farmerId,
    coverageAmount,
    premiumAmount,
    coverageType,
    startDate,
    endDate
);
```

### Submit Claim
```solidity
claimContract.submitClaim(
    policyId,
    claimAmount,
    claimType,
    evidence // IPFS hash
);
```

### Verify Claim (Oracle)
```solidity
weatherOracle.verifyWeatherEvent(
    claimId,
    weatherStationId,
    eventType,
    eventData
);

satelliteOracle.verifyCropDamage(
    claimId,
    satelliteImageHash,
    ndviScore,
    damagePercentage
);
```

### Approve Claim (Admin)
```solidity
claimContract.approveClaim(claimId);
// USDC automatically transferred to farmer
```

## 🔗 Related Documentation

- **Backend**: See `backend/docs/` for off-chain API
- **Dashboard**: See `dashboard/docs/` for frontend integration
- **Data Processor**: See `data-processor/docs/` for oracle services

## 📞 Support

For questions or issues:
1. Check [Deployment Guide](guides/DEPLOYMENT_GUIDE.md) for setup help
2. Review [Testing Guide](guides/TESTING_GUIDE.md) for test instructions
3. See [Quick Reference](guides/QUICK_REFERENCE.md) for common tasks
4. Review [Implementation Docs](implementation/) for technical details

## 🎯 Development Roadmap

### Phase 1: Core Contracts ✅
- [x] PolicyContract implementation
- [x] ClaimContract implementation
- [x] CooperativeRegistry implementation
- [x] Basic test coverage

### Phase 2: Oracle Integration ✅
- [x] WeatherOracle contract
- [x] SatelliteOracle contract
- [x] Chainlink integration
- [x] Oracle test coverage

### Phase 3: Optimization 🔄
- [ ] Gas optimization
- [ ] Security audit
- [ ] Mainnet deployment preparation
- [ ] Multi-sig setup

### Phase 4: Advanced Features 📋
- [ ] Parametric insurance triggers
- [ ] Automated claim approval (low-risk)
- [ ] Policy marketplace
- [ ] Staking/liquidity pools

## 🌍 Network Information

### Base L2
- **Chain ID**: 8453 (Mainnet), 84532 (Sepolia)
- **RPC URL**: https://mainnet.base.org
- **Explorer**: https://basescan.org
- **Faucet** (Testnet): https://faucet.quicknode.com/base/sepolia

### Why Base L2?
- **Low Fees**: ~100x cheaper than Ethereum mainnet
- **Fast**: 2-second block times
- **Coinbase**: Built by Coinbase, high reliability
- **USDC Native**: Native USDC support
- **EVM Compatible**: Full Solidity support
- **Growing Ecosystem**: Strong DeFi ecosystem

---

**Last Updated**: December 1, 2025  
**Solidity Version**: ^0.8.20  
**Network**: Base L2  
**Status**: Ready for Testnet Deployment
