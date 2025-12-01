# Data Processor Deprecation Notice

**Date:** November 30, 2025  
**Reason:** Migration to Chainlink CRE workflow and Planet Labs Crop Biomass integration

---

## 🔄 Architecture Change

The MicroCrop data processor has been refactored from a **full data processing pipeline** to a **lightweight backend API service** that supports the Chainlink CRE workflow.

### Previous Architecture (Deprecated):
```
Data Processor (Python) → Manual satellite processing → Damage calculation → Blockchain oracle submission
```

### New Architecture:
```
Backend API (Python) → Provides data to CRE → CRE Workflow (TypeScript) → Smart Contracts
```

---

## ❌ Deprecated Components

### 1. Satellite Image Processing (`satellite_processor.py`)

**What it did:**
- Downloaded raw satellite imagery from Spexi
- Calculated NDVI, EVI, LAI, SAVI manually using rasterio/GDAL
- Processed multispectral imagery (Red, NIR bands)
- Cloud cover assessment
- Vegetation stress detection

**Why deprecated:**
- ✅ Replaced by **Planet Labs Crop Biomass Proxy** (BIOMASS-PROXY_V4.0_10)
- ✅ Planet provides pre-calculated, industry-standard biomass metrics
- ✅ No need for complex raster processing
- ✅ Better accuracy and validation for insurance use cases

**Migration path:**
- Use Planet Subscriptions API instead
- Fetch biomass time-series CSVs
- New endpoint: `GET /api/planet/biomass/{plot_id}`

### 2. Damage Calculator (`damage_calculator.py`)

**What it did:**
- Combined weather and satellite data (60% + 40% weighting)
- Applied growth stage sensitivity multipliers
- Evaluated payout triggers
- Calculated deductibles
- Generated damage assessments

**Why deprecated:**
- ✅ Logic moved to **Chainlink CRE workflow** (`cre-workflow/src/main.ts`)
- ✅ CRE provides decentralized consensus via DON (Decentralized Oracle Network)
- ✅ On-chain verifiability and transparency
- ✅ Eliminates single point of failure

**Migration path:**
- Damage assessment now in TypeScript CRE workflow
- Backend API only provides raw data (weather, biomass)
- CRE performs calculations with DON consensus

### 3. Blockchain Oracle Submission (`blockchain_tasks.py`)

**What it did:**
- Celery tasks for submitting data to oracle contracts
- `submit_weather_to_blockchain()` - Weather data to WeatherOracle
- `submit_satellite_to_blockchain()` - Satellite data to SatelliteOracle
- `submit_damage_to_blockchain()` - Damage reports to DamageCalculator
- Direct smart contract interactions via web3.py

**Why deprecated:**
- ✅ Oracle contracts deprecated (WeatherOracle, SatelliteOracle, DamageCalculator)
- ✅ Replaced by **Chainlink CRE** with PayoutReceiver contract
- ✅ CRE handles all on-chain submissions automatically
- ✅ Better reliability and security through Chainlink infrastructure

**Migration path:**
- Remove all blockchain submission tasks
- CRE workflow handles on-chain interactions
- Backend API is now read-only (no blockchain writes)

### 4. Spexi Satellite Integration (`spexi_client.py`)

**What it did:**
- API client for Spexi satellite imagery service
- Order satellite captures for specific plots
- Download multispectral imagery
- Manage image metadata

**Why deprecated:**
- ✅ Replaced by **Planet Labs** Subscriptions API
- ✅ Planet provides better global coverage
- ✅ Industry-standard Crop Biomass metric
- ✅ Time-series subscriptions vs on-demand orders

**Migration path:**
- Use Planet Labs API instead
- Create subscriptions when policies activate
- Fetch biomass data via subscription_id

### 5. NDVI Analyzer (`ndvi_analyzer.py`)

**What it did:**
- Statistical analysis of NDVI time-series
- Trend detection and anomaly identification
- Growth curve modeling
- Baseline comparisons

**Why deprecated:**
- ✅ Planet Biomass Proxy includes trend analysis
- ✅ Simpler CSV format vs complex raster analysis
- ✅ Historical baselines provided by Planet

**Migration path:**
- Use Planet's biomass timeseries directly
- Perform simple statistical analysis on CSV data

### 6. Kafka Streaming Infrastructure

**What it did:**
- Real-time event streaming
- Weather update events
- Satellite processing events
- Damage assessment events

**Why deprecated:**
- ✅ Overkill for current scale (CRE runs on cron, not continuous streaming)
- ✅ CRE workflow polls data instead of consuming events
- ✅ Cost savings ($100/month)
- ✅ Simpler architecture with HTTP API

