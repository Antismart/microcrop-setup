# 🎯 CRE Integration - Complete Checklist

This checklist covers everything needed to get your automated damage assessment system up and running.

## ✅ Phase 1: Pre-Requirements (10 minutes)

### 1.1 Development Environment
- [ ] Node.js 18+ or Bun installed
  - Check: `node --version` or `bun --version`
  - Install: [nodejs.org](https://nodejs.org) or [bun.sh](https://bun.sh)

- [ ] Git installed
  - Check: `git --version`

- [ ] Foundry installed (for smart contracts)
  - Check: `forge --version`
  - Install: `curl -L https://foundry.paradigm.xyz | bash`

### 1.2 Get Test Funds
- [ ] Base Sepolia ETH (for gas fees)
  - Get from: [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet)
  - Amount needed: 0.1 ETH (~$1 worth)

- [ ] Create Ethereum wallet for CRE
  - [ ] Generate private key (64 hex characters, no `0x` prefix)
  - [ ] Save securely (NEVER commit to git!)
  - [ ] Fund with Base Sepolia ETH

### 1.3 API Keys
- [ ] WeatherXM API Key
  - Register at: [weatherxm.com](https://weatherxm.com)
  - Navigate to: Dashboard → API Keys
  - Copy key to `.env`

- [ ] Planet Labs API Key
  - Register at: [planet.com](https://planet.com)
  - Navigate to: Account → API Keys
  - Copy key to `.env`

### 1.4 CRE Early Access (for production)
- [ ] Request CRE access
  - Visit: [cre.chain.link/request-access](https://cre.chain.link/request-access)
  - Fill out form
  - Wait for approval email (~1-2 business days)

## ✅ Phase 2: Setup & Configuration (20 minutes)

### 2.1 Install Dependencies
```bash
cd cre-workflow
bun install  # or: npm install
```

- [ ] Dependencies installed successfully
- [ ] No error messages
- [ ] `node_modules/` directory created

### 2.2 Configure Environment
```bash
cp .env.example .env
nano .env  # or use your preferred editor
```

Fill in these values:
- [ ] `CRE_ETH_PRIVATE_KEY` (64 hex characters, no `0x`)
- [ ] `WEATHERXM_API_KEY`
- [ ] `PLANET_API_KEY`

**Security Check**:
- [ ] `.env` file is listed in `.gitignore`
- [ ] Never commit `.env` to version control

### 2.3 Update Contract Addresses (Placeholder)
Edit `damage-assessment-workflow/config.staging.json`:

- [ ] Note that `policyManagerAddress` needs to be updated after deployment
- [ ] Note that `payoutReceiverAddress` needs to be updated after deployment
- [ ] Review cron schedule: `"0 0 * * *"` (daily at midnight UTC)
- [ ] Review damage threshold: `1000` (10%)
- [ ] Review lookback period: `30` days

## ✅ Phase 3: Smart Contract Deployment (30 minutes)

### 3.1 Update Existing Contracts

#### Update PolicyManager.sol
Add these functions (see DEPLOYMENT_GUIDE.md for code):
- [ ] `getActivePolicies()` - returns array of active policy IDs
- [ ] `getPolicyDetails(uint256 policyId)` - returns policy data

#### Update Treasury.sol
Add these functions:
- [ ] `requestPayoutFromOracle(uint256, address, uint256)` - processes oracle payouts
- [ ] `setPayoutReceiver(address)` - sets authorized oracle address
- [ ] `payoutReceiverAddress` storage variable

### 3.2 Build Contracts
```bash
cd ../Contracts
forge build
```

- [ ] Compilation successful
- [ ] No errors in output
- [ ] ABI files generated in `out/` directory

### 3.3 Deploy PayoutReceiver to Base Sepolia

First, find the Keystone Forwarder address for Base Sepolia:
- [ ] Check [CRE Documentation](https://docs.chain.link/cre/supported-networks)
- [ ] Save forwarder address: `FORWARDER_ADDRESS=0x...`

Then deploy:
```bash
forge create src/core/PayoutReceiver.sol:PayoutReceiver \
  --rpc-url https://sepolia.base.org \
  --private-key $YOUR_PRIVATE_KEY \
  --constructor-args $FORWARDER_ADDRESS \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

- [ ] Contract deployed successfully
- [ ] Save deployed address: `PAYOUT_RECEIVER_ADDRESS=0x...`
- [ ] Contract verified on Basescan
- [ ] View contract on Basescan: `https://sepolia.basescan.org/address/0x...`

### 3.4 Update/Redeploy PolicyManager & Treasury

If contracts need updates:
```bash
# Redeploy PolicyManager
forge create src/core/PolicyManager.sol:PolicyManager \
  --rpc-url https://sepolia.base.org \
  --private-key $YOUR_PRIVATE_KEY \
  --verify

# Redeploy Treasury
forge create src/core/Treasury.sol:Treasury \
  --rpc-url https://sepolia.base.org \
  --private-key $YOUR_PRIVATE_KEY \
  --verify
```

Or if already deployed, verify functions exist:
- [ ] `PolicyManager.getActivePolicies()` callable
- [ ] `PolicyManager.getPolicyDetails(1)` callable
- [ ] `Treasury.setPayoutReceiver(address)` callable

### 3.5 Configure Treasury
```bash
# Set PayoutReceiver as authorized oracle
cast send $TREASURY_ADDRESS \
  "setPayoutReceiver(address)" \
  $PAYOUT_RECEIVER_ADDRESS \
  --rpc-url https://sepolia.base.org \
  --private-key $YOUR_PRIVATE_KEY
```

- [ ] Transaction successful
- [ ] Event `PayoutReceiverUpdated` emitted
- [ ] Verify: `cast call $TREASURY_ADDRESS "payoutReceiverAddress()(address)" --rpc-url https://sepolia.base.org`

### 3.6 Fund Treasury with Test USDC
```bash
# Get Base Sepolia USDC address
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Base Sepolia USDC

# Transfer test USDC to Treasury
cast send $USDC_ADDRESS \
  "transfer(address,uint256)" \
  $TREASURY_ADDRESS \
  100000000 \  # 100 USDC (6 decimals)
  --rpc-url https://sepolia.base.org \
  --private-key $YOUR_PRIVATE_KEY
```

- [ ] USDC transferred successfully
- [ ] Verify balance: `cast call $USDC_ADDRESS "balanceOf(address)(uint256)" $TREASURY_ADDRESS --rpc-url https://sepolia.base.org`

### 3.7 Update CRE Workflow Configuration

Edit `cre-workflow/damage-assessment-workflow/config.staging.json`:
```json
{
  "policyManagerAddress": "0xYOUR_DEPLOYED_ADDRESS",
  "payoutReceiverAddress": "0xYOUR_DEPLOYED_ADDRESS",
  ...
}
```

- [ ] `policyManagerAddress` updated with deployed address
- [ ] `payoutReceiverAddress` updated with deployed address
- [ ] All addresses are checksummed (proper case)

## ✅ Phase 4: Local Testing (30 minutes)

### 4.1 Create Test Policy

Create at least one active policy in PolicyManager:
```bash
cast send $POLICY_MANAGER_ADDRESS \
  "createPolicy(...)" \
  --rpc-url https://sepolia.base.org \
  --private-key $YOUR_PRIVATE_KEY
```

- [ ] Policy created successfully
- [ ] Policy ID noted: `POLICY_ID=1`
- [ ] Policy status is ACTIVE
- [ ] Coverage period ends within 30 days (for testing)

### 4.2 Verify Policy Readable

Test that CRE can read the policy:
```bash
# Check active policies
cast call $POLICY_MANAGER_ADDRESS \
  "getActivePolicies()(uint256[])" \
  --rpc-url https://sepolia.base.org

# Check policy details
cast call $POLICY_MANAGER_ADDRESS \
  "getPolicyDetails(uint256)(address,uint256,uint256,uint256,string,uint8,int256,int256)" \
  $POLICY_ID \
  --rpc-url https://sepolia.base.org
```

- [ ] Active policies array returned
- [ ] Policy details returned correctly
- [ ] GPS coordinates present

### 4.3 Run Local Simulation

```bash
cd ../cre-workflow
bun run simulate
```

Expected output:
```
🚀 MicroCrop Damage Assessment Workflow Started
📅 Timestamp: 2024-01-15T00:00:00.000Z
🌐 Network: base-testnet-sepolia
📖 Reading active policies from PolicyManager...
📋 Found 1 active policies to assess
...
```

Checklist:
- [ ] Workflow compiles successfully
- [ ] Network connection established
- [ ] Active policies read from blockchain
- [ ] Weather API called successfully
- [ ] Satellite API called successfully
- [ ] Damage calculation completed
- [ ] Report generated (if damage > threshold)
- [ ] No critical errors

### 4.4 Troubleshoot Common Issues

**Issue**: Cannot find module errors
- [ ] Fixed by running: `bun install`

**Issue**: Network not found
- [ ] Check `chainSelectorName` in config.staging.json
- [ ] Verify RPC URL in project.yaml

**Issue**: Contract call failed
- [ ] Check contract addresses in config
- [ ] Verify contracts are deployed to Base Sepolia
- [ ] Ensure RPC endpoint is working

**Issue**: API errors
- [ ] Verify API keys in `.env`
- [ ] Check API key is valid (test in browser/Postman)
- [ ] Check rate limits not exceeded

## ✅ Phase 5: CRE Deployment (20 minutes)

### 5.1 Install CRE CLI

```bash
npm install -g @chainlink/cre-cli
```

- [ ] CRE CLI installed
- [ ] Verify: `cre --version`

### 5.2 Link Wallet

```bash
cre account link-key --target staging-settings
```

- [ ] Follow prompts to sign message
- [ ] Wallet linked successfully
- [ ] View linked accounts: `cre account list`

### 5.3 Deploy Workflow

```bash
cre workflow deploy damage-assessment-workflow --target staging-settings
```

Expected output:
```
✓ Compiling TypeScript to WASM...
✓ Uploading workflow bundle...
✓ Workflow deployed successfully!
  
Workflow ID: abc123-def456-ghi789
View workflow: https://cre.chain.link/workflows/abc123-def456-ghi789
```

- [ ] Workflow compiled successfully
- [ ] Workflow uploaded to CRE platform
- [ ] Workflow ID received
- [ ] Save workflow ID: `WORKFLOW_ID=abc123-def456-ghi789`

### 5.4 Configure PayoutReceiver Security

```bash
# Set expected workflow ID
cast send $PAYOUT_RECEIVER_ADDRESS \
  "setExpectedWorkflowId(bytes32)" \
  $WORKFLOW_ID \
  --rpc-url https://sepolia.base.org \
  --private-key $YOUR_PRIVATE_KEY

# Set expected workflow owner (your CRE wallet)
cast send $PAYOUT_RECEIVER_ADDRESS \
  "setExpectedAuthor(address)" \
  $YOUR_CRE_WALLET_ADDRESS \
  --rpc-url https://sepolia.base.org \
  --private-key $YOUR_PRIVATE_KEY
```

- [ ] Workflow ID set successfully
- [ ] Workflow owner set successfully
- [ ] Security validation enabled

### 5.5 Activate Workflow

```bash
cre workflow activate $WORKFLOW_ID
```

- [ ] Workflow activated
- [ ] Cron schedule enabled
- [ ] Workflow status: ACTIVE
- [ ] Verify: `cre workflow status $WORKFLOW_ID`

## ✅ Phase 6: Production Monitoring (Ongoing)

### 6.1 Monitor First Execution

Wait for first cron trigger (midnight UTC) or manually trigger for testing.

```bash
# View workflow logs
cre workflow logs $WORKFLOW_ID --tail

# Check recent transactions
cast logs $PAYOUT_RECEIVER_ADDRESS \
  --from-block -100 \
  "DamageReportReceived(uint256,uint256,uint256)" \
  --rpc-url https://sepolia.base.org
```

- [ ] Workflow executed on schedule
- [ ] Logs show policy assessment
- [ ] No critical errors
- [ ] If damage detected, report submitted on-chain

### 6.2 Verify Payout (if damage detected)

```bash
# Check damage report
cast call $PAYOUT_RECEIVER_ADDRESS \
  "damageReports(uint256)(uint256,uint256,uint256,uint256,uint256,uint256)" \
  $POLICY_ID \
  --rpc-url https://sepolia.base.org

# Check farmer's USDC balance
cast call $USDC_ADDRESS \
  "balanceOf(address)(uint256)" \
  $FARMER_ADDRESS \
  --rpc-url https://sepolia.base.org
```

- [ ] Damage report stored on-chain
- [ ] Payout amount calculated correctly
- [ ] USDC transferred to farmer
- [ ] Treasury balance decreased
- [ ] Policy status updated

### 6.3 Set Up Monitoring Dashboards

**CRE Platform**:
- [ ] Bookmark: [cre.chain.link/workflows](https://cre.chain.link/workflows)
- [ ] Add workflow to favorites
- [ ] Enable email notifications for failures

**Base Explorer**:
- [ ] Monitor PayoutReceiver contract: `https://sepolia.basescan.org/address/$PAYOUT_RECEIVER_ADDRESS`
- [ ] Watch for `DamageReportReceived` events
- [ ] Monitor gas usage trends

**API Monitoring**:
- [ ] Track WeatherXM API usage
- [ ] Track Planet Labs API usage
- [ ] Set up alerts for rate limit warnings

### 6.4 Document Operational Procedures

- [ ] Create runbook for daily operations
- [ ] Document troubleshooting steps
- [ ] Set up on-call rotation (if needed)
- [ ] Train team on CRE dashboard

## ✅ Phase 7: Production Deployment (When Ready)

### 7.1 Deploy Production Contracts

Deploy to Base Mainnet:
```bash
forge create src/core/PayoutReceiver.sol:PayoutReceiver \
  --rpc-url https://mainnet.base.org \
  --private-key $PRODUCTION_PRIVATE_KEY \
  --constructor-args $MAINNET_FORWARDER_ADDRESS \
  --verify
```

- [ ] Production contracts deployed
- [ ] Save production addresses
- [ ] Contracts verified on Basescan

### 7.2 Update Production Configuration

Edit `cre-workflow/damage-assessment-workflow/config.production.json`:
- [ ] Update contract addresses
- [ ] Change `chainSelectorName` to `"base-mainnet"`
- [ ] Review cron schedule
- [ ] Review damage threshold

### 7.3 Deploy Production Workflow

```bash
cre workflow deploy damage-assessment-workflow --target production-settings
cre workflow activate $PRODUCTION_WORKFLOW_ID
```

- [ ] Production workflow deployed
- [ ] Workflow ID saved
- [ ] Security parameters configured
- [ ] Workflow activated

### 7.4 Configure Multi-Sig (Recommended)

For production, use a multi-sig wallet:
- [ ] Deploy Gnosis Safe on Base Mainnet
- [ ] Add team members as signers
- [ ] Update `workflow.yaml` with Safe address
- [ ] Transfer workflow ownership to Safe

### 7.5 Fund Production Treasury

```bash
# Transfer real USDC to production Treasury
# CAUTION: Use correct addresses and amounts!
```

- [ ] Treasury funded with sufficient USDC
- [ ] Balance verified
- [ ] Backup funds available

### 7.6 Launch! 🚀

- [ ] All systems verified
- [ ] Team briefed
- [ ] Monitoring active
- [ ] Backup procedures in place
- [ ] Announce to stakeholders

## 🎉 Success Criteria

Your CRE integration is successful when:

✅ **Daily Execution**: Workflow runs every day at midnight UTC without errors

✅ **Automatic Detection**: Damage is detected and assessed without manual intervention

✅ **Correct Payouts**: Farmers receive USDC when damage exceeds threshold

✅ **Zero Manual Claims**: No farmer needs to file a claim manually

✅ **Data Privacy**: GPS coordinates and raw data never appear on-chain

✅ **Decentralized**: Multiple DON nodes validate every assessment

✅ **Cost-Effective**: ~$0.03 per claim, 25-30% cheaper than oracle infrastructure

✅ **Scalable**: Can handle hundreds of policies without performance degradation

## 📚 Reference Documents

- **Architecture**: `CRE_ARCHITECTURE.md`
- **Setup Guide**: `cre-workflow/README.md`
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Implementation Summary**: `CRE_IMPLEMENTATION_SUMMARY.md`
- **CRE Documentation**: [docs.chain.link/cre](https://docs.chain.link/cre)

## 🆘 Need Help?

If you encounter issues:

1. Check this checklist for missed steps
2. Review workflow logs: `cre workflow logs $WORKFLOW_ID`
3. Check contract events on Basescan
4. Consult the troubleshooting sections in README.md
5. Contact Chainlink support: [support.chain.link](https://support.chain.link)

---

**Congratulations!** You've built a fully automated, decentralized damage assessment system powered by Chainlink CRE! 🎊
