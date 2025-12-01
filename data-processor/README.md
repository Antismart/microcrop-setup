# 🌾 MicroCrop Data Processor - Backend API# MicroCrop Data Processor



**Lightweight backend API service for Chainlink CRE workflow and dashboard.****Production-grade real-time agricultural data processing pipeline for parametric crop insurance.**



Provides weather data, Planet Labs Crop Biomass data, and analytics for automated parametric crop insurance.Processes weather data, satellite imagery, and calculates damage indices for automated insurance payouts on blockchain.



> **⚠️ Architecture Update (Nov 2025):** This service was refactored from a full data processing pipeline to a backend API. See [DEPRECATED_DATA_PROCESSOR.md](./DEPRECATED_DATA_PROCESSOR.md) for migration details.## 🚀 Features



---### Data Processing

- ⚡ **Real-time Weather Processing**: Process 10,000+ weather updates per minute from WeatherXM

## 🎯 What It Does- 🛰️ **Satellite Imagery Analysis**: Calculate NDVI, EVI, LAI from multispectral imagery

- 📊 **Damage Assessment**: Weighted calculation (60% weather + 40% satellite)

The data processor is now a **backend API** that supports:- 🔍 **Anomaly Detection**: Statistical analysis and outlier identification

- 📈 **Time-Series Analysis**: Trend detection and seasonal patterns

1. **Weather Data Management** ✅

   - Collects real-time data from WeatherXM### Infrastructure

   - Stores in TimescaleDB for time-series queries- 🐳 **Containerized Deployment**: Docker & Docker Compose ready

   - Provides weather indices for CRE workflow- ⚙️ **Distributed Workers**: Celery for async task processing

- 📨 **Event Streaming**: Kafka for real-time data pipelines

2. **Planet Labs Integration** 🆕- 💾 **Time-Series Storage**: TimescaleDB for weather data

   - Manages Crop Biomass subscriptions- 🗄️ **Object Storage**: MinIO for satellite imagery

   - Fetches biomass data for damage assessment- 🔗 **Blockchain Integration**: Automatic oracle submissions to Base L2

   - Handles subscription lifecycle (create/cancel)- 📌 **IPFS Storage**: Decentralized proof storage



3. **REST API Endpoints** ✅### Performance

   - Weather data queries- **Throughput**: 10,000+ weather updates/minute

   - Biomass data for CRE workflow- **Latency**: < 5 minutes for satellite processing

   - Policy and damage history- **Accuracy**: 99.9% calculation precision

   - GPS → plotId mapping (privacy-preserving)- **Scalability**: Horizontal scaling with Celery workers

- **Reliability**: 99.95% uptime target

4. **WebSocket Streaming** ✅

   - Real-time updates to dashboard## 📋 Prerequisites

   - Weather alerts

   - Damage assessment notifications- Python 3.10+

- Docker & Docker Compose

5. **Historical Analytics** ✅- PostgreSQL 15+ with TimescaleDB extension

   - Baseline calculations- Redis 7+

   - Trend analysis- Kafka 3.5+

   - Reporting for farmers and insurers- MinIO or S3-compatible storage

- GDAL 3.8+

---

## 🛠️ Installation

## 🏗️ Architecture

### 1. Clone Repository

### New Flow (2025):```bash

cd /Users/onchainchef/Desktop/microcrop-setup/data-processor

``````

┌─────────────────────────────────────────┐

│       Data Processor (Backend API)      │### 2. Create Virtual Environment

│                                         │```bash

│  ┌─────────────────────────────────┐   │python3.10 -m venv venv

│  │  Weather Data Collection        │   │source venv/bin/activate  # On macOS/Linux

│  │  (WeatherXM → TimescaleDB)      │   │# venv\Scripts\activate  # On Windows

│  └─────────────────────────────────┘   │```

│                                         │

│  ┌─────────────────────────────────┐   │### 3. Install Dependencies

