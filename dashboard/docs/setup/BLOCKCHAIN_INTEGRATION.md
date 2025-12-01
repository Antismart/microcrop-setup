# Blockchain Integration Documentation 🔗

**Last Updated:** December 1, 2025  
**Status:** Optional - Disabled by Default  
**Network:** Base L2 (Ethereum Layer 2)

---

## 📊 Overview

The MicroCrop Dashboard includes **optional blockchain integration** for on-chain insurance policy management and premium payments using USDC on Base L2.

### Current Status: **DISABLED BY DEFAULT** ⚠️

The blockchain features are **currently disabled** in the default configuration. All core functionality works without blockchain integration.

---

## 🏗️ Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Blockchain** | Base L2 | Ethereum Layer 2 for low gas fees |
| **Smart Contracts** | Solidity | Insurance policy and payment logic |
| **Wallet Connection** | WalletConnect (Reown) | User wallet integration |
| **Web3 Library** | Wagmi + Viem | React hooks for blockchain interaction |
| **Token** | USDC | Stablecoin for premiums and payouts |

### Smart Contracts

#### MicroCropInsurance Contract
**Purpose:** Manage insurance policies on-chain

**Key Functions:**
- `createPolicy()` - Create new insurance policy
- `purchasePolicy()` - Buy policy with USDC payment
- `submitClaim()` - File insurance claim
- `approveClaim()` - Admin approves claim
- `rejectClaim()` - Admin rejects claim

**Contract Address (Base Mainnet):**
```
NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS=<not deployed yet>
```

#### USDC Token Contract
**Purpose:** Stablecoin for payments

**Contract Address (Base Mainnet):**
```
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

## 🔧 Configuration

### Environment Variables

Add to `.env.local`:

```bash
# Blockchain Configuration
NEXT_PUBLIC_ENABLE_BLOCKCHAIN=false  # Set to 'true' to enable

# WalletConnect Project ID (Get from https://cloud.reown.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Smart Contract Addresses (Base Mainnet)
NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS=0x...  # Deploy contract first
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

### How to Enable Blockchain Features

1. **Get WalletConnect Project ID:**
   ```
   1. Visit https://cloud.reown.com
   2. Create a free account
   3. Create a new project
   4. Copy the Project ID
   5. Add to NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
   ```

2. **Deploy Smart Contracts** (if not deployed):
   ```bash
   cd ../../Contracts
   forge build
   forge script script/Deploy.s.sol --rpc-url base --broadcast
   ```

3. **Update Contract Addresses:**
   ```bash
   # After deployment, copy contract addresses to .env.local
   NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS=<deployed_address>
   ```

4. **Enable in Environment:**
   ```bash
   NEXT_PUBLIC_ENABLE_BLOCKCHAIN=true
   ```

5. **Restart Development Server:**
   ```bash
   npm run dev
   ```

---

## 📁 File Structure

### Blockchain-Related Files

```
dashboard/
├── src/
│   ├── lib/
│   │   ├── wagmi/
│   │   │   └── config.ts          # Wagmi configuration
│   │   └── env.ts                 # Environment validation
│   ├── hooks/
│   │   ├── use-contract.ts        # Smart contract hooks
│   │   └── use-web3.ts            # Web3 connection hooks
│   ├── components/
│   │   └── providers.tsx          # Wagmi provider wrapper
│   └── types/
│       └── index.ts               # Blockchain types
└── app/
    └── dashboard/
        └── blockchain/
            └── page.tsx            # Blockchain status page
```

### Key Files Explained

#### 1. `src/lib/wagmi/config.ts`
**Purpose:** Configure Wagmi for Base L2

```typescript
import { createConfig, http } from "wagmi"
import { base, baseSepolia } from "wagmi/chains"
import { injected, walletConnect } from "wagmi/connectors"
import { env } from "@/lib/env"

const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

export const CONTRACT_ADDRESSES = {
  [base.id]: {
    microCropInsurance: env.NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS,
    usdcToken: env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS,
  },
}
```

