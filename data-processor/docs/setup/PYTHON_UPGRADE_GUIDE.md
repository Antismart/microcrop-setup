# Python 3.10+ Upgrade Guide

## Current Issue

**Your Python**: 3.9.6  
**Full requirements.txt needs**: Python 3.10+

**Reason**: Several packages require Python 3.10+:
- ipython 8.20.0
- Several pandas/numpy versions
- Various other ML libraries

## What's Already Working (Python 3.9.6)

✅ **Blockchain Integration** (installed via requirements-blockchain.txt):
- Web3Client with Base blockchain
- OracleProcessor for data aggregation
- 13 Celery tasks
- Redis caching
- TimescaleDB
- Transaction monitoring
- Gas optimization

**You can use blockchain features RIGHT NOW without upgrading!**

## What Requires Python 3.10+

❌ **Full Data Processing Stack**:
- WeatherProcessor (raw weather data)
- SatelliteProcessor (satellite imagery)
- DamageCalculator (damage assessment)
- GDAL/rasterio (geospatial)
- ML models (XGBoost, LightGBM, Prophet)

## Upgrade Options

### Option A: Install Python 3.10+ with pyenv (Recommended)

```bash
# Install pyenv if not already installed
brew install pyenv

# Install Python 3.10 (or 3.11)
pyenv install 3.10.13

# Set local Python version for this project
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
pyenv local 3.10.13

# Recreate virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate

# Install system dependencies
brew install gdal  # Takes 10-15 minutes

# Install full requirements
pip install --upgrade pip
pip install -r requirements.txt  # Takes 30-45 minutes
```

### Option B: Use System Python 3.10+

If you already have Python 3.10+ installed elsewhere:

```bash
# Check available Python versions
ls /usr/local/bin/python* /opt/homebrew/bin/python*

# Or install via Homebrew
brew install python@3.10

# Recreate venv with Python 3.10
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor
rm -rf venv
/opt/homebrew/bin/python3.10 -m venv venv
source venv/bin/activate

# Verify version
python --version  # Should show 3.10.x

# Install dependencies
pip install --upgrade pip
pip install -r requirements-blockchain.txt  # Fast (5 min)
# OR
pip install -r requirements.txt  # Full (45+ min)
```

### Option C: Fix requirements.txt for Python 3.9

Modify requirements.txt to use compatible versions:

```bash
# Edit requirements.txt
# Change:
ipython==8.20.0  →  ipython==8.12.3  # Last version for Python 3.9
numpy>=1.26.0    →  numpy<1.27.0     # Compatible versions
# ... other adjustments
```

This is tedious and not recommended - better to upgrade Python.

## Recommendation

### For Production Use
**Upgrade to Python 3.10+** - You'll need it eventually for all features

### For Quick Testing
**Stay on Python 3.9.6** with requirements-blockchain.txt - Your blockchain integration is fully functional!

## Next Steps (Without Upgrading)

You can start using blockchain integration RIGHT NOW:

```bash
# 1. Run database migration
psql -U postgres -h localhost -d microcrop < scripts/migrations/005_blockchain_integration.sql

# 2. Start Celery worker
export PYTHONPATH=$PWD/src
celery -A workers.celery_app worker --loglevel=info --queues=blockchain

# 3. Test blockchain health check
python -c "
import sys, os, asyncio
sys.path.insert(0, 'src')
from workers.blockchain_tasks import blockchain_health_check
result = blockchain_health_check.apply_async()
print('Task queued:', result.id)
"
```

## Summary

| Feature | Python 3.9.6 | Python 3.10+ |
|---------|-------------|--------------|
| Blockchain Integration | ✅ Works | ✅ Works |
| Web3Client | ✅ Works | ✅ Works |
| OracleProcessor | ✅ Works | ✅ Works |
| Celery Tasks | ✅ Works | ✅ Works |
| Weather/Satellite Processors | ❌ No | ✅ Yes |
| GDAL/Rasterio | ❌ No | ✅ Yes |
| Full ML Stack | ❌ Limited | ✅ Full |

**Decision**: Keep Python 3.9.6 for now, upgrade later when you need full features.