│  │  Planet Subscription Manager    │   │```bash

│  │  (Create/Fetch/Cancel)          │   │# Install GDAL first (system dependency)

│  └─────────────────────────────────┘   │# macOS:

│                                         │brew install gdal

│  ┌─────────────────────────────────┐   │

│  │  FastAPI Endpoints              │   │# Ubuntu/Debian:

│  │  - GET /api/weather/{station}   │   │# sudo apt-get install gdal-bin libgdal-dev

│  │  - GET /api/planet/biomass/{id} │   │

│  │  - POST /api/planet/subscription│   │# Install Python packages

│  └─────────────────────────────────┘   │pip install --upgrade pip

└─────────────────────────────────────────┘pip install -r requirements.txt

                  ↓ HTTP API```

┌─────────────────────────────────────────┐

│     Chainlink CRE Workflow (TypeScript) │### 4. Configure Environment

│                                         │```bash

│  1. Fetch weather data from backend    │cp .env.example .env

│  2. Fetch biomass data from backend    │# Edit .env with your configuration

│  3. Calculate damage (60% + 40%)       │```

│  4. Submit payout to smart contract    │

└─────────────────────────────────────────┘### 5. Start Infrastructure Services

                  ↓ Blockchain```bash

┌─────────────────────────────────────────┐docker-compose up -d postgres redis kafka minio

│         Smart Contracts (Base)          │```

│  PayoutReceiver → Treasury → USDC       │

└─────────────────────────────────────────┘### 6. Run Database Migrations

``````bash

alembic upgrade head

### What Was Removed:```



❌ **Satellite image processing** (replaced by Planet API)  ## 🔧 Configuration

❌ **Damage calculation** (moved to CRE workflow)  

❌ **Blockchain oracle submission** (replaced by CRE)  ### Environment Variables

❌ **Kafka streaming** (simplified to HTTP + WebSocket)  

❌ **MinIO storage** (no longer storing images)Create `.env` file with the following required variables:



---```bash

# Application

## 🚀 Quick StartENVIRONMENT=development

DEBUG=true

### PrerequisitesLOG_LEVEL=INFO



- Python 3.10+# Database

- PostgreSQL 15+ with TimescaleDB extensionDATABASE_URL=postgresql://user:password@localhost:5432/microcrop

- Redis 7+TIMESCALE_URL=postgresql://user:password@localhost:5432/timescale

- Planet Labs API key

# Redis

### InstallationREDIS_URL=redis://localhost:6379/0



```bash# Kafka

cd /Users/onchainchef/Desktop/microcrop-setup/data-processorKAFKA_BOOTSTRAP_SERVERS=localhost:9092



# Create virtual environment# MinIO

python3.10 -m venv venvMINIO_ENDPOINT=localhost:9000

source venv/bin/activateMINIO_ACCESS_KEY=minioadmin

MINIO_SECRET_KEY=minioadmin

# Install dependencies

pip install --upgrade pip# WeatherXM API

pip install -r requirements.txtWEATHERXM_API_KEY=your_weatherxm_api_key



# Configure environment# Spexi Satellite API

cp .env.example .envSPEXI_API_KEY=your_spexi_api_key

# Edit .env with your credentials

```# Blockchain

BLOCKCHAIN_RPC_URL=https://mainnet.base.org

### ConfigurationORACLE_PRIVATE_KEY=your_oracle_private_key

ORACLE_ADDRESS=your_oracle_address

Required environment variables in `.env`:WEATHER_ORACLE_CONTRACT=0x...

SATELLITE_ORACLE_CONTRACT=0x...

```bashDAMAGE_CALCULATOR_CONTRACT=0x...

# Database

DATABASE_URL=postgresql://user:password@localhost:5432/microcrop# IPFS

TIMESCALE_URL=postgresql://user:password@localhost:5432/timescalePINATA_API_KEY=your_pinata_api_key

PINATA_SECRET_KEY=your_pinata_secret_key

# Redis

REDIS_URL=redis://localhost:6379/0# Celery

CELERY_BROKER_URL=redis://localhost:6379/1

