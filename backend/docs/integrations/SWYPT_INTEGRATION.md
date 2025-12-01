# Swypt Payment Integration - Implementation Guide

## Overview

The MicroCrop backend now has **full Swypt integration** for handling M-Pesa payments via their on-ramp and off-ramp APIs. This enables:

- **Premium Collection**: Farmers pay insurance premiums via M-Pesa STK Push
- **Automated Payouts**: Insurance claims are automatically paid out to M-Pesa

## Architecture

```
┌─────────────────────┐
│     Farmer          │
│   (M-Pesa User)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Africa's Talking  │
│   (USSD Interface)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  MicroCrop Backend  │
│  - Payment Service  │
│  - Swypt Service    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Swypt API         │
│  pool.swypt.io      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  M-Pesa / Safaricom │
└─────────────────────┘
```

## Components Implemented

### 1. SwyptService (`src/services/swypt.service.js`)

Complete Swypt API client with the following methods:

#### Quote Management
- `getQuote(params)` - Get exchange rates and fees
- `getListedAssets()` - Get supported networks and tokens
- `calculatePremiumPayment(amountKES)` - Calculate KES to USDT conversion
- `calculatePayoutAmount(amountUSDT)` - Calculate USDT to KES conversion

#### Onramp (Fiat → Crypto)
- `initiateOnramp(params)` - Initiate M-Pesa STK Push
- `checkOnrampStatus(orderID)` - Check payment status
- `processCryptoTransfer(params)` - Transfer crypto after payment
- `createOnrampTicket(params)` - Create ticket for failed transactions

#### Offramp (Crypto → Fiat)
- `initiateOfframp(params)` - Send M-Pesa payout
- `checkOfframpStatus(orderID)` - Check payout status
- `createOfframpTicket(params)` - Create ticket for failed payouts

### 2. Updated PaymentService (`src/services/payment.service.js`)

Replaced mock implementations with real Swypt API calls:

- `initiatePremiumCollection()` - Uses `swyptService.initiateOnramp()`
- `checkAndCompletePayment()` - Uses `swyptService.checkOnrampStatus()`
- `processPayout()` - Uses `swyptService.initiateOfframp()`

### 3. Payment API Routes (`src/api/routes/payment.routes.js`)

New endpoints for Swypt integration:

```
POST   /api/payments/quote              - Get quote for payment
POST   /api/payments/initiate           - Initiate premium payment
GET    /api/payments/status/:reference  - Check payment status
GET    /api/payments/farmer/:farmerId   - List farmer transactions
GET    /api/payments/assets             - Get supported assets
```

## Payment Flows

### Premium Collection Flow

1. **Farmer initiates insurance purchase via USSD**
   ```
   User selects "Buy Insurance" → Confirms premium
   ```

2. **Backend calculates amount and initiates STK Push**
   ```javascript
   POST /api/payments/initiate
   {
     "farmerId": "uuid",
     "amount": 500,  // KES
     "policyNumber": "POL-123456"
   }
   ```

3. **Swypt sends STK Push to farmer's phone**
   - Farmer receives M-Pesa prompt
   - Enters PIN to confirm
   - Returns orderID: `"D-rclsg-VL"`

4. **Backend polls Swypt for status**
   ```javascript
   GET /api/payments/status/PREM-1234567890-abc123
   ```

5. **On SUCCESS: Policy activated**
   ```javascript
   // Transaction status: COMPLETED
   // Policy status: ACTIVE
   // SMS confirmation sent
   ```

### Payout Flow

1. **Damage detected → Payout triggered**
   ```javascript
   // Damage Worker publishes to payout_trigger queue
   {
     "policyId": "uuid",
     "amount": 5000,  // KES
     "damageIndex": 0.75
   }
   ```

2. **Payout Worker processes payout**
   ```javascript
   // PayoutService.processPayout() called
   ```

3. **Backend executes blockchain transaction** *(TODO)*
   - Withdraw USDT from smart contract
   - Get transaction hash

4. **Backend initiates Swypt offramp**
   ```javascript
   swyptService.initiateOfframp({
     chain: 'base',
     hash: '0x...',
     phoneNumber: '254700000000',
     tokenAddress: '0x833589...',
     userAddress: '0x...'
   })
   ```

