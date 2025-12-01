# Quick Install Guide - Blockchain Integration Only

## ⚡ Fast Setup (Blockchain Integration Only)

If you want to run just the blockchain integration without the full data processing pipeline, follow these steps:

### 1. Cancel Current Installation
```bash
# Press Ctrl + C to stop the current pip install
```

### 2. Install Blockchain Dependencies Only
```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor

# Activate virtual environment
source venv/bin/activate

# Upgrade pip first
pip install --upgrade pip

# Install blockchain dependencies (fast, no GDAL)
pip install -r requirements-blockchain.txt
```

### 3. Configure Environment
```bash
# Copy example env file
cp .env.example .env  # If it exists

# Or create minimal .env with blockchain settings
cat > .env << 'EOF'
# Minimal configuration for blockchain integration
ENVIRONMENT=development
DEBUG=True
LOG_LEVEL=INFO

# Database (uses backend's postgres)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/microcrop
TIMESCALE_URL=postgresql://postgres:postgres@localhost:5432/microcrop

# Redis
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Blockchain
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
BLOCKCHAIN_CHAIN_ID=8453
ORACLE_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
ORACLE_ADDRESS=0x0000000000000000000000000000000000000000

# Contract Addresses (replace with deployed addresses)
WEATHER_ORACLE_CONTRACT=0x0000000000000000000000000000000000000000
SATELLITE_ORACLE_CONTRACT=0x0000000000000000000000000000000000000000
DAMAGE_CALCULATOR_CONTRACT=0x0000000000000000000000000000000000000000
EOF
```

### 4. Run Database Migration
```bash
# Connect to postgres (running in Docker)
psql -U postgres -h localhost -d microcrop < scripts/migrations/005_blockchain_integration.sql
```

### 5. Test Blockchain Integration
```bash
# Test Web3 client
python -c "
from src.integrations.web3_client import Web3Client
import asyncio

async def test():
    client = Web3Client()
    print(f'✅ Web3Client initialized')
    print(f'Chain ID: {client.w3.eth.chain_id}')
    print(f'Oracle Address: {client.oracle_address}')

asyncio.run(test())
"
```

### 6. Start Blockchain Workers
```bash
# Start Celery workers (blockchain tasks only)
celery -A workers.celery_app worker \
    --loglevel=info \
    --queues=blockchain \
    --concurrency=2

# In another terminal: Start Beat (periodic tasks)
celery -A workers.celery_app beat --loglevel=info

# In another terminal: Start Flower (monitoring)
celery -A workers.celery_app flower --port=5555
```

---

## 🔄 Full Installation (With Geospatial)

If you need the full data processor with weather/satellite processing:

### 1. Install System Dependencies (macOS)
```bash
# Install GDAL and other geospatial libraries
brew install gdal geos proj

# This takes 10-15 minutes
```

### 2. Install All Python Packages
```bash
# After GDAL is installed
pip install -r requirements.txt

# This will install:
# - All geospatial libraries (rasterio, shapely, geopandas)
# - All ML libraries (scikit-learn, xgboost, prophet)
# - All data processing libraries (numpy, pandas, scipy)
# - Blockchain integration (web3, eth-account)
```

---

## ✅ What's Included in Blockchain-Only Install

With `requirements-blockchain.txt` you can:

✅ **Web3Client** - Full blockchain integration
✅ **OracleProcessor** - Data submission to smart contracts
✅ **Blockchain Workers** - All Celery tasks for blockchain
✅ **Transaction Monitoring** - Track on-chain submissions
✅ **Gas Cost Analytics** - Monitor oracle costs
✅ **Testing** - Run blockchain integration tests

❌ **Not Included:**
- Weather processing (requires scipy, statsmodels)
- Satellite image processing (requires rasterio, opencv, GDAL)
- Machine learning models (requires scikit-learn, xgboost)

---

## 🎯 Recommended Approach

**For Development/Testing Blockchain:**
1. Use `requirements-blockchain.txt` (5 minutes install)
2. Mock weather/satellite data in database
3. Test blockchain submission workflows

**For Production:**
1. Install full `requirements.txt` on a Linux server
2. GDAL installs faster on Linux
3. Use Docker for consistent environment

---

## 📦 Installation Time Comparison

| Method | Time | What You Get |
|--------|------|--------------|
| Blockchain only | 5 min | Web3 + Blockchain workers |
| + Basic ML | 15 min | Add numpy, pandas, scikit-learn |
| Full (with GDAL) | 30-45 min | Everything (weather, satellite, ML) |

---

## 🚀 Quick Start After Install

```bash
# 1. Test imports
python -c "from src.integrations.web3_client import Web3Client; print('✅ Imports working')"

# 2. Start workers
celery -A workers.celery_app worker --loglevel=info

# 3. Check Flower dashboard
open http://localhost:5555
```

---

## 🆘 Troubleshooting

### Pip Taking Forever?
```bash
# Kill it: Ctrl + C
# Use blockchain-only requirements
pip install -r requirements-blockchain.txt
```

### Import Errors?
```bash
# Make sure you're in venv
source venv/bin/activate

# Check Python version (need 3.9+)
python --version

# Reinstall if needed
pip install -r requirements-blockchain.txt --force-reinstall
```

### GDAL Issues?
```bash
# Skip GDAL for now
pip install -r requirements-blockchain.txt

# Install GDAL later when needed
brew install gdal
pip install GDAL==$(gdal-config --version)
```

---

## 📝 Summary

**The blockchain integration is ready to use with just the lightweight dependencies!**

You don't need GDAL/geospatial libraries to:
- Submit data to blockchain
- Monitor transactions
- Run Celery workers
- Track gas costs
- Test smart contract interactions

Install the full requirements later when you need actual weather/satellite processing.

---

**Next:** Press `Ctrl + C`, then run:
```bash
pip install -r requirements-blockchain.txt
```