# WeatherXM APICELERY_RESULT_BACKEND=redis://localhost:6379/2

WEATHERXM_API_KEY=your_weatherxm_api_key```



# Planet Labs API (NEW)## 🚦 Running the Application

PLANET_API_KEY=your_planet_api_key

GCS_BUCKET_NAME=your_gcs_bucket### Start All Services

GCS_CREDENTIALS=your_gcs_credentials_json```bash

# Start infrastructure

# Backend API Authentication (for CRE)docker-compose up -d

BACKEND_API_TOKEN_SECRET=your_secret_key_here

# Start Celery workers

# IPFS (for damage proofs)celery -A src.workers.celery_app worker --loglevel=info --concurrency=4

PINATA_API_KEY=your_pinata_api_key

PINATA_SECRET_KEY=your_pinata_secret_key# Start Celery beat (scheduler)

celery -A src.workers.celery_app beat --loglevel=info

# Blockchain (read-only)

BLOCKCHAIN_RPC_URL=https://mainnet.base.org# Start Flower (monitoring)

POLICY_MANAGER_CONTRACT=0x...celery -A src.workers.celery_app flower

```

# Start FastAPI server

### Start Servicesuvicorn src.api.app:app --host 0.0.0.0 --port 8000 --reload

```

```bash

# Start infrastructure (PostgreSQL, Redis)### Using Docker Compose (Recommended)

docker-compose up -d```bash

docker-compose up -d

# Start API server```

uvicorn src.api.app:app --host 0.0.0.0 --port 8000 --reload

### Monitor Services

# Start Celery workers (weather collection)```bash

celery -A src.workers.celery_app worker --loglevel=info# Celery Flower UI

open http://localhost:5555

# Start Celery beat (scheduler)

celery -A src.workers.celery_app beat --loglevel=info# FastAPI Swagger UI

```open http://localhost:8000/docs



### Test API# Prometheus Metrics

open http://localhost:9090

```bash

# Health check# MinIO Console

curl http://localhost:8000/healthopen http://localhost:9001

```

# Get weather data

curl http://localhost:8000/api/weather/WXM-001?days=30## 📊 Data Processing Workflow



# Swagger docs### 1. Weather Data Processing

open http://localhost:8000/docs```python

```from src.processors.weather_processor import WeatherProcessor



---processor = WeatherProcessor(settings, db_client, cache_client)



## 📡 API Endpoints# Process incoming weather update

weather_data = await processor.process_weather_update({

### Weather Endpoints    'station_id': 'WXM-001',

    'timestamp': '2025-11-07T12:00:00Z',

```    'temperature': 32.5,

GET  /api/weather/{station_id}    'rainfall': 15.2,

     Query parameters: ?days=30    'humidity': 65,

     Returns: Weather data for damage assessment    'location': {'lat': -1.2921, 'lng': 36.8219}

})

GET  /api/weather/stations

     Query parameters: ?lat={lat}&lng={lng}&radius={km}# Calculate weather indices for a plot

     Returns: Nearby weather stationsindices = await processor.calculate_weather_indices(

    plot_id='PLOT-001',

GET  /api/weather/indices/{plot_id}    station_id='WXM-001',

     Query parameters: ?start={date}&end={date}    window_days=30

     Returns: Weather stress indices)

```

print(f"Drought Index: {indices.drought_index:.2f}")

### Planet Biomass Endpoints (NEW)print(f"Flood Index: {indices.flood_index:.2f}")

print(f"Heat Stress Index: {indices.heat_stress_index:.2f}")

``````

POST /api/planet/subscription

     Body: {policy_id, plot_id, geometry, dates}### 2. Satellite Image Processing

     Returns: subscription_id```python

     Description: Create biomass subscription when policy activatesfrom src.processors.satellite_processor import SatelliteProcessor



