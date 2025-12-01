# MicroCrop Smart Contracts

Solidity smart contracts for **MicroCrop** parametric crop insurance platform on **Base (Ethereum L2)**.

## 🎯 Overview

MicroCrop enables smallholder farmers to access parametric crop insurance backed by weather and satellite data. Smart contracts handle:
- **Policy Management**: Create, activate, and trigger insurance policies
- **Liquidity Pools**: Manage USDC liquidity from providers
- **Oracle Integration**: Verify weather and satellite data
- **Automated Payouts**: Calculate and execute claim payouts
- **Treasury Management**: Handle premiums and reserves

## 🏗️ Architecture

```
┌─────────────────┐
│  PolicyManager  │ - Policy lifecycle
└────────┬────────┘
         │
    ┌────▼────┐
    │Treasury │ - Fund management
    └────┬────┘
         │
┌────────▼────────┐
│ LiquidityPool   │ - USDC staking
└────────┬────────┘
         │
    ┌────▼────────┐
    │PayoutEngine │ - Claim execution
    └────┬────────┘
         │
    ┌────▼────────────────┐
    │ DamageCalculator    │
    └─────┬───────┬───────┘
          │       │
  ┌───────▼─┐ ┌──▼────────────┐
  │Weather  │ │Satellite      │
  │Oracle   │ │Oracle         │
  └─────────┘ └───────────────┘
```

## 📂 Project Structure

```
Contracts/
├── src/
│   ├── core/
│   │   ├── PolicyManager.sol      - Policy lifecycle management
│   │   ├── LiquidityPool.sol      - USDC liquidity management
│   │   ├── PayoutEngine.sol       - Automated payout execution
│   │   └── Treasury.sol           - Treasury & reserves
│   ├── oracles/
│   │   ├── WeatherOracle.sol      - Weather data verification
│   │   ├── SatelliteOracle.sol    - Satellite/NDVI data
│   │   └── DamageCalculator.sol   - Damage assessment
│   ├── interfaces/
│   │   ├── IPolicyManager.sol
│   │   ├── ILiquidityPool.sol
│   │   ├── IOracle.sol
│   │   └── IPayoutEngine.sol
│   └── libraries/
│       ├── PolicyLib.sol          - Policy calculations
│       ├── DamageLib.sol          - Damage calculations
│       └── MathLib.sol            - Math utilities
├── script/
│   ├── Deploy.s.sol               - Mainnet deployment
│   └── DeployTestnet.s.sol        - Testnet deployment
└── test/
    ├── unit/                      - Unit tests
    └── integration/               - Integration tests
```

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js (for backend integration)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Contracts

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test -vvv

# Generate gas report
forge test --gas-report
```

### Setup Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your keys
nano .env
```

## 🧪 Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testCreatePolicy -vvv

# Run specific contract tests
forge test --match-contract PolicyManagerTest

# Generate coverage report
forge coverage

# Fuzz testing (automatically included)
forge test --fuzz-runs 1000
```

## 📦 Deployment

### Testnet Deployment (Base Sepolia)

```bash
# Deploy to Base Sepolia
forge script script/DeployTestnet.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify \
  --private-key $PRIVATE_KEY

# Verify contracts
forge verify-contract <CONTRACT_ADDRESS> <CONTRACT_NAME> \
  --chain base-sepolia \
  --etherscan-api-key $BASESCAN_API_KEY
```

### Mainnet Deployment (Base)

```bash
# Deploy to Base Mainnet
forge script script/Deploy.s.sol \
  --rpc-url $BASE_MAINNET_RPC \
  --broadcast \
  --verify \
  --private-key $PRIVATE_KEY \
  --slow  # Add delay between transactions
```

## 🔐 Security

### Access Control
- **Admin Role**: Contract upgrades, emergency functions
- **Oracle Role**: Submit weather/satellite data
- **Trigger Role**: Trigger policy payouts

### Security Features
- OpenZeppelin AccessControl
- ReentrancyGuard on state-changing functions
- Pausable for emergency stops
- Signature verification for oracle data
- Time locks for critical operations

### Auditing
- [ ] Internal review
- [ ] External audit
- [ ] Bug bounty program

## 💰 Token Integration

**USDC on Base**
- **Mainnet**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Testnet**: Configure in `.env`

All premiums and payouts are in USDC (6 decimals).

## 📊 Key Metrics

### Damage Assessment
```
damageIndex = (weatherStressIndex × 60%) + (vegetationIndex × 40%)
```

### Payout Calculation
- **< 30% damage**: No payout
- **30-60% damage**: 30-70% payout (linear)
- **> 60% damage**: 100% payout

### Gas Optimization
- Policy creation: < 200k gas
- Batch payouts: < 50k gas per payout
- Oracle data submission: < 100k gas

## 🔗 Integration

### Backend Integration

The contracts integrate with the MicroCrop backend for:
- Policy creation triggered by USSD flow
- Oracle data submission from WeatherXM and Spexi
- Payout confirmation with M-Pesa (Swypt)

See `../backend/` for backend integration code.

### Oracle Data Flow

```
1. WeatherXM/Spexi → Backend Oracle Service
2. Oracle Service → Sign data with private key
3. Submit to WeatherOracle/SatelliteOracle contracts
4. DamageCalculator reads oracle data
5. Triggers PayoutEngine if damage threshold met
```

## 🛠️ Development

### Useful Commands

```bash
# Format code
forge fmt

# Lint
forge fmt --check

# Local blockchain
anvil

# Interactive console
chisel

# Generate docs
forge doc --serve
```

### Contract Interaction

```bash
# Read contract
cast call $CONTRACT_ADDRESS "isPolicyActive(uint256)" 1

# Write contract
cast send $CONTRACT_ADDRESS \
  "createPolicy(...)" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

# Check balance
cast balance $ADDRESS --rpc-url $RPC_URL
```

## 📖 Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Foundry Book](https://book.getfoundry.sh/)
- [Base Documentation](https://docs.base.org/)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/)

## 🤝 Contributing

1. Create feature branch
2. Write tests (>95% coverage required)
3. Run formatter: `forge fmt`
4. Submit PR with description

## 📄 License

MIT License - see LICENSE file

## 🔧 Troubleshooting

### Common Issues

**Build fails:**
```bash
forge clean
forge build
```

**Test fails:**
```bash
# Run with more verbosity
forge test -vvvv

# Run specific test
forge test --match-test testName -vvv
```

**Deployment fails:**
```bash
# Check RPC connection
cast block-number --rpc-url $RPC_URL

# Check gas price
cast gas-price --rpc-url $RPC_URL
```

## 📞 Support

For questions or issues:
- Check [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- Review backend integration docs
- Contact development team

---

**Status**: 🚧 **Under Development**

**Network**: Base (Ethereum L2)

**Last Updated**: November 5, 2025
