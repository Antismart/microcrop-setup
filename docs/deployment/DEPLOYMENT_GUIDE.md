# CRE Integration Deployment Guide

Complete guide for deploying the CRE-integrated MicroCrop system to Base network.

## 📋 Overview

This guide covers:

1. ✅ Smart contract updates and deployment
2. ✅ CRE workflow deployment
3. ✅ Security configuration
4. ✅ Testing and validation
5. ✅ Production launch

## 🏗️ Phase 1: Smart Contract Deployment

### Step 1.1: Update PolicyManager Contract

Add these functions to `Contracts/src/core/PolicyManager.sol`:

```solidity
/**
 * @notice Get all active policy IDs
 * @return Array of policy IDs with status ACTIVE
 */
function getActivePolicies() external view returns (uint256[] memory) {
    uint256 activeCount = 0;
    
    // First pass: count active policies
    for (uint256 i = 1; i <= policyCount; i++) {
        if (policies[i].status == PolicyStatus.ACTIVE) {
            activeCount++;
        }
    }
    
    // Second pass: populate array
    uint256[] memory activePolicyIds = new uint256[](activeCount);
    uint256 index = 0;
    
    for (uint256 i = 1; i <= policyCount; i++) {
        if (policies[i].status == PolicyStatus.ACTIVE) {
            activePolicyIds[index] = i;
            index++;
        }
    }
    
    return activePolicyIds;
}

/**
 * @notice Get detailed information for a specific policy
 * @param policyId The ID of the policy
 * @return Complete policy details
 */
function getPolicyDetails(uint256 policyId) 
    external 
    view 
    returns (
        address farmer,
        uint256 coverageAmount,
        uint256 startDate,
        uint256 endDate,
        string memory cropType,
        PerilType perilType,
        int256 latitude,
        int256 longitude
    ) 
{
    require(policyId > 0 && policyId <= policyCount, "Invalid policy ID");
    
    Policy storage policy = policies[policyId];
    
    return (
        policy.farmer,
        policy.coverageAmount,
        policy.startDate,
        policy.endDate,
        policy.cropType,
        policy.perilType,
        policy.latitude,
        policy.longitude
    );
}
```

### Step 1.2: Update Treasury Contract

Add this function to `Contracts/src/core/Treasury.sol`:

```solidity
/**
 * @notice Process payout request from CRE oracle
 * @param policyId The policy ID
 * @param farmer The farmer receiving the payout
 * @param amount The payout amount in USDC
 */
function requestPayoutFromOracle(
    uint256 policyId,
    address farmer,
    uint256 amount
) external {
    require(msg.sender == payoutReceiverAddress, "Only PayoutReceiver can call");
    require(amount > 0, "Amount must be positive");
    require(usdcToken.balanceOf(address(this)) >= amount, "Insufficient balance");
    
    // Transfer USDC to farmer
    require(usdcToken.transfer(farmer, amount), "Transfer failed");
    
    // Record payout
    totalPayouts += amount;
    
    emit PayoutProcessed(policyId, farmer, amount, block.timestamp);
}

// Add storage variable
address public payoutReceiverAddress;

// Add setter (only owner)
function setPayoutReceiver(address _payoutReceiver) external onlyOwner {
    require(_payoutReceiver != address(0), "Invalid address");
    payoutReceiverAddress = _payoutReceiver;
    emit PayoutReceiverUpdated(_payoutReceiver);
}

// Add event
event PayoutReceiverUpdated(address indexed payoutReceiver);
```

### Step 1.3: Build Contracts

```bash
cd Contracts
forge build
```

Expected output:
```
[⠊] Compiling...
[⠒] Compiling 3 files with 0.8.20
[⠢] Solc 0.8.20 finished in 2.5s
Compiler run successful!
```

### Step 1.4: Deploy to Base Sepolia

#### Deploy PayoutReceiver

```bash
# Get Keystone Forwarder address for Base Sepolia
# Check: https://docs.chain.link/cre/supported-networks

forge create src/core/PayoutReceiver.sol:PayoutReceiver \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args 0xYOUR_KEYSTONE_FORWARDER_ADDRESS \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Save the deployed address: `PAYOUT_RECEIVER_ADDRESS=0x...`

#### Update PolicyManager

```bash
# Assuming PolicyManager is already deployed
cast send $POLICY_MANAGER_ADDRESS \
  "function signature here" \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

Or redeploy if needed.

#### Update Treasury

