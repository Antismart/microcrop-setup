# Claude Code Prompt for MicroCrop Backend Development

## Project Context for Claude Code

You are building the backend for **MicroCrop**, a parametric crop insurance platform for smallholder farmers in Kenya. The system provides automated insurance payouts when weather conditions (drought/flood) damage crops, verified through satellite imagery. Farmers interact via USSD on feature phones, and payouts are sent directly to M-Pesa.

## Technical Architecture Overview

**Core Technologies:**
- Node.js with Express.js
- PostgreSQL with Prisma ORM (TimescaleDB extension for time-series data)
- Redis for session management and caching
- RabbitMQ for message queuing
- Africa's Talking for USSD/SMS
- WeatherXM for weather data(check weatherxm.md for api docs)
- Spexi for satellite imagery(we dont have api at the moment yet)
- Swypt for M-Pesa payments(check swypt.io for docs)
- Ethereum smart contracts on Base L2

**How the System Works:**
1. Farmers register and add plots via USSD (*384*12345#)
2. They purchase parametric insurance (auto-triggers on weather events)
3. WeatherXM stations monitor rainfall, temperature, humidity
4. Spexi satellites track vegetation health (NDVI)
5. When drought/flood detected: Damage Index calculated → Smart contract triggered → Automatic M-Pesa payout
6. No claims process needed - fully automated

## Detailed Requirements

### 1. USSD Flow Implementation (`src/api/routes/ussd.routes.js`)

The USSD system must handle Africa's Talking POST requests with this flow:

**New User Journey:**
```
*384*12345# → Welcome Menu
1. Register → Enter Name → Enter ID → Select County → Enter SubCounty → Confirm
2. Add Plot → Enter Name → Enter Size (acres) → Select Crop → GPS (auto/manual)
3. Buy Insurance → Select Plot → Choose Coverage (Drought/Flood/Both) → View Premium → Confirm → M-Pesa Payment
```

**Existing User Menu:**
```
1. Buy Cover → Select Plot → Coverage Type → Payment
2. Check Policy → View Active Policies → Policy Details
3. Claim Status → View Pending/Paid Claims
4. My Account → Profile/Plots/Policies
```

**Session Management Requirements:**
- Store session state in Redis with 5-minute TTL
- Session key format: `ussd:${sessionId}`
- Handle USSD response format: `CON` (continue) or `END` (terminate)
- Parse input text split by `*` for navigation

### 2. Database Schema (Prisma)

```prisma
model Farmer {
  id          String   @id @default(uuid())
  phoneNumber String   @unique
  nationalId  String?  @unique
  firstName   String
  lastName    String
  county      String
  subCounty   String
  ward        String?
  village     String?
  kycStatus   KycStatus @default(PENDING)
  plots       Plot[]
  policies    Policy[]
}

model Plot {
  id               String   @id @default(uuid())
  farmerId         String
  name             String
  latitude         Float
  longitude        Float
  acreage          Float
  cropType         CropType
  plantingDate     DateTime?
  weatherStationId String?  // Nearest WeatherXM station
}

model Policy {
  id               String   @id @default(uuid())
  policyNumber     String   @unique
  farmerId         String
  plotId           String
  coverageType     CoverageType
  sumInsured       Float
  premium          Float
  startDate        DateTime
  endDate          DateTime
  status           PolicyStatus
  droughtThreshold Json     // {"rainfall_mm": 30, "period_days": 30}
  floodThreshold   Json     // {"rainfall_mm": 150, "period_hours": 48}
}

model WeatherEvent {
  id          String   @id @default(uuid())
  plotId      String
  stationId   String
  timestamp   DateTime
  rainfall    Float?   // mm
  temperature Float?   // Celsius
  humidity    Float?   // percentage
  windSpeed   Float?   // km/h
}

model SatelliteData {
  id          String   @id @default(uuid())
  plotId      String
  captureDate DateTime
  ndvi        Float    // Normalized Difference Vegetation Index (-1 to 1)
  evi         Float?   // Enhanced Vegetation Index
  cloudCover  Float?   // percentage
  imageUrl    String?
}

model DamageAssessment {
  id                 String   @id @default(uuid())
  policyId           String
  weatherStressIndex Float    // 0-1
  vegetationIndex    Float    // 0-1
  damageIndex        Float    // 0-1 (calculated)
  triggerDate        DateTime
  proofHash          String?  // IPFS hash
}

model Payout {
  id              String   @id @default(uuid())
  policyId        String
  amount          Float
  status          PayoutStatus
  transactionHash String?  // Blockchain tx
  mpesaRef        String?  // M-Pesa reference
  initiatedAt     DateTime
  completedAt     DateTime?
}
```

### 3. Core Services to Implement

#### Weather Service (`src/services/weather.service.js`)
```javascript
class WeatherService {
  // Webhook handler for WeatherXM real-time data
  async handleWeatherData(stationId, data) {
    // Store raw data in WeatherEvent table
    // Map station to nearby plots (within 50km radius)
    // Calculate rolling averages (7-day, 30-day)
    // Check drought triggers (rainfall < 20mm for 30 days)
    // Check flood triggers (rainfall > 150mm in 48 hours)
    // Queue damage assessment if triggered
  }
  
  async calculateWeatherStressIndex(plotId, dateRange) {
    // Fetch weather events for plot
    // Calculate cumulative rainfall deficit
    // Calculate heat stress (days > 35°C)
    // Return WSI score (0-1)
  }
}
```

#### Satellite Service (`src/services/satellite.service.js`)
```javascript
class SatelliteService {
  async fetchSatelliteImagery(plotId) {
    // Call Spexi API for plot coordinates
    // Download imagery (10m resolution)
    // Calculate NDVI: (NIR - Red) / (NIR + Red)
    // Store in SatelliteData table
    // Compare with baseline (pre-season or 3-year average)
  }
  
  async calculateVegetationStressIndex(plotId) {
    // Get latest NDVI vs baseline
    // If NDVI drop > 25%, flag vegetation stress
    // Return NVI score (0-1)
  }
}
```

#### Damage Calculator (`src/services/damage.service.js`)
```javascript
class DamageService {
  async calculateDamageIndex(policyId) {
    // Get Weather Stress Index (WSI)
    // Get Vegetation Index (NVI)
    // Calculate: DI = (0.6 * WSI) + (0.4 * NVI)
    // Determine payout percentage:
    //   DI < 0.3: No payout
    //   DI 0.3-0.6: 30-50% payout
    //   DI > 0.6: 100% payout
    // Generate proof package for blockchain
    // Queue payout if threshold exceeded
  }
}
```

#### Payment Service (`src/services/payment.service.js`)
```javascript
class PaymentService {
  async initiatePremiumCollection(farmerId, amount) {
    // Trigger M-Pesa STK push via Swypt API
    // Store transaction as PENDING
    // Return payment reference
  }
  
  async handlePaymentCallback(data) {
    // Verify Swypt webhook signature
    // Update transaction status
    // If successful, activate policy
    // Send SMS confirmation
  }
  
  async processPayout(payoutId) {
    // Get payout details
    // Call Swypt API to send M-Pesa
    // Update payout status
    // Record on blockchain
  }
}
```

### 4. Background Workers (`src/workers/`)

#### Weather Ingestion Worker
- Consumes from `weather_ingestion` queue
- Processes WeatherXM data
- Calculates indices
- Checks trigger conditions

#### Satellite Processing Worker  
- Consumes from `satellite_processing` queue
- Fetches Spexi imagery
- Calculates NDVI/EVI
- Detects anomalies

#### Damage Assessment Worker
- Consumes from `damage_calculation` queue
- Combines weather + satellite data
- Calculates damage index
- Triggers payouts if threshold met

#### Payout Processor Worker
- Consumes from `payout_trigger` queue
- Executes M-Pesa transfers
- Updates blockchain
- Sends notifications

### 5. API Endpoints to Create

```javascript
// USSD
POST /api/ussd - Africa's Talking USSD handler

// Farmers
POST /api/farmers/register - Register new farmer
GET /api/farmers/:id - Get farmer details
PUT /api/farmers/:id/kyc - Update KYC status

// Plots
POST /api/plots - Add new plot
GET /api/plots/:farmerId - Get farmer's plots
PUT /api/plots/:id - Update plot details

// Policies
POST /api/policies/quote - Get insurance quote
POST /api/policies/purchase - Purchase policy
GET /api/policies/:farmerId - Get farmer's policies
GET /api/policies/:id/status - Check policy status

// Weather
POST /api/weather/webhook - WeatherXM webhook
GET /api/weather/station/:id - Get station data
GET /api/weather/plot/:plotId - Get plot weather history

// Satellite
POST /api/satellite/webhook - Spexi webhook
GET /api/satellite/plot/:plotId - Get plot imagery
POST /api/satellite/trigger-capture - Request new imagery

// Payments
POST /api/payments/initiate - Start M-Pesa payment
POST /api/payments/callback - Payment webhook
GET /api/payments/status/:ref - Check payment status

// Claims & Payouts
GET /api/claims/:policyId - Get claims for policy
GET /api/payouts/:farmerId - Get farmer's payouts
POST /api/payouts/process - Manually trigger payout

// Admin
GET /api/admin/dashboard - Dashboard metrics
POST /api/admin/weather/simulate - Simulate weather event
POST /api/admin/payout/approve - Manual payout approval
```

### 6. Integration Details

#### Africa's Talking USSD
- Receive POST with: sessionId, phoneNumber, serviceCode, text
- Response format: "CON message" or "END message"
- Handle session timeout (5 minutes)
- Support back navigation with "0"

#### WeatherXM Integration
```javascript
// Webhook payload structure
{
  "station_id": "wxm_station_123",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "temperature": 28.5,
    "rainfall": 2.3,
    "humidity": 65,
    "wind_speed": 12
  }
}
```

#### Spexi Satellite Integration
```javascript
// API call to fetch imagery
GET https://api.spexi.com/v1/imagery
Headers: { "X-API-Key": "your_key" }
Body: {
  "bbox": [longitude_min, latitude_min, longitude_max, latitude_max],
  "date_from": "2024-01-01",
  "date_to": "2024-01-15",
  "resolution": 10
}
```

#### Swypt M-Pesa Integration
```javascript
// STK Push request
POST https://api.swypt.com/v1/payment/stkpush
{
  "phone": "254700000000",
  "amount": 500,
  "reference": "POL-123456",
  "callback_url": "https://your-api/payments/callback"
}
```

### 7. Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/microcrop

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ  
RABBITMQ_URL=amqp://user:pass@localhost:5672

# Africa's Talking
AT_USERNAME=sandbox
AT_API_KEY=your_api_key
AT_SHORTCODE=*384*12345#

# WeatherXM
WEATHERXM_API_KEY=your_key
WEATHERXM_WEBHOOK_SECRET=secret

# Spexi
SPEXI_API_KEY=your_key
SPEXI_API_URL=https://api.spexi.com/v1

# Swypt
SWYPT_API_KEY=your_key
SWYPT_MERCHANT_ID=merchant_id
SWYPT_WEBHOOK_SECRET=secret

# Blockchain
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
CONTRACT_ADDRESS=0x...
ORACLE_PRIVATE_KEY=0x...
```

### 8. Error Handling Requirements

- Implement global error handler middleware
- Log all errors with context (user, request, timestamp)
- Return user-friendly error messages in USSD
- Implement retry logic for external API calls
- Dead letter queue for failed messages
- Circuit breaker for external services

### 9. Security Requirements

- Validate all USSD input (SQL injection, XSS)
- Verify webhook signatures (HMAC-SHA256)
- Rate limit API endpoints (100 requests/minute)
- Encrypt sensitive data (national IDs, private keys)
- Use JWT for admin authentication
- Implement CORS properly
- Audit log all financial transactions

### 10. Testing Requirements

- Unit tests for all services
- Integration tests for API endpoints
- USSD flow end-to-end tests
- Mock external services (WeatherXM, Spexi, Swypt)
- Load testing for 10,000 concurrent USSD sessions
- Test payout calculations with various scenarios

## Implementation Order

1. **First**: Set up Express server with  middleware
2. **Second**: Implement Prisma models and migrations
3. **Third**: Create USSD registration and menu flow
4. **Fourth**: Build weather data ingestion and storage
5. **Fifth**: Implement satellite data processing
6. **Sixth**: Create damage calculation engine
7. **Seventh**: Add payment integration
8. **Eighth**: Build admin dashboard APIs
9. **Ninth**: Implement background workers
10. **Finally**: Add monitoring and error handling

## Success Criteria

The backend is complete when:
- Farmers can register and buy insurance via USSD
- Weather data is automatically ingested and processed
- Satellite imagery is analyzed for vegetation health
- Damage calculations trigger automatic payouts
- Payments are processed via M-Pesa
- All data is properly logged and auditable
- System can handle 10,000+ active policies
- Response time < 200ms for USSD requests

Build this incrementally, testing each component thoroughly before moving to the next. Focus on making the USSD flow smooth since farmers will use feature phones with limited connectivity.