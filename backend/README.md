# MicroCrop Backend

Backend for MicroCrop - A parametric crop insurance platform for smallholder farmers in Kenya.

**Role**: User-facing APIs (USSD, Admin) and business logic (damage assessment, payouts)

## Features

- ✅ USSD Interface (Africa's Talking integration)
- ✅ Admin APIs for cooperatives and administrators
- ✅ Farmer, policy, and claim management
- ✅ M-Pesa payment processing (Swypt)
- ✅ Smart contract integration (Base L2)
- ✅ Automated damage assessment (business logic)
- ✅ Payout processing (business logic)
- ✅ Background workers for async processing (Bull queue)

> **Note**: Weather and satellite data processing is handled by the separate `data-processor` service (Python/FastAPI). This backend calls the data-processor API for weather and biomass data.

## Tech Stack

- **Runtime:** Node.js 18 with Express.js 5
- **Database:** PostgreSQL 15 with Prisma ORM
- **Cache/Queue:** Redis with Bull
- **Logging:** Winston
- **Integrations:** Africa's Talking, Swypt, WeatherXM, Planet Labs (via data-processor)
- **Blockchain:** ethers.js (Base L2)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Data-processor service running (see `../data-processor/README.md`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npm run prisma:migrate
```

4. Generate Prisma client:
```bash
npm run prisma:generate
```

5. Seed the database (optional):
```bash
npm run db:seed
```

### Running the Application

#### Development Mode
```bash
# Start the API server
npm run dev

# Start background workers (in a separate terminal)
npm run workers
```

#### Production Mode
```bash
# Start the API server
npm start

# Start background workers (in a separate terminal)
NODE_ENV=production npm run workers
```

### Database Management

```bash
# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npm run db:reset

# Deploy migrations (production)
npm run prisma:migrate:deploy
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### USSD
- `POST /api/ussd` - Africa's Talking USSD handler

### Farmers
- `POST /api/farmers/register` - Register new farmer
- `GET /api/farmers/:id` - Get farmer details
- `PUT /api/farmers/:id/kyc` - Update KYC status

### Plots
- `POST /api/plots` - Add new plot
- `GET /api/plots/:farmerId` - Get farmer's plots
- `PUT /api/plots/:id` - Update plot details

### Policies
- `POST /api/policies/quote` - Get insurance quote
- `POST /api/policies/purchase` - Purchase policy
- `GET /api/policies/:farmerId` - Get farmer's policies
- `GET /api/policies/:id/status` - Check policy status

### Weather
- `POST /api/weather/webhook` - WeatherXM webhook
- `GET /api/weather/station/:id` - Get station data
- `GET /api/weather/plot/:plotId` - Get plot weather history

### Satellite
- `POST /api/satellite/webhook` - Spexi webhook
- `GET /api/satellite/plot/:plotId` - Get plot imagery
- `POST /api/satellite/trigger-capture` - Request new imagery

### Payments
- `POST /api/payments/initiate` - Start M-Pesa payment
- `POST /api/payments/callback` - Payment webhook
- `GET /api/payments/status/:ref` - Check payment status

### Claims & Payouts
- `GET /api/claims/:policyId` - Get claims for policy
- `POST /api/claims/process` - Manually trigger payout

### Admin
- `GET /api/admin/dashboard` - Dashboard metrics
- `POST /api/admin/weather/simulate` - Simulate weather event
- `POST /api/admin/payout/approve` - Manual payout approval

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Custom middleware
│   │   └── routes/          # Route definitions
│   ├── config/              # Configuration files
│   ├── models/              # Additional models (if needed)
│   ├── services/            # Business logic
│   │   ├── weather.service.js
│   │   ├── satellite.service.js
│   │   ├── damage.service.js
│   │   └── payment.service.js
│   ├── utils/               # Utility functions
│   ├── workers/             # Background workers
│   │   ├── weather.worker.js
│   │   ├── satellite.worker.js
│   │   ├── damage.worker.js
│   │   └── payout.worker.js
│   └── server.js            # Application entry point
├── prisma/
│   └── schema.prisma        # Database schema
├── logs/                    # Application logs
├── .env.example             # Example environment variables
└── package.json
```

## Background Workers

The system uses RabbitMQ for async processing:

1. **Weather Ingestion Worker** - Processes incoming weather data from WeatherXM
2. **Satellite Processing Worker** - Fetches and analyzes satellite imagery
3. **Damage Assessment Worker** - Calculates damage index and triggers payouts
4. **Payout Processor Worker** - Executes M-Pesa transfers

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Linting & Formatting

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `RABBITMQ_URL` - RabbitMQ connection string
- `AT_API_KEY` - Africa's Talking API key
- `WEATHERXM_API_KEY` - WeatherXM API key
- `SWYPT_API_KEY` - Swypt payment gateway key

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions to:
- **Render** (recommended) - $31/month
- **Railway** - $20/month
- **Fly.io** - $24/month

Quick deploy to Render:
```bash
# Push render.yaml to your repo
git add render.yaml
git commit -m "Add Render config"
git push

# In Render Dashboard
# Dashboard → Blueprints → New Blueprint → Connect repo → Apply
```

## Architecture

This backend is part of a two-backend architecture:

```
┌──────────────────────┐      ┌──────────────────────┐
│   Node.js Backend    │◄────►│  Data Processor      │
│  (User-Facing)       │ API  │  (Python/FastAPI)    │
├──────────────────────┤      ├──────────────────────┤
│ • USSD Interface     │      │ • Weather Data       │
│ • Admin APIs         │      │ • Satellite Data     │
│ • Damage Assessment  │      │ • Biomass Calc       │
│ • Payout Processing  │      │ • CRE Workflow       │
│ • M-Pesa Payments    │      │ • Time-series Cache  │
└──────────────────────┘      └──────────────────────┘
```

See [BACKEND_CLEANUP_SUMMARY.md](./BACKEND_CLEANUP_SUMMARY.md) for details on the architecture cleanup.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - MicroCrop Platform