**Migration path:**
- Remove Kafka from docker-compose.yml
- Use WebSockets for real-time dashboard updates only
- HTTP polling sufficient for CRE workflow

### 7. MinIO Object Storage

**What it did:**
- Store raw satellite images
- Store processed NDVI rasters
- Archive historical imagery

**Why deprecated:**
- ✅ No longer storing satellite images locally
- ✅ Planet Labs hosts all imagery
- ✅ Only need to store CSV biomass data (PostgreSQL sufficient)
- ✅ Cost savings ($30/month)

**Migration path:**
- Remove MinIO from docker-compose.yml
- Store Planet biomass timeseries in PostgreSQL
- Use IPFS only for damage report proofs (via backend)

---

## ✅ Retained Components

### 1. Weather Data Collection ✅

**Still needed:**
- WeatherXM API integration
- Real-time weather data ingestion
- TimescaleDB storage for time-series
- Weather indices calculation (dry days, rainfall, temperature)
- Baseline calculations

**Why keep:**
- CRE workflow needs weather data for 60% of damage formula
- Historical patterns for baseline comparisons
- Real-time alerts to farmers

**Endpoints:**
```
GET /api/weather/{station_id}?days=30
GET /api/weather/stations?lat={lat}&lng={lng}&radius={km}
GET /api/weather/indices/{plot_id}?start={date}&end={date}
```

### 2. FastAPI Backend ✅

**Still needed:**
- REST API endpoints for CRE workflow
- Dashboard data queries
- Analytics and reporting
- Authentication and authorization

**Endpoints:**
```
GET /api/weather/{station_id}
GET /api/planet/biomass/{plot_id}  # NEW
GET /api/policy/{policy_id}
GET /api/damage-history/{plot_id}
POST /api/planet/subscription  # NEW
```

### 3. TimescaleDB Storage ✅

**Still needed:**
- Time-series weather data
- Historical baselines
- Damage assessment history
- Performance metrics

**Tables:**
- `weather_observations`
- `weather_stations`
- `policies`
- `damage_assessments`
- `planet_subscriptions` (NEW)

### 4. Redis Caching ✅

**Still needed:**
- Cache weather data queries
- Cache Planet biomass responses
- Rate limiting
- Session management

**Cache keys:**
- `weather:{station_id}:{date}`
- `biomass:{plot_id}` (NEW)
- `policy:{policy_id}`

### 5. WebSocket Streaming ✅

**Still needed:**
- Real-time updates to dashboard
- Weather alerts
- Policy status changes
- Damage assessment notifications

**Events:**
- `weather_update`
- `damage_assessment_complete`
- `payout_triggered`
- `biomass_update` (NEW)

### 6. Celery Workers ✅ (Reduced)

**Still needed (simplified):**
- Weather data collection tasks
- Planet subscription management (NEW)
- Periodic data cleanup
- Report generation

**Removed tasks:**
- ❌ Satellite image processing
- ❌ Damage calculation
- ❌ Blockchain submissions

---

## 🆕 New Components

### 1. Planet Labs Integration

**New file:** `src/integrations/planet_client.py`

**Functions:**
```python
class PlanetClient:
    async def create_biomass_subscription(
        policy_id: str,
        field_geometry: dict,
        start_date: str,
        end_date: str
    ) -> str:
        """Create Planet subscription when policy activates."""
        
    async def get_biomass_timeseries(
        subscription_id: str
    ) -> dict:
        """Fetch latest biomass data from subscription."""
        
    async def cancel_subscription(
        subscription_id: str
    ) -> bool:
        """Cancel subscription when policy expires."""
```

### 2. Planet API Routes

**New file:** `src/api/routes/planet.py`

**Endpoints:**
```python
@router.post("/api/planet/subscription")
async def create_subscription(policy_id: str, geometry: dict):
    """Create Planet subscription for new policy."""

@router.get("/api/planet/biomass/{plot_id}")
async def get_biomass_data(plot_id: int):
    """Fetch biomass data for CRE workflow."""

@router.delete("/api/planet/subscription/{subscription_id}")
async def cancel_subscription(subscription_id: str):
    """Cancel subscription when policy expires."""
```

### 3. Plot ID Mapping (Privacy)

**New model:** GPS coordinates stored in backend, not on-chain

**Database:**
```sql
CREATE TABLE plot_locations (
    plot_id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES policies(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    field_geometry JSONB NOT NULL,  -- GeoJSON polygon
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Endpoint:**
```python
@router.get("/api/plot/{plot_id}/geometry")
async def get_plot_geometry(plot_id: int):
    """Get field geometry for Planet subscription (internal use only)."""