#### 2. `src/hooks/use-contract.ts`
**Purpose:** React hooks for smart contract interactions

```typescript
import { useWriteContract, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/wagmi/config'

// Create policy on-chain
export function useCreatePolicy() {
  const { writeContract } = useWriteContract()
  
  return {
    createPolicy: (policyId, farmer, premium, sumInsured) => {
      return writeContract({
        address: CONTRACT_ADDRESSES[base.id].microCropInsurance,
        abi: MicroCropInsuranceABI,
        functionName: 'createPolicy',
        args: [policyId, farmer, premium, sumInsured],
      })
    }
  }
}

// Purchase policy with USDC
export function usePurchasePolicy() {
  // Implementation...
}

// Submit claim
export function useSubmitClaim() {
  // Implementation...
}
```

#### 3. `src/components/providers.tsx`
**Purpose:** Wrap app with Wagmi provider

```typescript
'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi/config'

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient()

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## 🎯 Features

### When Blockchain is Enabled

1. **Wallet Connection** ✅
   - Connect MetaMask, WalletConnect, Coinbase Wallet
   - Display connected address and balance
   - Network switching (Base mainnet/testnet)

2. **On-Chain Policies** ✅
   - Create policies on blockchain
   - Purchase with USDC payment
   - View policy details from chain
   - Policy ownership verification

3. **Claims Processing** ✅
   - Submit claims on-chain
   - Admin approval/rejection
   - Automatic payout to farmer wallet
   - Claim history tracking

4. **Payments** ✅
   - USDC premium payments
   - On-chain payment verification
   - Automatic claim payouts
   - Transaction history

5. **Blockchain Dashboard** ✅
   - `/dashboard/blockchain` page shows:
     - Wallet connection status
     - Contract addresses
     - Recent transactions
     - Network information

---

## 🚫 When Blockchain is Disabled (Default)

All features work **without blockchain**:

1. **Policies** → Stored in database only
2. **Payments** → Tracked via backend API
3. **Claims** → Processed via admin portal
4. **Farmers** → No wallet required

**Blockchain page shows:**
> "Blockchain features are currently disabled. Enable in environment configuration."

---

## 🔐 Security Considerations

### Smart Contract Security

1. **Not Audited** ⚠️
   - Smart contracts have NOT been audited
   - Use at your own risk
   - Recommended for testnet/demo only

2. **Access Control** ✅
   - Only admins can approve claims
   - Policy creation restricted
   - Role-based permissions

3. **USDC Token** ✅
   - Using official Circle USDC contract
   - Trusted stablecoin on Base

### Wallet Security

1. **Private Keys:**
   - Never stored on server
   - User controls their wallet
   - WalletConnect for secure connection

2. **Transaction Signing:**
   - User must approve each transaction
   - Clear transaction details shown
   - Gas fees displayed

---

## 🧪 Testing

### Testnet Testing (Base Sepolia)

1. **Get Test ETH:**
   ```
   https://www.alchemy.com/faucets/base-sepolia
   ```

2. **Get Test USDC:**
   ```
   Deploy test USDC or use faucet
   ```

3. **Switch Network:**
   ```typescript
   // In your wallet, switch to Base Sepolia
   Chain ID: 84532
   RPC URL: https://sepolia.base.org
   ```

4. **Test Scenarios:**
   - [ ] Connect wallet
   - [ ] Create policy
   - [ ] Purchase policy with USDC
   - [ ] Submit claim
   - [ ] Approve claim (admin)
   - [ ] Verify payout

### Local Development

```bash
# 1. Start local blockchain (optional)
anvil

# 2. Deploy contracts locally
cd ../../Contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# 3. Update .env.local with local addresses

# 4. Connect MetaMask to localhost:8545

