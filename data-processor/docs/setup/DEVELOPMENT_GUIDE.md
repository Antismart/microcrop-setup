# Development Guide - Next Steps

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Start Infrastructure

```bash
# Start all services with Docker Compose
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f processor-api
```

### 4. Test the Implementation

```python
# test_processors.py
import asyncio
from datetime import datetime, timedelta
from src.processors import WeatherProcessor, SatelliteProcessor, DamageCalculator
from src.models.weather import WeatherData

async def test_weather_processor():
    processor = WeatherProcessor()
    
    # Create sample weather data
    weather_data = [
        WeatherData(
            station_id="wx_test_001",
            timestamp=datetime.utcnow() - timedelta(hours=i),
            latitude=-1.2921,
            longitude=36.8219,
            temperature=25.0 + i * 0.5,
            rainfall=5.0 if i % 3 == 0 else 0.0,
            humidity=65.0,
            pressure=1013.25,
            wind_speed=3.5,
            data_quality=0.95,
        )
        for i in range(100)
    ]
    
    # Calculate indices
    indices = await processor.calculate_weather_indices(
        plot_id="test_plot_001",
        policy_id="test_policy_001",
        start_date=datetime.utcnow() - timedelta(days=7),
        end_date=datetime.utcnow(),
        weather_data=weather_data,
    )
    
    print(f"✅ Weather Processor Test")
    print(f"   Drought score: {indices.drought.drought_score:.2f}")
    print(f"   Flood score: {indices.flood.flood_score:.2f}")
    print(f"   Heat stress score: {indices.heat_stress.heat_stress_score:.2f}")
    print(f"   Composite stress: {indices.composite_stress_score:.2f}")
    print(f"   Dominant stress: {indices.dominant_stress}")
    print(f"   Confidence: {indices.confidence_score:.2%}")

if __name__ == "__main__":
    asyncio.run(test_weather_processor())
```

Run the test:
```bash
python test_processors.py
```

## 📋 Implementation Priorities

### Phase 1: Celery Workers (2-3 days)
**Directory:** `src/workers/`

**Files to create:**
1. `celery_app.py` - Celery configuration and app initialization
2. `weather_tasks.py` - Weather data fetching and processing tasks
3. `satellite_tasks.py` - Satellite image processing tasks
4. `damage_tasks.py` - Damage assessment tasks
5. `scheduler.py` - Periodic task scheduling (Celery Beat)

**Example task:**
```python
# src/workers/weather_tasks.py
from celery import shared_task
from src.processors import WeatherProcessor
from src.integrations import WeatherXMClient
from src.storage import TimescaleClient

@shared_task(bind=True, max_retries=3)
async def process_weather_for_plot(self, plot_id: str, policy_id: str):
    """Process weather data for a plot."""
    try:
        # Initialize clients
        weather_client = WeatherXMClient()
        await weather_client.connect()
        
        processor = WeatherProcessor()
        timescale = TimescaleClient()
        await timescale.connect()
        
        # Get plot location
        # plot_info = await get_plot_info(plot_id)
        
        # Fetch weather data
        # weather_data = await weather_client.get_historical_weather(...)
        
        # Calculate indices
        # indices = await processor.calculate_weather_indices(...)
        
        # Store results
        # await timescale.store_weather_indices(indices)
        
        return {"status": "success", "plot_id": plot_id}
        
    except Exception as e:
        self.retry(exc=e, countdown=60)
```

### Phase 2: FastAPI Application (2-3 days)
**Directory:** `src/api/`

**Files to create:**
1. `app.py` - FastAPI app initialization
2. `routes.py` - API endpoint definitions
3. `websocket.py` - WebSocket handlers for real-time updates
4. `auth.py` - Authentication/authorization
5. `schemas.py` - Request/response schemas

**Example API:**
```python
# src/api/app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="MicroCrop Data Processor API",
    version="1.0.0",
    description="Parametric crop insurance data processing API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@app.post("/api/v1/weather/process")
async def process_weather(plot_id: str, policy_id: str):
    """Trigger weather processing for a plot."""
    from src.workers.weather_tasks import process_weather_for_plot
    
    task = process_weather_for_plot.delay(plot_id, policy_id)
    
    return {
        "task_id": task.id,
        "status": "processing",
        "plot_id": plot_id
    }

@app.get("/api/v1/damage/{assessment_id}")
async def get_damage_assessment(assessment_id: str):
    """Get a damage assessment by ID."""
    from src.storage import TimescaleClient
    
    timescale = TimescaleClient()
    await timescale.connect()
    
    assessment = await timescale.get_damage_assessment(assessment_id)
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return assessment
```

### Phase 3: Testing Suite (3-4 days)
**Directory:** `tests/`

**Test structure:**
```
tests/
├── __init__.py
├── conftest.py                  # Pytest fixtures
├── unit/
│   ├── test_weather_processor.py
│   ├── test_satellite_processor.py
│   ├── test_damage_calculator.py
│   ├── test_storage_clients.py
│   └── test_integrations.py
├── integration/
│   ├── test_weather_pipeline.py
│   ├── test_satellite_pipeline.py
│   └── test_damage_pipeline.py
└── performance/
    └── test_throughput.py
```