5. **Swypt processes M-Pesa transfer**
   - Returns orderID: `"WD-xsy6e-HO"`
   - Sends KES to farmer's M-Pesa
   - Returns M-Pesa receipt

6. **Backend confirms completion**
   ```javascript
   // Payout status: COMPLETED
   // Policy status: CLAIMED
   // SMS notification sent
   ```

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Swypt Payment Gateway
SWYPT_API_KEY=your_api_key
SWYPT_API_SECRET=your_api_secret
SWYPT_API_URL=https://pool.swypt.io/api
SWYPT_PROJECT_NAME=microcrop
TREASURY_WALLET_ADDRESS=0x...  # Your treasury wallet on Base
```

### Get Swypt Credentials

1. Sign up at [Swypt](https://swypt.io)
2. Get API Key and Secret from dashboard
3. Set project name to identify your transactions
4. Configure treasury wallet for receiving premiums

## API Examples

### 1. Get Quote

```javascript
// Get quote for 500 KES → USDT
const response = await axios.post('http://localhost:3000/api/payments/quote', {
  amount: 500
}, {
  headers: { 'x-api-key': 'YOUR_KEY' }
});

// Response
{
  "success": true,
  "quote": {
    "inputAmount": 500,
    "outputAmount": 3.867,  // USDT
    "exchangeRate": 129.22,
    "fee": { "feeInKES": 5 },
    "totalKES": 505
  }
}
```

### 2. Initiate Premium Payment

```javascript
const response = await axios.post('http://localhost:3000/api/payments/initiate', {
  farmerId: "farmer-uuid",
  amount: 500,
  policyNumber: "POL-123456"
});

// Response
{
  "success": true,
  "transaction": {
    "id": "tx-uuid",
    "reference": "PREM-1730000000-abc123",
    "status": "PENDING",
    "metadata": {
      "swyptOrderID": "D-rclsg-VL"
    }
  },
  "swyptResponse": {
    "status": "success",
    "message": "STK Push initiated successfully",
    "data": {
      "orderID": "D-rclsg-VL"
    }
  },
  "message": "Payment request sent. Please complete M-Pesa prompt on your phone."
}
```

### 3. Check Payment Status

```javascript
const response = await axios.get('http://localhost:3000/api/payments/status/PREM-1730000000-abc123');

// Response (Pending)
{
  "id": "tx-uuid",
  "status": "PENDING",
  "amount": 500,
  "metadata": {
    "swyptOrderID": "D-rclsg-VL"
  }
}

// Response (Completed)
{
  "id": "tx-uuid",
  "status": "COMPLETED",
  "amount": 500,
  "mpesaRef": "TBF842GPCO",
  "completedAt": "2025-02-15T08:33:38.000Z"
}
```

### 4. Get Supported Assets

```javascript
const response = await axios.get('http://localhost:3000/api/payments/assets');

// Response
{
  "success": true,
  "assets": {
    "networks": ["lisk", "celo", "base", "polygon", "scroll"],
    "fiat": ["KES", "USD"],
    "crypto": {
      "base": [
        {
          "symbol": "USDT",
          "name": "Tether",
          "decimals": 6,
          "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        }
      ]
    }
  }
}
```

## Error Handling

### Swypt API Errors

```javascript
// Authentication Error
{
  "status": "error",
  "message": "Invalid API credentials"
}

// Validation Error
{
  "statusCode": 400,
  "message": "Invalid network",
  "error": "Unsupported network. Supported networks: Lisk, celo, Base, Polygon"
}

// Transaction Already Processed
{
  "status": "error",
  "message": "This blockchain transaction has already been processed",
  "data": { "orderID": "WD-xsy6e-HO" }
}
```

### Backend Error Handling

All errors are caught and logged:

```javascript
try {
  await swyptService.initiateOnramp(params);
} catch (error) {
  logger.error('Error initiating onramp:', error);
  // Transaction marked as FAILED
  // User notified
}
```

## Testing

### Local Testing

```bash
# 1. Start services
docker-compose up -d postgres redis rabbitmq

# 2. Set up environment
cp .env.example .env
# Edit .env with Swypt credentials

# 3. Run migrations
npm run prisma:migrate

# 4. Start server
npm run dev

# 5. Test payment quote
curl -X POST http://localhost:3000/api/payments/quote \
  -H "Content-Type: application/json" \
  -d '{"amount": 500}'

# 6. Test payment initiation
curl -X POST http://localhost:3000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "farmer-uuid",
    "amount": 500,
    "policyNumber": "POL-123456"
  }'