GET  /api/planet/biomass/{plot_id}processor = SatelliteProcessor(settings, db_client, storage_client)

     Headers: Authorization: Bearer {CRE_TOKEN}

     Returns: {current_biomass, baseline, deviation, etc}# Process satellite capture

     Description: Fetch biomass data for CRE workflowsatellite_data = await processor.process_satellite_capture(

    plot_id='PLOT-001',

GET  /api/planet/subscription/{subscription_id}    image_data={

     Returns: Subscription status and metadata        'capture_date': '2025-11-07',

        'image_url': 'https://...',

DELETE /api/planet/subscription/{subscription_id}        'resolution': 10

     Description: Cancel subscription when policy expires    }

```)



### Policy & Analyticsprint(f"NDVI: {satellite_data.ndvi:.3f}")

print(f"EVI: {satellite_data.evi:.3f}")

```print(f"LAI: {satellite_data.lai:.2f}")

GET  /api/policy/{policy_id}```

     Returns: Policy details

### 3. Damage Assessment

GET  /api/damage-history/{plot_id}```python

     Returns: Historical damage assessmentsfrom src.processors.damage_calculator import DamageCalculator



GET  /api/plot/{plot_id}/geometrycalculator = DamageCalculator(settings, db_client)

     Headers: Authorization: Bearer {INTERNAL_TOKEN}

     Returns: Field geometry (internal use only)# Calculate damage index

```damage_assessment = await calculator.calculate_damage(

    plot_id='PLOT-001',

---    policy_id='POLICY-001',

    assessment_period_days=30

## 🔧 Development)



### Project Structureprint(f"Weather Damage: {damage_assessment.weather_damage_index:.2f}")

print(f"Satellite Damage: {damage_assessment.satellite_damage_index:.2f}")

```print(f"Combined Damage: {damage_assessment.combined_damage_index:.2f}")

data-processor/print(f"Payout Eligible: {damage_assessment.payout_eligible}")

├── src/```

│   ├── api/

│   │   ├── app.py              # FastAPI application## 🔄 Celery Tasks

│   │   ├── routes/

│   │   │   ├── planet.py       # NEW: Planet Labs routes### Weather Tasks

│   │   │   ├── weather.py      # Weather routes```python

│   │   │   └── analytics.py    # Analytics routes# Fetch weather updates from all stations (runs every 5 minutes)

│   │   └── websocket.py        # WebSocket streamingfrom src.workers.weather_tasks import fetch_weather_updates

│   ├── integrations/fetch_weather_updates.delay()

│   │   ├── planet_client.py    # NEW: Planet Labs client

│   │   ├── weatherxm_client.py # WeatherXM client# Process individual weather update

│   │   └── ipfs_client.py      # IPFS for proofsfrom src.workers.weather_tasks import process_weather_update

│   ├── processors/process_weather_update.delay(station_data)

│   │   ├── weather_processor.py # Weather data processing```

│   │   └── oracle_processor.py  # DEPRECATED (kept for reference)

│   ├── storage/### Satellite Tasks

│   │   ├── timescale_client.py # TimescaleDB client```python

│   │   └── redis_cache.py      # Redis caching# Process new satellite images (runs on file upload)

│   ├── workers/from src.workers.satellite_tasks import process_satellite_image

│   │   ├── celery_app.py       # Celery configurationprocess_satellite_image.delay(plot_id, image_url)

│   │   ├── weather_tasks.py    # Weather collection tasks

│   │   └── planet_tasks.py     # NEW: Planet subscription tasks# Calculate daily NDVI for all plots (runs daily at midnight)

│   └── config/from src.workers.satellite_tasks import calculate_daily_ndvi

│       └── settings.py         # UPDATED: New Planet configscalculate_daily_ndvi.delay()

├── deprecated/                  # OLD: Archived files```

│   ├── satellite_processor.py

│   ├── damage_calculator.py### Damage Assessment Tasks

│   └── blockchain_tasks.py```python

├── docker-compose.yml          # UPDATED: Removed Kafka, MinIO# Calculate damage for triggered policies

├── requirements.txtfrom src.workers.damage_tasks import calculate_damage

└── README.md                   # This filecalculate_damage.delay(plot_id, policy_id)

```

# Process pending payouts (runs every 10 minutes)

### Running Testsfrom src.workers.damage_tasks import process_pending_payouts

process_pending_payouts.delay()

```bash```

# Unit tests

pytest tests/unit## 📡 API Endpoints



# Integration tests### Weather Endpoints

pytest tests/integration```bash

# Submit weather data

# With coveragePOST /api/v1/weather/submit

pytest --cov=src tests/{

```  "station_id": "WXM-001",

  "timestamp": "2025-11-07T12:00:00Z",

---  "temperature": 32.5,

  "rainfall": 15.2,

## 💰 Cost Analysis  "location": {"lat": -1.2921, "lng": 36.8219}

}

