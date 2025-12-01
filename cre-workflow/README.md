# MicroCrop CRE Workflow

Automated damage assessment workflow for MicroCrop parametric crop insurance using Chainlink Runtime Environment (CRE).

## 🌟 Overview

This workflow replaces manual claim filing with **fully automated damage detection**:

- **Daily Monitoring**: Cron trigger checks all active policies at 00:00 UTC
- **Data Collection**: Fetches weather data from WeatherXM and satellite NDVI from Planet Labs
- **Damage Calculation**: Computes damage using 60% weather + 40% satellite formula
- **Automatic Payouts**: Submits signed reports on-chain when damage exceeds threshold
- **Privacy-Preserving**: All sensitive data (GPS coordinates, raw weather) stays off-chain

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js 18+** or **Bun** installed
2. **Base Sepolia testnet ETH** (for gas fees)
   - Get from [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet)
3. **API Keys**:
   - WeatherXM API key (register at [weatherxm.com](https://weatherxm.com))
   - Planet Labs API key (register at [planet.com](https://planet.com))
4. **CRE Early Access** (for production deployment)
   - Request at [cre.chain.link/request-access](https://cre.chain.link/request-access)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd cre-workflow
bun install  # or: npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Ethereum private key (64 hex chars, NO 0x prefix)
CRE_ETH_PRIVATE_KEY=your_private_key_here

# API Keys
WEATHERXM_API_KEY=your_weatherxm_key_here
PLANET_API_KEY=your_planet_key_here
```

**⚠️ Security Warning**: Never commit `.env` to version control!

### 3. Deploy Contracts

First, deploy the `PayoutReceiver.sol` contract to Base Sepolia:

```bash
cd ../Contracts
forge build
forge create src/core/PayoutReceiver.sol:PayoutReceiver \
  --rpc-url https://sepolia.base.org \
  --private-key YOUR_PRIVATE_KEY \
  --constructor-args ADDRESS_OF_KEYSTONE_FORWARDER
```

### 4. Update Configuration

Edit `damage-assessment-workflow/config.staging.json`:

```json
{
  "policyManagerAddress": "0x...",  // Your deployed PolicyManager address
  "payoutReceiverAddress": "0x...", // Your deployed PayoutReceiver address
  ...
}
```

### 5. Run Local Simulation

Test the workflow locally before deploying:

```bash
bun run simulate
```

Expected output:
```
🚀 MicroCrop Damage Assessment Workflow Started
📅 Timestamp: 2024-01-15T00:00:00.000Z
🌐 Network: base-testnet-sepolia
📋 Found 3 active policies to assess

🔍 Assessing Policy #1
   Farmer: 0x1234...
   Coverage: $10000 USDC
   Location: -1.234567°, 36.789012°
   🚨 DAMAGE DETECTED: 42.50%
      Weather Damage: 35.00%
      Satellite Damage: 55.00%
      Payout: $4250 USDC
   📤 Submitting damage report...
   ✅ Report submitted successfully!
   
📊 WORKFLOW SUMMARY
   Policies Assessed: 3
   Reports Submitted: 1
   Avg Damage: 42.50%
```

## 📁 Project Structure

```
cre-workflow/
├── package.json                      # Dependencies and scripts
├── .env.example                      # Environment variable template
├── .env                              # Your credentials (git ignored)
├── secrets.yaml                      # CRE secrets configuration
├── project.yaml                      # Global RPC configuration
├── workflow.yaml                     # Workflow metadata
│
├── damage-assessment-workflow/
│   ├── main.ts                       # Main workflow logic ⭐
│   ├── config.staging.json           # Staging configuration
│   └── config.production.json        # Production configuration
│
└── contracts/
    └── abi/
        ├── PolicyManager.ts          # PolicyManager ABI
        ├── PayoutReceiver.ts         # PayoutReceiver ABI
        └── index.ts                  # Barrel export
```

## ⚙️ Configuration

### Workflow Settings (`config.staging.json`)

```json
{
  "cronSchedule": "0 0 * * *",        // Daily at midnight UTC
  "chainSelectorName": "base-testnet-sepolia",
  "policyManagerAddress": "0x...",
  "payoutReceiverAddress": "0x...",
  "gasLimit": "500000",
  "weatherxmApiUrl": "https://api.weatherxm.com/api/v1",
  "planetApiUrl": "https://api.planet.com/analytics/v1",
  "minDamageThreshold": 1000,         // 10% minimum damage to trigger payout
  "lookbackDays": 30                  // Days of historical data to analyze
}
```

### Cron Schedule Examples

- `"0 0 * * *"` - Daily at midnight UTC
- `"0 */6 * * *"` - Every 6 hours
- `"0 0 * * 1"` - Every Monday at midnight
- `"*/30 * * * *"` - Every 30 minutes (for testing)

### Damage Threshold

- `1000` = 10% minimum damage required
- `500` = 5% (more sensitive)
- `2000` = 20% (less sensitive)

## 🔬 Testing & Debugging

### Local Simulation

Simulate the workflow without deploying:

```bash
bun run simulate
```

### Production Simulation

Test against production config:

```bash
bun run simulate:prod
```

### Common Issues

**Issue**: `Cannot find module '@chainlink/cre-sdk'`
- **Fix**: Run `bun install` to install dependencies

**Issue**: `Network not found: base-testnet-sepolia`
- **Fix**: Check that `chainSelectorName` in config matches a supported network

**Issue**: `No active policies to assess`
- **Fix**: Ensure you have active policies in PolicyManager contract

**Issue**: `Transaction failed`
- **Fix**: 
  1. Check you have enough Base Sepolia ETH for gas
  2. Verify contract addresses in config
  3. Ensure PayoutReceiver is properly configured with KeystoneForwarder address

## 🚀 Production Deployment

### 1. Request CRE Access

Visit [cre.chain.link/request-access](https://cre.chain.link/request-access) and request early access.

### 2. Install CRE CLI

```bash
npm install -g @chainlink/cre-cli
```

### 3. Link Your Wallet

```bash
cre account link-key --target production-settings
```

Follow the prompts to link your Ethereum wallet.

### 4. Deploy Workflow

```bash
cre workflow deploy damage-assessment-workflow --target production-settings
```

This will:
1. Compile TypeScript to WASM
2. Upload to CRE platform
3. Return a workflow ID

### 5. Activate Workflow

```bash
cre workflow activate <workflow-id>
```

The workflow will now run automatically based on your cron schedule!

### 6. Monitor Workflow

Visit [cre.chain.link/workflows](https://cre.chain.link/workflows) to:
- View execution history
- Check logs and errors
- Monitor gas usage
- Track successful payouts

### 7. Pause Workflow (if needed)

```bash
cre workflow pause <workflow-id>
```

## 💰 Cost Estimation

### Per Execution Costs

- **CRE Execution**: ~$0.01 (LINK payment to DON nodes)
- **Base Gas Fee**: ~$0.02 (for on-chain submission)
- **API Calls**: Negligible (WeatherXM and Planet Labs free tiers)

**Total per claim**: ~$0.03

### Monthly Costs (Example)

For a portfolio of 100 policies with daily assessment:

- **Executions**: 30 days/month
- **Claims detected**: ~10-15% of policies
- **Total cost**: 100 policies × 30 days × $0.03 = **~$900/month**

Compare to oracle infrastructure:
- **Custom oracle servers**: $500+/month
- **Data provider fees**: $200+/month
- **Total saved**: 25-30%

## 🔐 Security Best Practices

### 1. Private Key Management

**Never** hardcode private keys in code. Use environment variables:

```typescript
// ✅ Good
const privateKey = process.env.CRE_ETH_PRIVATE_KEY

// ❌ Bad
const privateKey = "abc123..."
```

### 2. API Key Security

Store API keys in `secrets.yaml` (git ignored) and reference in workflow:

```typescript
const apiKey = nodeRuntime.getSecret({ id: "WEATHERXM_API_KEY" }).result().value
```

### 3. Contract Security

- Deploy PayoutReceiver with correct `expectedWorkflowOwner` address
- Set `expectedWorkflowId` after deploying workflow
- Use multi-sig wallet for workflow owner in production

### 4. Rate Limiting

Implement rate limiting for API calls:

```typescript
// Add delay between requests to avoid hitting API limits
await new Promise(resolve => setTimeout(resolve, 100))
```

## 🐛 Troubleshooting

### Workflow not triggering

1. Check cron schedule syntax in `config.staging.json`
2. Verify workflow is activated: `cre workflow list`
3. Check CRE platform logs for errors

### No damage detected

1. Verify API keys are working (check WeatherXM/Planet Labs dashboards)
2. Lower `minDamageThreshold` in config for testing
3. Check logs for data fetching errors

### Transaction reverted

1. Check PayoutReceiver has correct forwarder address
2. Verify workflow ID and owner match PayoutReceiver config
3. Ensure Treasury contract has sufficient USDC balance
4. Check that policy hasn't already been claimed

### API errors

1. Verify API keys are valid and not expired
2. Check API rate limits (upgrade plan if needed)
3. Implement retry logic with exponential backoff

## 📚 Additional Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [WeatherXM API Docs](https://docs.weatherxm.com)
- [Planet Labs API Docs](https://developers.planet.com)
- [Base Network Docs](https://docs.base.org)
- [Viem Documentation](https://viem.sh)

## 🤝 Support

For issues or questions:

1. Check the [CRE Architecture Documentation](../CRE_ARCHITECTURE.md)
2. Review workflow logs: `cre workflow logs <workflow-id>`
3. Contact Chainlink support at [support.chain.link](https://support.chain.link)

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.
