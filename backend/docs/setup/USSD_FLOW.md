# USSD Flow Quick Reference

## Service Code
`*384*12345#`

## New User Flow

### 1. Welcome Screen
```
CON Welcome to MicroCrop Insurance!
Please enter your full name:
```

### 2. Enter Name
```
User enters: John Doe
```

### 3. Request ID
```
CON Enter your National ID number:
```

### 4. Enter ID
```
User enters: 12345678
```

### 5. Select County
```
CON Select your County:
1. Nairobi
2. Kiambu
3. Machakos
4. Nakuru
5. Kisumu
6. Meru
7. Other
```

### 6. Select County Option
```
User enters: 2
```

### 7. Enter Sub-County
```
CON Enter your Sub-County name in Kiambu:
```

### 8. Enter Sub-County Name
```
User enters: Kikuyu
```

### 9. Confirmation
```
CON Confirm your details:
Name: John Doe
ID: 12345678
County: Kiambu
Sub-County: Kikuyu

1. Confirm
2. Cancel
```

### 10. Complete Registration
```
User enters: 1

END Registration successful! You will receive an SMS once your account is verified. Dial *384*12345# again to continue.
```

---

## Existing User Flow

### Main Menu
```
CON Welcome back, John!
1. Buy Insurance
2. Check Policy
3. Claim Status
4. My Account
5. Add Plot
```

---

## Buy Insurance Flow

### 1. Select from Main Menu
```
User enters: 1
```

### 2. Select Plot
```
CON Select plot to insure:
1. North Farm (5 acres)
2. South Farm (3 acres)
0. Back
```

### 3. Choose Plot
```
User enters: 1
```

### 4. Select Coverage
```
CON Select coverage type:
1. Drought Only (KES 500/acre)
2. Flood Only (KES 400/acre)
3. Both (KES 800/acre)
0. Back
```

### 5. Choose Coverage
```
User enters: 3
```

### 6. Review Quote
```
CON Insurance Quote:
Plot: North Farm
Coverage: BOTH
Premium: KES 4000
Sum Insured: KES 40000

1. Confirm & Pay
0. Cancel
```

### 7. Confirm Purchase
```
User enters: 1

END Payment request sent to 254700000000.
Policy: POL-1730000000000-abc123
Amount: KES 4000

Complete payment to activate your policy.
```

---

## Check Policy Flow

### Select from Main Menu
```
User enters: 2

END Your Policies:

1. POL-1730000000000-abc123
Plot: North Farm
Status: ACTIVE
Coverage: BOTH

2. POL-1729500000000-def456
Plot: South Farm
Status: PENDING_PAYMENT
Coverage: DROUGHT
```

---

## Claim Status Flow

### Select from Main Menu
```
User enters: 3

END Recent Claims:

1. KES 20000
Status: COMPLETED
M-Pesa Ref: MPesa-1730000000000

2. KES 15000
Status: PROCESSING
```

---

## My Account Flow

### Select from Main Menu
```
User enters: 4

END Account Details:
Name: John Doe
Phone: 254700000000
County: Kiambu
Plots: 2
Active Policies: 1
KYC Status: APPROVED
```

---

## Add Plot Flow

### 1. Select from Main Menu
```
User enters: 5
```

### 2. Enter Plot Name
```
CON Enter plot name:
```

### 3. Name Entry
```
User enters: West Farm
```

### 4. Enter Acreage
```
CON Enter plot size (in acres):
```

### 5. Acreage Entry
```
User enters: 4.5
```

### 6. Select Crop
```
CON Select crop type:
1. Maize
2. Beans
3. Potatoes
4. Wheat
5. Vegetables
6. Other
```

### 7. Crop Selection
```
User enters: 1
```

### 8. Enter Latitude
```
CON Enter latitude (e.g. -1.2921):
```

### 9. Latitude Entry
```
User enters: -1.2921
```

### 10. Enter Longitude
```
CON Enter longitude (e.g. 36.8219):
```

### 11. Longitude Entry
```
User enters: 36.8219

END Plot added successfully! You can now purchase insurance for this plot.
```

---

## Navigation

- **Continue:** User enters a number or text
- **Back:** User enters `0` (where supported)
- **End Session:** Server sends `END` message

## Response Format

- `CON <message>` - Continue session, expect more input
- `END <message>` - Terminate session, final message

## Session Management

- Sessions stored in Redis with 5-minute TTL
- Session key: `ussd:${sessionId}`
- Automatic cleanup on expiry

## Testing with cURL

```bash
# New user registration
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "ATUid_test123",
    "phoneNumber": "+254700000000",
    "serviceCode": "*384*12345#",
    "text": ""
  }'

# Continue session (enter name)
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "ATUid_test123",
    "phoneNumber": "+254700000000",
    "serviceCode": "*384*12345#",
    "text": "John Doe"
  }'

# Multiple steps (separated by *)
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "ATUid_test123",
    "phoneNumber": "+254700000000",
    "serviceCode": "*384*12345#",
    "text": "1*1*3*1"
  }'
```

## Error Handling

- Invalid input returns same screen with error message
- Session timeout returns to start
- Database errors show generic error message
- All errors logged for debugging

## Premium Calculation

- Drought Only: KES 500/acre
- Flood Only: KES 400/acre
- Both: KES 800/acre
- Sum Insured: Premium × 10

## Payment Flow

1. User confirms purchase in USSD
2. System creates policy with PENDING_PAYMENT status
3. M-Pesa STK Push sent to phone
4. User enters PIN on phone
5. Swypt sends callback to `/api/payments/callback`
6. Policy status updated to ACTIVE
7. SMS confirmation sent

## Payout Triggers

### Drought
- Default: < 30mm rainfall in 30 days
- Configurable per policy

### Flood
- Default: > 150mm rainfall in 48 hours
- Configurable per policy

### Damage Assessment
- Weather Stress Index (WSI): 60% weight
- Vegetation Index (NVI): 40% weight
- Damage Index = (0.6 × WSI) + (0.4 × NVI)

### Payout Amounts
- DI < 0.3: No payout
- DI 0.3-0.6: 30-50% of sum insured
- DI > 0.6: 100% of sum insured

---

**Last Updated:** November 5, 2025