**Example test:**
```python
# tests/unit/test_weather_processor.py
import pytest
from datetime import datetime, timedelta
from src.processors import WeatherProcessor
from src.models.weather import WeatherData

@pytest.fixture
def weather_processor():
    return WeatherProcessor()

@pytest.fixture
def sample_weather_data():
    return [
        WeatherData(
            station_id="test_station",
            timestamp=datetime.utcnow() - timedelta(hours=i),
            latitude=0.0,
            longitude=0.0,
            temperature=30.0,
            rainfall=0.0,
            humidity=50.0,
            pressure=1013.25,
            wind_speed=5.0,
            data_quality=1.0,
        )
        for i in range(100)
    ]

@pytest.mark.asyncio
async def test_drought_calculation(weather_processor, sample_weather_data):
    """Test drought index calculation."""
    indices = await weather_processor.calculate_weather_indices(
        plot_id="test_plot",
        policy_id="test_policy",
        start_date=datetime.utcnow() - timedelta(days=7),
        end_date=datetime.utcnow(),
        weather_data=sample_weather_data,
    )
    
    assert indices.drought.drought_score >= 0
    assert indices.drought.drought_score <= 1
    assert indices.drought.severity_level in ["none", "mild", "moderate", "severe", "extreme"]
```

Run tests:
```bash
# Install testing dependencies
pip install pytest pytest-asyncio pytest-cov pytest-mock

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Run specific test
pytest tests/unit/test_weather_processor.py -v
```

### Phase 4: Blockchain Integration (2 days)
**Directory:** `src/blockchain/`

**Files to create:**
1. `web3_client.py` - Web3 connection to Base L2
2. `oracle_processor.py` - Oracle data submission
3. `contracts.py` - Smart contract interfaces
4. `transaction_manager.py` - Transaction handling

**Example:**
```python
# src/blockchain/web3_client.py
from web3 import Web3
from src.config import get_settings

class Web3Client:
    def __init__(self):
        self.settings = get_settings()
        self.w3 = Web3(Web3.HTTPProvider(self.settings.BLOCKCHAIN_RPC_URL))
        
    async def submit_weather_data(self, oracle_address: str, data: dict):
        """Submit weather data to oracle contract."""
        # Build transaction
        # Sign transaction
        # Submit to blockchain
        # Wait for confirmation
        pass
```

## 🛠️ Development Commands

### Start Services
```bash
# Start all infrastructure
docker-compose up -d

# Start only specific services
docker-compose up -d postgres redis kafka

# View logs
docker-compose logs -f processor-api
docker-compose logs -f celery-worker

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Database Management
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U microcrop -d microcrop

# View tables
\dt

# Query weather data
SELECT * FROM weather_data LIMIT 10;

# Check hypertables
SELECT * FROM timescaledb_information.hypertables;
```

### Redis Management
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# View all keys
KEYS *

# Get cached value
GET weather:plot_123

# Flush all (caution!)
FLUSHALL
```

### MinIO Management
```bash
# Access MinIO console
open http://localhost:9001

# Credentials: minioadmin / minioadmin
```

### Monitoring
```bash
# Flower (Celery monitoring)
open http://localhost:5555

# Prometheus metrics
open http://localhost:9090

# Grafana dashboards
open http://localhost:3000
# Credentials: admin / admin
```

## 📊 Performance Testing

```python
# performance_test.py
import asyncio
import time
from src.processors import WeatherProcessor

async def benchmark_weather_processing():
    processor = WeatherProcessor()
    
    # Generate large dataset
    weather_data = [...]  # 10,000 records
    
    start_time = time.time()
    
    # Process in batches
    tasks = []
    for batch in batches(weather_data, 1000):
        task = processor.calculate_weather_indices(...)
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"Processed {len(weather_data)} records in {duration:.2f}s")
    print(f"Throughput: {len(weather_data) / duration:.0f} records/second")

asyncio.run(benchmark_weather_processing())
```

## 🐛 Debugging Tips

### Enable Debug Logging
```python
# In .env
LOG_LEVEL=DEBUG
```

### Test Individual Components
```python
# test_individual.py
import asyncio
from src.storage import TimescaleClient

async def test_database():
    client = TimescaleClient()
    await client.connect()
    
    # Test query
    result = await client.execute_query(
        "SELECT COUNT(*) FROM weather_data"
    )
    print(f"Weather records: {result[0]['count']}")
    
    await client.disconnect()

asyncio.run(test_database())
```

### Monitor Performance
```python
import logging
from src.config.logging_config import setup_logging

# Enable performance logging
setup_logging(log_level="DEBUG")

# Performance logs will include timing information
```

## 📝 Code Quality

### Format Code
```bash
# Install formatters
pip install black isort flake8 mypy

# Format with black
black src/ tests/

# Sort imports
isort src/ tests/

# Lint
flake8 src/ tests/

# Type check
mypy src/
```

### Pre-commit Hooks
```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

## 🎯 Success Metrics

Track these metrics to ensure quality:
- [ ] All core processors working
- [ ] Database connections stable
- [ ] Cache hit rate >80%
- [ ] API response time <500ms (p99)
- [ ] Test coverage >90%
- [ ] Zero critical errors in logs
- [ ] Successful integration tests
- [ ] Documentation complete

---

**Ready to continue development!** Start with Celery workers for distributed task processing.
