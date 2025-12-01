# Backend Documentation

Welcome to the MicroCrop Backend documentation. This directory contains comprehensive documentation for the Node.js/Express API backend.

## 📚 Documentation Structure

### API Documentation (`docs/api/`)
Complete API endpoint documentation with request/response examples.

- **[Admin API Documentation](api/ADMIN_API_DOCUMENTATION.md)** - Admin-only endpoints
- **[Claim API Documentation](api/CLAIM_API_DOCUMENTATION.md)** - Claim management endpoints
- **[Farmer API Documentation](api/FARMER_API_DOCUMENTATION.md)** - Farmer CRUD endpoints
- **[Policy API Documentation](api/POLICY_API_DOCUMENTATION.md)** - Policy management endpoints
- **[Weather API Documentation](api/WEATHER_API_DOCUMENTATION.md)** - Weather data endpoints
- **[Auth API Requirements](api/AUTH_API_REQUIREMENTS.md)** - Authentication requirements
- **[Auth Quick Reference](api/AUTH_QUICK_REFERENCE.md)** - Quick auth reference guide

### Implementation Details (`docs/implementation/`)
Technical implementation documentation and progress reports.

- **[Admin Routes Implementation](implementation/ADMIN_ROUTES_IMPLEMENTATION.md)** - Admin endpoint implementation
- **[Authentication Implementation Complete](implementation/AUTHENTICATION_IMPLEMENTATION_COMPLETE.md)** - Auth system completion
- **[Backend Cleanup Summary](implementation/BACKEND_CLEANUP_SUMMARY.md)** - Code cleanup report
- **[Build Report](implementation/BUILD_REPORT.md)** - Build status and issues
- **[Build Summary](implementation/BUILD_SUMMARY.md)** - Build summary report
- **[Claim Routes Implementation](implementation/CLAIM_ROUTES_IMPLEMENTATION.md)** - Claim endpoint implementation
- **[Farmer Routes Implementation](implementation/FARMER_ROUTES_IMPLEMENTATION.md)** - Farmer endpoint implementation
- **[Policy Routes Implementation](implementation/POLICY_ROUTES_IMPLEMENTATION.md)** - Policy endpoint implementation
- **[Weather Routes Implementation](implementation/WEATHER_ROUTES_IMPLEMENTATION.md)** - Weather endpoint implementation

### Integration Guides (`docs/integrations/`)
Third-party service integration documentation.

- **[IPFS Integration](integrations/IPFS_INTEGRATION.md)** - IPFS/Pinata integration guide
- **[IPFS Implementation Summary](integrations/IPFS_INTEGRATION_IMPLEMENTATION_SUMMARY.md)** - IPFS completion status
- **[Swypt Integration](integrations/SWYPT_INTEGRATION.md)** - Swypt payment integration
- **[WeatherXM Integration](integrations/WEATHERXM_INTEGRATION.md)** - WeatherXM weather data integration
- **[WeatherXM Implementation Summary](integrations/WEATHERXM_IMPLEMENTATION_SUMMARY.md)** - WeatherXM completion status
- **[WeatherXM Webhook Security](integrations/WEATHERXM_WEBHOOK_SECURITY.md)** - Webhook security setup

### Setup & Configuration (`docs/setup/`)
Deployment and configuration guides.

- **[Deployment Guide](setup/DEPLOYMENT.md)** - Production deployment instructions
- **[USDC Base Configuration](setup/USDC_BASE_CONFIG.md)** - USDC on Base L2 setup
- **[USSD Flow](setup/USSD_FLOW.md)** - USSD mobile flow documentation

## 🚀 Quick Start

1. **API Reference**: Start with [API Documentation](api/) to understand available endpoints
2. **Setup**: Follow [Deployment Guide](setup/DEPLOYMENT.md) for deployment
3. **Integrations**: Check [Integration Guides](integrations/) for third-party services
4. **Main README**: See [../README.md](../README.md) for project overview and setup

## 🔑 Key Features

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (ADMIN, COOPERATIVE, FARMER)
- Refresh token rotation
- See: [Auth API Requirements](api/AUTH_API_REQUIREMENTS.md)

### Core Entities
- **Farmers**: Farmer profile and data management
- **Policies**: Insurance policy creation and management
- **Claims**: Claim submission and automated verification
- **Weather Data**: Real-time weather data from WeatherXM

### Integrations
- **WeatherXM**: Weather station data for claims verification
- **Planet Labs**: Satellite imagery for crop monitoring (via data-processor)
- **Pinata/IPFS**: Decentralized document storage
- **Swypt**: Mobile payment processing
- **Base L2**: Optional blockchain integration with USDC

## 🏗️ Architecture

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Prisma models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── index.ts         # Application entry
├── prisma/
│   └── schema.prisma    # Database schema
└── docs/                # This documentation
```

## 📊 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **File Storage**: Pinata/IPFS
- **Blockchain**: Ethers.js (optional)

## 🔗 Related Documentation

- **Dashboard**: See `dashboard/docs/` for frontend documentation
- **Data Processor**: See `data-processor/` for Python worker documentation
- **Smart Contracts**: See `Contracts/` for blockchain contract documentation

## 📝 API Endpoints Overview

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Farmers (COOPERATIVE, ADMIN)
- `GET /api/farmers` - List farmers
- `POST /api/farmers` - Create farmer
- `GET /api/farmers/:id` - Get farmer details
- `PUT /api/farmers/:id` - Update farmer
- `DELETE /api/farmers/:id` - Delete farmer

### Policies (COOPERATIVE, ADMIN)
- `GET /api/policies` - List policies
- `POST /api/policies` - Create policy
- `GET /api/policies/:id` - Get policy details
- `PUT /api/policies/:id` - Update policy

### Claims (COOPERATIVE, ADMIN, FARMER)
- `GET /api/claims` - List claims
- `POST /api/claims` - Submit claim
- `GET /api/claims/:id` - Get claim details
- `PUT /api/claims/:id` - Update claim status
- `POST /api/claims/:id/verify` - Verify claim

### Weather (COOPERATIVE, ADMIN)
- `GET /api/weather/stations` - List weather stations
- `GET /api/weather/data/:stationId` - Get weather data
- `POST /api/weather/webhook` - WeatherXM webhook

### Admin (ADMIN only)
- `GET /api/admin/cooperatives` - List cooperatives
- `POST /api/admin/cooperatives` - Create cooperative
- `GET /api/admin/stats` - System statistics

## 🔐 Environment Variables

See `.env.example` for required environment variables:

```env
# Database
DATABASE_URL="postgresql://..."

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# IPFS/Pinata
PINATA_API_KEY="your-pinata-key"
PINATA_SECRET_KEY="your-pinata-secret"

# WeatherXM
WEATHERXM_API_KEY="your-weatherxm-key"
WEATHERXM_WEBHOOK_SECRET="your-webhook-secret"

# Optional: Blockchain
ENABLE_BLOCKCHAIN=false
PRIVATE_KEY="your-private-key"
BASE_RPC_URL="https://mainnet.base.org"
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Test specific endpoints
npm run test:integration
```

## 📞 Support

For questions or issues:
1. Check the relevant documentation section above
2. Review API documentation for endpoint details
3. Check implementation docs for technical details
4. See main README for general setup help

---

**Last Updated**: December 1, 2025  
**Version**: 1.0.0
