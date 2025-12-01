# Data Processor Documentation

Welcome to the MicroCrop Data Processor documentation. This directory contains comprehensive documentation for the Python-based data processing service that handles satellite imagery analysis, weather data processing, and automated claim verification.

## 📚 Documentation Structure

### Setup & Configuration (`docs/setup/`)
Installation, configuration, and getting started guides.

- **[Quick Install](setup/QUICK_INSTALL.md)** - Fast installation guide
- **[Quick Start](setup/QUICK_START.md)** - Getting started quickly
- **[Quick Test Guide](setup/QUICK_TEST_GUIDE.md)** - Test your installation
- **[Development Guide](setup/DEVELOPMENT_GUIDE.md)** - Development environment setup
- **[Python Upgrade Guide](setup/PYTHON_UPGRADE_GUIDE.md)** - Upgrade to Python 3.11+
- **[Pinata IPFS Configuration](setup/PINATA_IPFS_CONFIGURATION.md)** - IPFS storage setup
- **[Start Workers Guide](setup/START_WORKERS_GUIDE.md)** - Run Celery workers

### Implementation Details (`docs/implementation/`)
Technical implementation documentation and architecture.

- **[Blockchain Implementation Summary](implementation/BLOCKCHAIN_IMPLEMENTATION_SUMMARY.md)** - Blockchain integration status
- **[Blockchain Integration](implementation/BLOCKCHAIN_INTEGRATION.md)** - Blockchain architecture
- **[Blockchain Ready](implementation/BLOCKCHAIN_READY.md)** - Blockchain readiness report
- **[Celery Workers Summary](implementation/CELERY_WORKERS_SUMMARY.md)** - Worker architecture
- **[FastAPI Implementation Summary](implementation/FASTAPI_IMPLEMENTATION_SUMMARY.md)** - API implementation
- **[Implementation Status](implementation/IMPLEMENTATION_STATUS.md)** - Current status
- **[Senior Implementation Summary](implementation/SENIOR_IMPLEMENTATION_SUMMARY.md)** - Complete implementation overview

### Historical Documentation (`docs/archive/`)
Completion reports and historical documentation.

- Installation completion reports
- Testing implementation and summaries
- Migration success reports
- Update completion logs
- Deprecated documentation

## 🚀 Quick Start

1. **Installation**: Follow [Quick Install Guide](setup/QUICK_INSTALL.md)
2. **Configuration**: See [Development Guide](setup/DEVELOPMENT_GUIDE.md)
3. **Testing**: Use [Quick Test Guide](setup/QUICK_TEST_GUIDE.md)
4. **Start Workers**: Follow [Start Workers Guide](setup/START_WORKERS_GUIDE.md)
5. **Main README**: See [../README.md](../README.md) for project overview

## 🔑 Key Features

### Satellite Imagery Analysis
- **Planet Labs Integration**: Automated satellite image retrieval
- **NDVI Calculation**: Crop health assessment
- **Damage Detection**: Automated crop damage assessment using ML
- **Change Detection**: Compare before/after imagery

### Weather Data Processing
- **WeatherXM Integration**: Real-time weather station data
- **Historical Data**: Weather pattern analysis
- **Automated Verification**: Cross-reference claims with weather events
- **Risk Assessment**: Weather-based risk scoring

### Claim Verification
- **Automated Processing**: Celery-based background workers
- **Multi-source Verification**: Combine satellite + weather data
- **AI/ML Models**: Damage assessment models
- **IPFS Storage**: Decentralized evidence storage

### Blockchain Integration
- **Optional Feature**: Can operate with or without blockchain
- **Smart Contract Interaction**: Automated claim verification on-chain
- **USDC Payments**: Direct payment processing on Base L2
- **Event Monitoring**: Listen to blockchain events

## 🏗️ Architecture

```
data-processor/
├── src/
│   ├── api/                 # FastAPI REST API
│   │   ├── routes/         # API endpoints
│   │   └── models/         # Pydantic models
│   ├── workers/            # Celery background workers
│   │   ├── satellite.py    # Satellite imagery worker
│   │   ├── weather.py      # Weather data worker
│   │   └── verification.py # Claim verification worker
│   ├── services/           # Business logic
│   │   ├── planet.py       # Planet Labs API client
│   │   ├── weatherxm.py    # WeatherXM API client
│   │   ├── ipfs.py         # Pinata/IPFS client
│   │   └── blockchain.py   # Web3 client (optional)
│   ├── models/             # ML models
│   │   └── damage/         # Damage detection models
│   └── utils/              # Utility functions
├── migrations/             # Database migrations
├── tests/                  # Test suite
├── scripts/                # Helper scripts
└── docs/                   # This documentation
```

## 📊 Tech Stack

- **Language**: Python 3.11+
- **Framework**: FastAPI (async REST API)
- **Task Queue**: Celery with Redis/RabbitMQ
- **Database**: PostgreSQL (shared with backend)
- **Storage**: Pinata/IPFS
- **ML/AI**: TensorFlow/PyTorch for damage detection
- **Blockchain**: Web3.py for Ethereum/Base L2 (optional)

### Key Dependencies

```python
# Core
fastapi>=0.104.0
celery>=5.3.0
redis>=5.0.0
sqlalchemy>=2.0.0

# Data Processing
numpy>=1.24.0
pandas>=2.0.0
Pillow>=10.0.0

# ML/AI
tensorflow>=2.14.0  # or pytorch

# Integrations
planet>=2.0.0       # Planet Labs SDK
requests>=2.31.0    # HTTP client
web3>=6.0.0         # Blockchain (optional)
pinatapy>=0.2.0     # IPFS storage
```

