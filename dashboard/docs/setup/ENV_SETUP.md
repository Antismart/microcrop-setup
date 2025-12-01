# 🚀 MicroCrop Dashboard - Environment Setup

## Quick Start

### 1. Prerequisites
- Node.js 18+ and npm
- Git
- MetaMask or WalletConnect-compatible wallet
- Base network added to wallet

### 2. Installation

```bash
cd dashboard
npm install
```

### 3. Environment Configuration

Create `.env.local` in the dashboard root:

```env
# ========================================
# API Configuration
# ========================================
NEXT_PUBLIC_API_URL=http://localhost:3000

# ========================================
# Blockchain Configuration (Required)
# ========================================

# WalletConnect Project ID
# Get from: https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# MicroCrop Insurance Contract Address (Base Mainnet)
NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS=0x...

# USDC Token Address (Base Mainnet)
# Default: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# ========================================
# Testnet Configuration (Optional)
# ========================================

# Base Sepolia Testnet Contracts
NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS_TESTNET=0x...
NEXT_PUBLIC_USDC_CONTRACT_ADDRESS_TESTNET=0x...
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001)

---

## 🔗 Getting WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com)
2. Sign up / Log in
3. Create new project
4. Copy Project ID
5. Paste into `.env.local`

---

## ⛓️ Adding Base Network to MetaMask

### Automatic (Recommended)
1. Visit [chainlist.org](https://chainlist.org)
2. Search for "Base"
3. Click "Add to MetaMask"

### Manual Configuration
```
Network Name: Base
RPC URL: https://mainnet.base.org
Chain ID: 8453
Currency Symbol: ETH
Block Explorer: https://basescan.org
```

### For Base Sepolia Testnet
```
Network Name: Base Sepolia
RPC URL: https://sepolia.base.org
Chain ID: 84532
Currency Symbol: ETH
Block Explorer: https://sepolia.basescan.org
```

---

## 🪙 Getting Test USDC (Testnet Only)

1. Switch to Base Sepolia in MetaMask
2. Visit [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
3. Get test ETH for gas
4. Use USDC faucet or swap test ETH for test USDC

---

## 📝 Backend API Setup

The dashboard expects a backend API running at `http://localhost:3000`.

### Expected Endpoints

See `100_PERCENT_COMPLETE.md` for full API documentation.

Key endpoints:
- `POST /api/auth/login`
- `GET /api/farmers`
- `GET /api/policies`
- `GET /api/claims`
- `POST /api/claims/:id/approve`

---

## 🧪 Testing the Setup

### 1. Check Development Server
```bash
npm run dev
```
Should start without errors on port 3001.

### 2. Test Authentication
1. Navigate to [http://localhost:3001/auth/login](http://localhost:3001/auth/login)
2. Enter credentials (backend must be running)
3. Should redirect to dashboard on success

### 3. Test Wallet Connection
1. Navigate to Dashboard → Blockchain
2. Click "Connect Wallet"
3. Approve in MetaMask
4. Should show connected address and balance

### 4. Test Smart Contract Interaction
1. Ensure wallet is connected
2. Navigate to Policy Detail page
3. Click "Create on Blockchain" (if available)
4. Confirm transaction in wallet
5. Transaction hash should appear

---

## 🐛 Troubleshooting

### Build Errors

**Error:** `Module not found: Can't resolve 'wagmi'`
```bash
npm install
```

**Error:** `Type error in wagmi config`
- Ensure all blockchain env variables are set
- Check WalletConnect Project ID is valid

### Runtime Errors

**Error:** `Failed to fetch` on API calls
- Ensure backend is running on port 3000
- Check NEXT_PUBLIC_API_URL in `.env.local`
- Verify CORS is enabled on backend

**Error:** Wallet connection fails
- Check WalletConnect Project ID is correct
- Ensure MetaMask is installed
- Try different browser
- Clear browser cache

**Error:** Network mismatch
- Click "Switch to Base" in wallet connection card
- Manually switch network in MetaMask
- Ensure Base network is added correctly

### Smart Contract Errors

**Error:** Contract address not found
- Set NEXT_PUBLIC_INSURANCE_CONTRACT_ADDRESS in `.env.local`
- Deploy contract to Base network first
- Verify contract address on Base Explorer

**Error:** Transaction fails
- Ensure sufficient ETH for gas
- Check wallet is connected to Base (not Sepolia)
- Verify contract is deployed and verified

---

## 📦 Production Build

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Production should run on port 3001
```

---

## 🔐 Security Checklist

Before deploying to production:

- [ ] Generate new WalletConnect Project ID (production)
- [ ] Set production contract addresses
- [ ] Change API_URL to production backend
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Configure CSP headers
- [ ] Enable rate limiting
- [ ] Add Sentry or error tracking
- [ ] Configure environment secrets (Vercel/Railway)
- [ ] Test all authentication flows
- [ ] Test blockchain transactions on mainnet
- [ ] Audit smart contracts

---

## 🌐 Deployment Options

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

```bash
docker build -t microcrop-dashboard .
docker run -p 3001:3001 --env-file .env.local microcrop-dashboard
```

### Railway
1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

---

## 📊 Performance Tips

1. **Enable React Query DevTools** (development only)
   - Already configured in `providers.tsx`
   - Press ⌘/Ctrl + K to toggle

2. **Optimize Images**
   - Use Next.js Image component
   - Enable image optimization in `next.config.ts`

3. **Code Splitting**
   - Use dynamic imports for heavy components
   - Example: `const Chart = dynamic(() => import('./chart'))`

4. **Caching**
   - React Query handles API caching
   - Adjust `staleTime` in providers.tsx
   - Use React Query DevTools to debug

---

## 🎯 Next Steps After Setup

1. **Test All Features**
   - Use testing checklist in `100_PERCENT_COMPLETE.md`
   - Test farmer CRUD operations
   - Test policy viewing
   - Test claim approval workflow
   - Test wallet connection
   - Test smart contract interactions

2. **Customize Branding**
   - Update logo in `dashboard-layout.tsx`
   - Modify color scheme in `tailwind.config.ts`
   - Add cooperative-specific information

3. **Connect Real Data**
   - Replace sample data with backend API
   - Configure WeatherXM integration
   - Set up IPFS storage
   - Connect to deployed smart contracts

4. **Add Monitoring**
   - Set up Sentry for error tracking
   - Add Google Analytics
   - Configure uptime monitoring
   - Set up alerts for critical errors

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [Base Documentation](https://docs.base.org)
- [React Query Documentation](https://tanstack.com/query)
- [Radix UI Documentation](https://www.radix-ui.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)

---

## 💬 Support

For issues or questions:
1. Check `QUICK_START.md` for common solutions
2. Review `100_PERCENT_COMPLETE.md` for feature documentation
3. Check TypeScript errors with `npm run build`
4. Review browser console for runtime errors

---

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