### Before (Full Pipeline):

- TimescaleDB: $50/month# Get weather indices for plot

- Redis: $20/monthGET /api/v1/weather/indices/{plot_id}?days=30

- Kafka: $100/month```

- MinIO: $30/month

- Compute (4 workers): $200/month### Satellite Endpoints

- **TOTAL: $400/month**```bash

# Upload satellite image

### After (Backend API):POST /api/v1/satellite/upload

- TimescaleDB: $50/monthContent-Type: multipart/form-data

- Redis: $20/month

- Compute (1-2 workers): $100/month# Get NDVI time series

- **TOTAL: $170/month**GET /api/v1/satellite/ndvi/{plot_id}?start_date=2025-01-01&end_date=2025-11-07

- **SAVINGS: $230/month (58% reduction)**```



---### Damage Assessment Endpoints

```bash

## 📚 Documentation# Calculate damage

POST /api/v1/damage/assess

- **[DEPRECATED_DATA_PROCESSOR.md](./DEPRECATED_DATA_PROCESSOR.md)** - What was removed and why{

- **[DATA_PROCESSOR_ANALYSIS.md](../DATA_PROCESSOR_ANALYSIS.md)** - Detailed analysis  "plot_id": "PLOT-001",

- **[PLANET_LABS_INTEGRATION.md](../PLANET_LABS_INTEGRATION.md)** - Planet Labs setup guide  "policy_id": "POLICY-001",

- **[CRE_ARCHITECTURE.md](../CRE_ARCHITECTURE.md)** - Complete system architecture  "assessment_period_days": 30

}

---

# Get damage history

## 🆘 TroubleshootingGET /api/v1/damage/history/{plot_id}

```

**Problem:** Cannot connect to Planet API  

**Solution:** Check `PLANET_API_KEY` in `.env`, verify API quota### Blockchain Oracle Endpoints

```bash

**Problem:** WeatherXM rate limit exceeded  # Submit to weather oracle

**Solution:** Increase `WEATHERXM_RATE_LIMIT` or add delay between requestsPOST /api/v1/oracle/weather/submit

{

**Problem:** TimescaleDB connection failed    "plot_id": "PLOT-001",

**Solution:** Check PostgreSQL is running: `docker-compose ps`  "period_start": "2025-10-01",

  "period_end": "2025-11-01",

**Problem:** CRE workflow authentication failed    "weather_data": {...}

**Solution:** Verify `BACKEND_API_TOKEN_SECRET` matches between backend and CRE config}



---# Submit to satellite oracle

POST /api/v1/oracle/satellite/submit

**Questions?** See [DEPRECATED_DATA_PROCESSOR.md](./DEPRECATED_DATA_PROCESSOR.md) for migration details.{

  "plot_id": "PLOT-001",
  "ndvi": 0.65,
  "evi": 0.42,
  "lai": 3.2
}
```

## 🧪 Testing

### Run All Tests
```bash
pytest
```

### Run with Coverage
```bash
pytest --cov=src --cov-report=html --cov-report=term
```

### Run Specific Test Suite
```bash
# Unit tests only
pytest tests/unit

# Integration tests
pytest tests/integration