```bash
# Set PayoutReceiver address
cast send $TREASURY_ADDRESS \
  "setPayoutReceiver(address)" \
  $PAYOUT_RECEIVER_ADDRESS \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

### Step 1.5: Verify Contract Addresses

Create a deployment record:

```bash
echo "POLICY_MANAGER_ADDRESS=0x..." >> deployment.env
echo "TREASURY_ADDRESS=0x..." >> deployment.env
echo "PAYOUT_RECEIVER_ADDRESS=0x..." >> deployment.env
echo "LIQUIDITY_POOL_ADDRESS=0x..." >> deployment.env
```

## 🚀 Phase 2: CRE Workflow Deployment

### Step 2.1: Install Dependencies

```bash
cd ../cre-workflow
bun install
```

### Step 2.2: Configure Environment

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

Required variables:
```bash
CRE_ETH_PRIVATE_KEY=your_64_hex_private_key_no_0x_prefix
WEATHERXM_API_KEY=your_weatherxm_api_key
PLANET_API_KEY=your_planet_api_key
```

### Step 2.3: Update Configuration Files

Edit `damage-assessment-workflow/config.staging.json`:

```json
{
  "cronSchedule": "0 0 * * *",
  "chainSelectorName": "base-testnet-sepolia",
  "policyManagerAddress": "0xYOUR_POLICY_MANAGER_ADDRESS",
  "payoutReceiverAddress": "0xYOUR_PAYOUT_RECEIVER_ADDRESS",
  "gasLimit": "500000",
  "weatherxmApiUrl": "https://api.weatherxm.com/api/v1",
  "planetApiUrl": "https://api.planet.com/analytics/v1",
  "minDamageThreshold": 1000,
  "lookbackDays": 30
}
```

### Step 2.4: Local Simulation

Test workflow before deploying:

```bash
bun run simulate
```

Expected output:
```
🚀 MicroCrop Damage Assessment Workflow Started
📅 Timestamp: 2024-01-15T00:00:00.000Z
🌐 Network: base-testnet-sepolia
📖 Reading active policies from PolicyManager...
📋 Found 5 active policies to assess
...
```

### Step 2.5: Deploy to CRE Platform

#### Install CRE CLI

```bash
npm install -g @chainlink/cre-cli
```

#### Link Wallet

```bash
cre account link-key --target staging-settings
```

Follow the prompts to connect your wallet.

#### Deploy Workflow

```bash
cre workflow deploy damage-assessment-workflow --target staging-settings
```

Save the workflow ID: `WORKFLOW_ID=abc123...`

#### Activate Workflow

```bash
cre workflow activate $WORKFLOW_ID
```

## 🔐 Phase 3: Security Configuration

### Step 3.1: Configure PayoutReceiver

Set workflow security parameters:

```bash
# Set expected workflow ID
cast send $PAYOUT_RECEIVER_ADDRESS \
  "setExpectedWorkflowId(bytes32)" \
  $WORKFLOW_ID \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY

# Set expected workflow owner (your CRE wallet address)
cast send $PAYOUT_RECEIVER_ADDRESS \
  "setExpectedAuthor(address)" \
  $YOUR_CRE_WALLET_ADDRESS \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

### Step 3.2: Test Security

Try submitting a report from unauthorized address (should fail):

```bash
# This should revert with "Invalid workflow owner"
cast send $PAYOUT_RECEIVER_ADDRESS \
  "onReport(...)" \
  --from $UNAUTHORIZED_ADDRESS \
  --rpc-url https://sepolia.base.org
```

### Step 3.3: Fund Treasury

Ensure Treasury has USDC for payouts:

```bash
# Transfer USDC to Treasury
cast send $USDC_ADDRESS \
  "transfer(address,uint256)" \
  $TREASURY_ADDRESS \
  1000000000 \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

## 🧪 Phase 4: Testing

### Step 4.1: Create Test Policy

```bash
# Create a test policy with known conditions
cast send $POLICY_MANAGER_ADDRESS \
  "createPolicy(...)" \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

### Step 4.2: Wait for Cron Trigger

Wait for next scheduled execution (midnight UTC) or manually trigger for testing.

### Step 4.3: Monitor Execution

```bash
# View workflow logs
cre workflow logs $WORKFLOW_ID --tail

# Check for damage reports
cast call $PAYOUT_RECEIVER_ADDRESS \
  "damageReports(uint256)(uint256,uint256,uint256,uint256,uint256,uint256)" \
  1 \
  --rpc-url https://sepolia.base.org
```

### Step 4.4: Verify Payout

```bash
# Check farmer's USDC balance
cast call $USDC_ADDRESS \
  "balanceOf(address)(uint256)" \
  $FARMER_ADDRESS \
  --rpc-url https://sepolia.base.org
```

## 🌐 Phase 5: Production Deployment

### Step 5.1: Deploy Production Contracts

Deploy to Base Mainnet:

```bash
# Use same commands as Step 1.4, but with mainnet RPC
forge create src/core/PayoutReceiver.sol:PayoutReceiver \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --constructor-args $MAINNET_KEYSTONE_FORWARDER \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### Step 5.2: Update Production Config

Edit `damage-assessment-workflow/config.production.json`:

```json
{
  "chainSelectorName": "base-mainnet",
  "policyManagerAddress": "0xYOUR_MAINNET_POLICY_MANAGER",
  "payoutReceiverAddress": "0xYOUR_MAINNET_PAYOUT_RECEIVER",
  ...
}
```

### Step 5.3: Deploy Production Workflow

```bash
cre workflow deploy damage-assessment-workflow --target production-settings
cre workflow activate $PRODUCTION_WORKFLOW_ID
```

### Step 5.4: Configure Multi-Sig (Recommended)

For production, use a multi-sig wallet as workflow owner:

1. Deploy Gnosis Safe on Base Mainnet
2. Add team members as signers
3. Update `workflow.yaml`:

```yaml
production-settings:
  workflow-owner-address: "0xYOUR_GNOSIS_SAFE_ADDRESS"
```

### Step 5.5: Monitor Production

Set up monitoring:

1. **CRE Dashboard**: [cre.chain.link/workflows](https://cre.chain.link/workflows)
2. **Base Explorer**: Track transactions on Basescan
3. **Alerts**: Set up email/Slack alerts for failures

## 📊 Phase 6: Operational Monitoring

### Key Metrics to Track

1. **Workflow Executions**
   - Total runs per day
   - Success rate
   - Average execution time

2. **Damage Assessments**
   - Policies assessed
   - Claims detected (%)
   - Average damage severity

3. **Payouts**
   - Total USDC distributed
   - Average payout amount
   - Treasury balance remaining

4. **Costs**
   - Gas fees per execution
   - CRE execution costs
   - API call costs

### Monitoring Commands

```bash
# Check workflow status
cre workflow status $WORKFLOW_ID

# View recent logs
cre workflow logs $WORKFLOW_ID --tail --lines 100

# Check Treasury balance
cast call $TREASURY_ADDRESS \
  "getTotalBalance()(uint256)" \
  --rpc-url https://mainnet.base.org

# List recent payouts
cast logs $TREASURY_ADDRESS \
  --from-block -1000 \
  "PayoutProcessed(uint256,address,uint256,uint256)" \
  --rpc-url https://mainnet.base.org
```

## 🚨 Troubleshooting

### Workflow Not Executing

**Symptoms**: No logs in CRE dashboard

**Solutions**:
1. Verify workflow is activated: `cre workflow status $WORKFLOW_ID`
2. Check cron schedule is valid
3. Ensure wallet has sufficient LINK balance for CRE fees

### Reports Not Submitted On-Chain

**Symptoms**: Workflow executes but no transactions

**Solutions**:
1. Check wallet has Base ETH for gas
2. Verify `gasLimit` in config is sufficient
3. Check PayoutReceiver address is correct

### Payouts Not Processing

**Symptoms**: Reports submitted but no USDC transferred

**Solutions**:
1. Check Treasury has USDC balance
2. Verify PayoutReceiver is authorized in Treasury
3. Ensure policy hasn't already been claimed

### API Errors

**Symptoms**: Workflow fails at data fetching

**Solutions**:
1. Verify API keys are valid
2. Check API rate limits
3. Implement retry logic for transient failures

## 📞 Support Contacts

- **CRE Support**: [support.chain.link](https://support.chain.link)
- **Base Network**: [base.org/discord](https://base.org/discord)
- **WeatherXM**: support@weatherxm.com
- **Planet Labs**: support@planet.com

## ✅ Deployment Checklist

Use this checklist to ensure complete deployment:

### Smart Contracts
- [ ] PolicyManager updated with new functions
- [ ] Treasury updated with `requestPayoutFromOracle`
- [ ] PayoutReceiver deployed to Base Sepolia
- [ ] PayoutReceiver deployed to Base Mainnet
- [ ] All contracts verified on Basescan
- [ ] Treasury funded with USDC

### CRE Workflow
- [ ] Dependencies installed (`bun install`)
- [ ] Environment variables configured (`.env`)
- [ ] Config files updated with contract addresses
- [ ] Local simulation successful
- [ ] Workflow deployed to CRE platform
- [ ] Workflow activated
- [ ] Security parameters set (workflow ID, owner)

### Testing
- [ ] Test policy created
- [ ] Workflow execution monitored
- [ ] Damage report verified on-chain
- [ ] Payout confirmed in farmer's wallet

### Production
- [ ] Production contracts deployed
- [ ] Production workflow deployed
- [ ] Multi-sig configured (if applicable)
- [ ] Monitoring dashboard set up
- [ ] Team trained on operations
- [ ] Runbook documented

## 🎉 Launch!

Once all checklist items are complete, your CRE-powered automatic damage assessment system is live!

Farmers no longer need to file claims manually - the system monitors policies 24/7 and automatically processes payouts when damage is detected.

Welcome to the future of parametric insurance! 🌾🚀