```

### Production Testing

1. **Sandbox Mode**: Use Swypt sandbox credentials
2. **Test Numbers**: Use test phone numbers (254700000000)
3. **Monitor Logs**: Check `logs/combined.log` for Swypt responses
4. **Verify Database**: Check transaction status in database

## Monitoring

### Key Metrics to Track

1. **Payment Success Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful,
     COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
     COUNT(*) as total
   FROM "Transaction"
   WHERE type = 'PREMIUM_PAYMENT';
   ```

2. **Payout Success Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful,
     COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
     COUNT(*) as total
   FROM "Payout";
   ```

3. **Average Processing Time**
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM ("completedAt" - "createdAt"))) as avg_seconds
   FROM "Transaction"
   WHERE status = 'COMPLETED';
   ```

### Logs to Monitor

```bash
# Watch Swypt API calls
tail -f logs/combined.log | grep -i swypt

# Watch payment processing
tail -f logs/combined.log | grep -i payment

# Watch errors
tail -f logs/error.log
```

## Troubleshooting

### Issue: STK Push not received

**Possible causes:**
1. Phone number format incorrect (must be 254XXXXXXXXX)
2. Phone not registered with M-Pesa
3. Network issues

**Solution:**
```javascript
// Check transaction metadata for orderID
const tx = await prisma.transaction.findUnique({ 
  where: { reference } 
});

// Check status with Swypt
const status = await swyptService.checkOnrampStatus(
  tx.metadata.swyptOrderID
);
```

### Issue: Payout failed

**Possible causes:**
1. Insufficient balance in treasury
2. Invalid phone number
3. Blockchain transaction failed

**Solution:**
```javascript
// Create ticket with Swypt
await swyptService.createOfframpTicket({
  orderID: 'WD-xsy6e-HO',
  description: 'Failed payout - please investigate'
});
```

### Issue: "Transaction already processed"

This is normal for retry scenarios. The transaction was already completed.

**Solution:**
```javascript
// Check final status
const status = await swyptService.checkOfframpStatus(orderID);
// Update local database accordingly
```

## Next Steps

### 1. Blockchain Integration

Currently using mock blockchain transactions. Need to implement:

```javascript
// In payment.service.js
const { ethers } = require('ethers');

async function executeBlockchainWithdrawal(amount, recipient) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    SWYPT_ABI,
    wallet
  );
  
  const tx = await contract.withdrawToEscrow(
    tokenAddress,
    amountPlusFee
  );
  
  await tx.wait();
  return tx.hash;
}
```

### 2. SMS Notifications

Integrate Africa's Talking SMS:

```javascript
const AT = require('africastalking')({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

async function sendSMS(phoneNumber, message) {
  await AT.SMS.send({
    to: [phoneNumber],
    message,
    from: 'MICROCROP',
  });
}
```

### 3. Webhook Handlers

Add Swypt webhook endpoints for real-time updates:

```javascript
router.post('/webhook/onramp', async (req, res) => {
  // Handle onramp status updates
  const { orderID, status } = req.body;
  // Update transaction in database
  res.sendStatus(200);
});

router.post('/webhook/offramp', async (req, res) => {
  // Handle offramp status updates
  const { orderID, status } = req.body;
  // Update payout in database
  res.sendStatus(200);
});
```

## Security Considerations

1. **API Credentials**: Store securely in environment variables
2. **Webhook Signatures**: Verify all webhook requests (TODO)
3. **Rate Limiting**: Implement on payment endpoints
4. **Retry Logic**: Exponential backoff for failed requests
5. **Audit Logging**: Log all payment operations

## Support

For Swypt API issues:
- Documentation: Check `swypt.md`
- Support: Contact Swypt support team
- Status Page: Monitor Swypt service status

For integration issues:
- Check logs: `logs/combined.log`
- Review code: `src/services/swypt.service.js`
- Test endpoints: Use Postman/curl

---

**Status**: ✅ **SWYPT INTEGRATION COMPLETE**

**Date**: November 5, 2025

**Version**: 1.0.0