```

---

## 📋 Migration Checklist

### Phase 1: Cleanup (Completed)

- [x] Create `deprecated/` directory
- [x] Move deprecated files:
  - [x] `src/processors/satellite_processor.py`
  - [x] `src/processors/damage_calculator.py`
  - [x] `src/workers/blockchain_tasks.py`
  - [x] `src/integrations/spexi_client.py`
  - [x] `src/analyzers/ndvi_analyzer.py`
- [x] Update imports to remove deprecated references
- [x] Remove Kafka from `docker-compose.yml`
- [x] Remove MinIO from `docker-compose.yml`
- [x] Update requirements.txt (remove GDAL, rasterio)

### Phase 2: Planet Integration (Next)

- [ ] Create `src/integrations/planet_client.py`
- [ ] Create `src/api/routes/planet.py`
- [ ] Add Planet settings to `src/config/settings.py`
- [ ] Create `planet_subscriptions` database table
- [ ] Add Planet API token to `.env`
- [ ] Implement subscription lifecycle (create/fetch/cancel)

### Phase 3: Testing (After Phase 2)

- [ ] Test weather data endpoints
- [ ] Test Planet subscription creation
- [ ] Test biomass data fetching
- [ ] Test CRE workflow integration
- [ ] Load test API with 1000 concurrent requests
- [ ] Verify WebSocket streaming

### Phase 4: Documentation (Final)

- [ ] Update README.md
- [ ] Create API documentation
- [ ] Update architecture diagrams
- [ ] Write deployment guide

---

## 🔧 Configuration Changes

### Environment Variables Removed:
```bash
# No longer needed
SPEXI_API_KEY=...
MINIO_ENDPOINT=...
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
KAFKA_BOOTSTRAP_SERVERS=...
SATELLITE_ORACLE_CONTRACT=...
DAMAGE_CALCULATOR_CONTRACT=...
```

### Environment Variables Added:
```bash
# Planet Labs API
PLANET_API_KEY=your_planet_api_key_here
PLANET_SUBSCRIPTIONS_URL=https://api.planet.com/subscriptions/v1

# Backend API authentication for CRE
BACKEND_API_TOKEN_SECRET=your_jwt_secret_here
```

### Environment Variables Retained:
```bash
# Weather data
WEATHERXM_API_KEY=...

# Database
DATABASE_URL=postgresql://...
TIMESCALE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# IPFS (for damage proofs only)
PINATA_API_KEY=...
PINATA_SECRET_KEY=...
```

---

## 💰 Cost Impact

### Before (Full Pipeline):
```
- TimescaleDB: $50/month
- Redis: $20/month
- Kafka: $100/month
- MinIO: $30/month
- Compute (4 workers): $200/month
TOTAL: $400/month
```

### After (Backend API):
```
- TimescaleDB: $50/month ✅
- Redis: $20/month ✅
- Compute (1-2 workers): $100/month ✅
TOTAL: $170/month

SAVINGS: $230/month (58% reduction)
```

---

## 📚 Documentation Updates

### Updated Files:
1. **README.md** - New architecture and setup instructions
2. **DEPLOYMENT_GUIDE.md** - Simplified deployment steps
3. **API_REFERENCE.md** - Updated endpoint documentation
4. **ARCHITECTURE.md** - New system design diagram

### New Files:
1. **PLANET_INTEGRATION.md** - Planet Labs setup guide
2. **CRE_BACKEND_API.md** - API contract for CRE workflow
3. **MIGRATION_GUIDE.md** - Step-by-step migration instructions

---

## 🎯 Summary

**What changed:**
- ❌ Removed: Satellite processing, damage calculation, blockchain tasks (60% of codebase)
- ✅ Kept: Weather data, API endpoints, storage layers (30% of codebase)
- 🆕 Added: Planet Labs integration, subscription management (10% new code)

**Why it matters:**
- 🚀 Simpler architecture (backend API vs full pipeline)
- 💰 Lower costs ($170 vs $400/month)
- 🔒 Better security (CRE handles blockchain)
- 📊 Industry-standard metrics (Planet Biomass)
- ⚡ Easier to maintain and scale

**Next steps:**
1. Implement Planet Labs client
2. Add biomass API endpoints
3. Test with CRE workflow
4. Deploy to production

---

**Questions?** See [DATA_PROCESSOR_ANALYSIS.md](../DATA_PROCESSOR_ANALYSIS.md) for detailed analysis.