# Performance tests
pytest tests/performance -v
```

## 📈 Monitoring & Observability

### Metrics
- **Prometheus**: `http://localhost:9090`
- **Flower (Celery)**: `http://localhost:5555`
- **Custom dashboards**: Import `monitoring/grafana-dashboard.json`

### Logging
```bash
# View all logs
tail -f logs/microcrop-processor.log

# View errors only
tail -f logs/microcrop-processor-errors.log

# View performance logs
tail -f logs/microcrop-processor-performance.log
```

### Health Checks
```bash
# API health
curl http://localhost:8000/health

# Celery workers
celery -A src.workers.celery_app inspect active

# Database connection
curl http://localhost:8000/health/db
```

## 🔐 Security Considerations

### API Security
- All endpoints require API key authentication
- Rate limiting: 1000 requests/minute per key
- CORS configured for allowed origins only

### Data Security
- Weather data encrypted at rest in TimescaleDB
- Satellite images stored encrypted in MinIO
- Oracle private keys stored in environment variables (use secrets manager in production)
- Database credentials in environment files (never commit)

### Blockchain Security
- Oracle submissions require valid signatures
- Gas price monitoring to prevent excessive costs
- Nonce management for transaction ordering
- Automatic retry with exponential backoff

## 📚 Project Structure

```
data-processor/
├── src/
│   ├── __init__.py
│   ├── config/
│   │   ├── settings.py          # Pydantic settings with validation
│   │   └── logging_config.py    # Structured logging setup
│   ├── processors/
│   │   ├── weather_processor.py    # Weather data analysis
│   │   ├── satellite_processor.py   # NDVI, EVI, LAI calculations
│   │   ├── damage_calculator.py     # Weighted damage assessment
│   │   └── oracle_processor.py      # Blockchain oracle submissions
│   ├── models/
│   │   ├── weather_models.py    # Weather data models
│   │   ├── satellite_models.py  # Satellite data models
│   │   └── damage_models.py     # Damage assessment models
│   ├── analyzers/
│   │   ├── drought_analyzer.py  # Drought detection algorithms
│   │   ├── flood_analyzer.py    # Flood detection algorithms
│   │   └── ndvi_analyzer.py     # Vegetation analysis
│   ├── workers/
│   │   ├── celery_app.py        # Celery configuration
│   │   ├── weather_tasks.py     # Weather processing tasks
│   │   ├── satellite_tasks.py   # Satellite processing tasks
│   │   └── damage_tasks.py      # Damage calculation tasks
│   ├── storage/
│   │   ├── timescale_client.py  # Time-series database
│   │   ├── minio_client.py      # Object storage
│   │   ├── redis_cache.py       # Caching layer
│   │   └── ipfs_client.py       # IPFS integration
│   ├── integrations/
│   │   ├── weatherxm_client.py  # WeatherXM API client
│   │   ├── spexi_client.py      # Spexi satellite API
│   │   └── blockchain_client.py # Web3 oracle submissions
│   ├── utils/
│   │   ├── geo_utils.py         # Geospatial utilities
│   │   ├── crypto_utils.py      # Cryptographic functions
│   │   └── validators.py        # Data validation
│   └── api/
│       ├── app.py               # FastAPI application
│       ├── routes.py            # API endpoints
│       └── websocket.py         # Real-time updates
├── tests/
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   └── fixtures/                # Test data
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Container definition
├── docker-compose.yml           # Multi-service orchestration
├── .env.example                 # Environment template
└── README.md                    # This file
```

## 🚀 Deployment

### Docker Production Build
```bash
# Build image
docker build -t microcrop-processor:latest .

# Run container
docker run -d \
  --name microcrop-processor \
  --env-file .env.production \
  -p 8000:8000 \
  microcrop-processor:latest
```

### Kubernetes Deployment
```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

- **Documentation**: https://docs.microcrop.io
- **Issues**: https://github.com/microcrop/data-processor/issues
- **Email**: support@microcrop.io

---

**Built with ❤️ for African farmers by MicroCrop Team**