# 5. Test transactions
```

---

## 📊 Contract ABIs

### MicroCropInsurance ABI

```typescript
export const MicroCropInsuranceABI = [
  {
    name: "createPolicy",
    type: "function",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "farmer", type: "address" },
      { name: "premium", type: "uint256" },
      { name: "sumInsured", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    name: "purchasePolicy",
    type: "function",
    inputs: [
      { name: "policyId", type: "uint256" },
      { name: "farmer", type: "address" },
      { name: "premium", type: "uint256" },
      { name: "sumInsured", type: "uint256" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  // ... more functions
]
```

*Full ABI defined in `src/hooks/use-contract.ts`*

---

## 🔄 Migration Path

### From Off-Chain to On-Chain

If you start without blockchain and later want to enable it:

1. **Existing Policies:**
   - Can be migrated to blockchain
   - Use bulk migration script
   - Verify data consistency

2. **Existing Claims:**
   - Historical claims stay off-chain
   - New claims use blockchain
   - Hybrid approach supported

3. **Farmer Wallets:**
   - Farmers need to connect wallet
   - Wallet address linked to farmer ID
   - One-time setup per farmer

---

## 🐛 Troubleshooting

### Common Issues

**1. "Blockchain features are disabled"**
```bash
# Solution: Enable in .env.local
NEXT_PUBLIC_ENABLE_BLOCKCHAIN=true
```

**2. "WalletConnect Project ID required"**
```bash
# Solution: Get ID from https://cloud.reown.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=abc123...
```

**3. "Contract address not set"**
```bash
# Solution: Deploy contracts and update env
NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS=0x...
```

**4. "Wrong network"**
```
# Solution: Switch to Base in wallet
- Open wallet (MetaMask)
- Switch network to "Base"
- Refresh page
```

**5. "Transaction failed: insufficient funds"**
```
# Solution: Get Base ETH for gas
- Visit https://bridge.base.org
- Bridge ETH from Ethereum to Base
- Or use Base faucet for testnet
```

---

## 📈 Monitoring

### On-Chain Activity

**Block Explorers:**
- Base Mainnet: https://basescan.org
- Base Sepolia: https://sepolia.basescan.org

**Track:**
- Policy creations
- USDC transactions
- Claim submissions
- Contract interactions

---

## 🔮 Future Enhancements

### Planned Features

1. **Multi-Sig Admin** - Require multiple admins for claim approval
2. **Automated Payouts** - Oracle-based automatic claim verification
3. **Premium Pooling** - Cooperative treasury management
4. **Staking** - Earn yield on pooled premiums
5. **NFT Policies** - Policy as NFT for transferability
6. **Cross-Chain** - Support multiple L2s (Optimism, Arbitrum)

---

## 📚 Resources

### Documentation
- **Wagmi:** https://wagmi.sh
- **Viem:** https://viem.sh
- **Base:** https://docs.base.org
- **USDC:** https://www.circle.com/en/usdc

### Tools
- **WalletConnect:** https://cloud.reown.com
- **Base Bridge:** https://bridge.base.org
- **Base Faucet:** https://www.alchemy.com/faucets/base-sepolia

### Support
- **Discord:** [MicroCrop Community]
- **GitHub:** [Project Repository]
- **Docs:** [Project Documentation]

---

## ✅ Checklist: Enabling Blockchain

- [ ] Get WalletConnect Project ID from https://cloud.reown.com
- [ ] Deploy MicroCropInsurance contract to Base
- [ ] Update `NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS` in `.env.local`
- [ ] Update `NEXT_PUBLIC_USDC_CONTRACT_ADDRESS` in `.env.local`
- [ ] Update `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env.local`
- [ ] Set `NEXT_PUBLIC_ENABLE_BLOCKCHAIN=true` in `.env.local`
- [ ] Restart development server
- [ ] Test wallet connection on `/dashboard/blockchain`
- [ ] Test policy creation with blockchain
- [ ] Test claim submission and approval
- [ ] Verify USDC transactions on BaseScan

---

**Status:** Blockchain integration is **functional but optional**. All core features work without blockchain. Enable only if you need on-chain transparency and automated payments.

**Recommendation:** Start with blockchain **disabled** for faster onboarding. Enable later when ready to deploy smart contracts.