## 🔗 API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /status` - Worker status
- `GET /metrics` - System metrics

### Satellite Processing
- `POST /api/satellite/process` - Process satellite imagery
- `GET /api/satellite/ndvi/:claimId` - Get NDVI analysis
- `GET /api/satellite/damage/:claimId` - Get damage assessment

### Weather Processing
- `POST /api/weather/process` - Process weather data
- `GET /api/weather/analysis/:claimId` - Get weather analysis
- `GET /api/weather/verification/:claimId` - Verify weather event

### Claim Verification
- `POST /api/claims/verify` - Start verification workflow
- `GET /api/claims/:id/status` - Get verification status
- `GET /api/claims/:id/report` - Get verification report

### Blockchain (Optional)
- `POST /api/blockchain/verify-claim` - Verify claim on-chain
- `POST /api/blockchain/process-payment` - Process USDC payment
- `GET /api/blockchain/status/:txHash` - Get transaction status

## 🔐 Environment Variables

See `.env.example` for required environment variables:

```env
# Database
DATABASE_URL="postgresql://..."

# Redis/RabbitMQ
REDIS_URL="redis://localhost:6379/0"
CELERY_BROKER_URL="redis://localhost:6379/0"

# Planet Labs
PLANET_API_KEY="your-planet-key"

# WeatherXM
WEATHERXM_API_KEY="your-weatherxm-key"

# Pinata/IPFS
PINATA_API_KEY="your-pinata-key"
PINATA_SECRET_KEY="your-pinata-secret"

# Optional: Blockchain
ENABLE_BLOCKCHAIN=false
WEB3_PROVIDER_URL="https://mainnet.base.org"
PRIVATE_KEY="your-private-key"
CLAIM_CONTRACT_ADDRESS="0x..."
```

## 🏃 Running the Data Processor

### Start FastAPI Server

```bash
# Development
uvicorn src.api.main:app --reload --port 8001

# Production
gunicorn src.api.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Start Celery Workers

```bash
# Start all workers
./start_worker.sh

# Or individually
celery -A src.workers.celery_app worker --loglevel=info -Q satellite
celery -A src.workers.celery_app worker --loglevel=info -Q weather
celery -A src.workers.celery_app worker --loglevel=info -Q verification
```

### Start Celery Beat (Scheduler)

```bash
celery -A src.workers.celery_app beat --loglevel=info
```

### Start Flower (Monitoring)

```bash
celery -A src.workers.celery_app flower --port=5555
```

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test suite
pytest tests/test_satellite.py
pytest tests/test_weather.py
pytest tests/test_verification.py
```

## 🔄 Worker Queues

### Satellite Queue
- Process Planet Labs imagery
- Calculate NDVI
- Detect crop damage
- Store results to IPFS

### Weather Queue
- Fetch WeatherXM data
- Analyze weather patterns
- Verify weather events
- Generate risk scores

### Verification Queue
- Combine satellite + weather data
- Run ML damage assessment
- Generate verification report
- Update claim status
- (Optional) Submit to blockchain

## 📈 Monitoring

### Flower Dashboard
Access at `http://localhost:5555` to monitor:
- Active workers
- Task queue status
- Task history
- Performance metrics

### Logs
```bash
# View worker logs
tail -f logs/celery-worker.log

# View API logs
tail -f logs/fastapi.log

# View error logs
tail -f logs/error.log
```

## 🔧 Troubleshooting

### Workers Not Starting
1. Check Redis/RabbitMQ is running
2. Verify environment variables
3. Check logs in `logs/` directory
4. Ensure Python 3.11+ is active

### API Connection Issues
1. Verify Planet Labs API key
2. Check WeatherXM API key
3. Test Pinata connection
4. Review CORS settings

### Blockchain Issues
1. Ensure `ENABLE_BLOCKCHAIN=true`
2. Verify private key and RPC URL
3. Check contract addresses
4. Test network connection

## 📞 Support

For questions or issues:
1. Check [Setup Guides](setup/) for installation help
2. Review [Implementation Docs](implementation/) for technical details
3. See [Archive](archive/) for historical context
4. Check main README for general overview

## 🔗 Related Documentation

- **Backend**: See `backend/docs/` for API documentation
- **Dashboard**: See `dashboard/docs/` for frontend documentation
- **Smart Contracts**: See `Contracts/` for blockchain contract documentation

## 📝 Development Workflow

1. **Setup Environment**: Follow [Development Guide](setup/DEVELOPMENT_GUIDE.md)
2. **Install Dependencies**: `pip install -r requirements.txt`
3. **Configure Services**: Set up Planet Labs, WeatherXM, IPFS
4. **Start Workers**: Use [Start Workers Guide](setup/START_WORKERS_GUIDE.md)
5. **Run Tests**: Use [Quick Test Guide](setup/QUICK_TEST_GUIDE.md)
6. **Monitor**: Use Flower dashboard

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t microcrop-processor .

# Run with docker-compose
docker-compose up -d
```

### Manual Deployment

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start services
./start_worker.sh
uvicorn src.api.main:app --host 0.0.0.0 --port 8001
```

## 📊 Performance

### Typical Processing Times
- Satellite imagery analysis: 30-60 seconds
- Weather data processing: 5-10 seconds
- Full claim verification: 1-2 minutes
- Blockchain submission (optional): 10-30 seconds

### Scalability
- Horizontal scaling: Add more worker instances
- Queue partitioning: Separate queues by priority
- Caching: Redis for frequently accessed data
- Database: PostgreSQL with read replicas

---

**Last Updated**: December 1, 2025  
**Python Version**: 3.11+  
**Version**: 1.0.0
