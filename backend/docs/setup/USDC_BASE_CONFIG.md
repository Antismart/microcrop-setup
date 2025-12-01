# Swypt Integration - USDC on Base Configuration

## ⚡ Simplified Setup

The MicroCrop backend is configured to **ONLY use USDC on Base** for all payments. This simplifies the integration and reduces complexity.

---

## 🎯 Configuration

### Hardcoded Values

```javascript
// In src/services/swypt.service.js
const NETWORK = 'base';
const CRYPTO_CURRENCY = 'USDC';
const USDC_TOKEN_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const FIAT_CURRENCY = 'KES';
```

### Environment Variables

```bash
# Swypt API
SWYPT_API_KEY=your_key
SWYPT_API_SECRET=your_secret
SWYPT_API_URL=https://pool.swypt.io/api
SWYPT_PROJECT_NAME=microcrop

# Treasury wallet on Base
TREASURY_WALLET_ADDRESS=0x...

# USDC Token Address on Base (Mainnet)
USDC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

## 📝 Simplified API Methods

### SwyptService

All methods now automatically use USDC on Base:

```javascript
// Get quote (automatically uses USDC on Base)
await swyptService.getQuote('onramp', 500); // KES to USDC
await swyptService.getQuote('offramp', 10, 'B2C'); // USDC to KES

// Initiate onramp (KES to USDC)
await swyptService.initiateOnramp(
  '254703710518',  // phone number
  500,             // amount in KES
  '0x...'          // wallet address
);

// Initiate offramp (USDC to KES)
await swyptService.initiateOfframp(
  '0x...',         // transaction hash
  '254703710518',  // phone number  
  '0x...'          // wallet address
);

// Get token info
swyptService.getTokenAddress(); // Returns: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
swyptService.getNetwork();      // Returns: 'base'
```

### PaymentService

```javascript
// Initiate premium payment (simplified signature)
await PaymentService.initiatePremiumCollection(
  farmerId,
  policyId,
  amount,      // in KES
  phoneNumber
);
```

---

## 🔗 Payment Flow

### Premium Collection

```
1. Farmer confirms purchase via USSD
2. Backend calls swyptService.initiateOnramp(phone, amountKES, treasuryAddress)
3. Swypt sends STK Push to farmer's phone
4. Farmer enters M-Pesa PIN
5. M-Pesa deducts KES → Swypt converts to USDC
6. USDC sent to treasury wallet on Base
7. Policy activated
```

### Claim Payout

```
1. Damage detected → Payout triggered
2. Smart contract withdraws USDC from treasury on Base
3. Backend calls swyptService.initiateOfframp(txHash, phone, treasuryAddress)
4. Swypt converts USDC → KES
5. KES sent to farmer's M-Pesa
6. Payout completed
```

---

## 💰 USDC on Base Details

### Token Information

- **Network**: Base (Ethereum L2)
- **Token**: USDC (USD Coin)
- **Contract Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Decimals**: 6
- **Symbol**: USDC

### Why USDC on Base?

1. **Low Fees**: Base has ~$0.01 transaction costs
2. **Fast**: 2-second block times
3. **Stable**: USDC is 1:1 pegged to USD
4. **Liquid**: Easy conversion to/from KES via Swypt
5. **Simple**: No need to manage multiple tokens/chains

---

## 🧪 Testing

### Check Configuration

```javascript
const swyptService = require('./src/services/swypt.service');

console.log('Network:', swyptService.getNetwork());      // base
console.log('Token:', swyptService.getTokenAddress());   // 0x833589fC...
```

### Test Quote

```javascript
// Get quote for 500 KES premium
const quote = await swyptService.getQuote('onramp', 500);
console.log('500 KES =', quote.data.outputAmount, 'USDC');
```

### Test Payment Initiation

```javascript
const result = await PaymentService.initiatePremiumCollection(
  'farmer-id',
  'policy-id',
  500,
  '254700000000'
);

console.log('STK Push sent:', result.success);
console.log('Swypt Order ID:', result.swyptResponse.data.orderID);
```

---

## 📊 Exchange Rates

Swypt provides real-time exchange rates:

```javascript
const quote = await swyptService.calculatePremiumPayment(500);
// Returns:
{
  inputAmount: 500,          // KES
  outputAmount: 3.85,        // USDC (500/130 approx)
  exchangeRate: 129.87,      // KES per USDC
  fee: { feeInKES: 5 },
  totalKES: 505              // includes fees
}
```

---

## ⚠️ Important Notes

1. **No Other Chains**: Only Base is supported
2. **No Other Tokens**: Only USDC is accepted
3. **Mainnet Address**: Make sure to use mainnet USDC address for production
4. **Testnet**: For Base Sepolia testnet, USDC address may be different

---

## 🔐 Security

- **Treasury Wallet**: Must be secure (hardware wallet recommended)
- **Private Keys**: Never commit to git
- **API Keys**: Store in environment variables only
- **Base Network**: Verify all transactions on Base blockchain explorer

---

## 📚 Related Documentation

- [SWYPT_INTEGRATION.md](./SWYPT_INTEGRATION.md) - Full Swypt integration guide
- [BUILD_SUMMARY.md](./BUILD_SUMMARY.md) - Overall system documentation

---

**Status**: ✅ **CONFIGURED FOR USDC ON BASE ONLY**

**Token Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

**Network**: Base

**Last Updated**: November 5, 2025
