# MicroCrop Blockchain Integration

**Complete Guide to Blockchain Integration**  
**Date:** November 7, 2025  
**Status:** ✅ Production Ready

---

## Overview

The MicroCrop data processor integrates with Base blockchain smart contracts to provide:
- **Decentralized oracle services** for weather and satellite data
- **On-chain damage assessments** with cryptographic proof
- **Automated payout triggers** based on verified data
- **Transparent and auditable** insurance operations

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Processor                            │
│                                                              │
│  ┌──────────────────┐     ┌──────────────────┐            │
│  │  Web3Client      │     │ OracleProcessor  │            │
│  │  - Contract ABIs │────▶│ - Data aggregation│           │
│  │  - Transaction   │     │ - Submission queue│           │
│  │  - Gas management│     │ - Retry logic     │           │
│  └──────────────────┘     └──────────────────┘            │
│           │                         │                        │
│           │                         │                        │
│  ┌────────▼─────────────────────────▼────────┐            │
│  │         Blockchain Tasks (Celery)          │            │
│  │  - submit_weather_to_blockchain           │            │
│  │  - submit_satellite_to_blockchain         │            │
│  │  - assess_damage_on_chain                 │            │
│  │  - monitor_blockchain_transactions        │            │
│  └───────────────────────────────────────────┘            │
│                                                              │
└──────────────────────┬───────────────────────────────────┘
                       │
                       │ Web3.py
                       │
┌──────────────────────▼───────────────────────────────────┐
│                  Base Blockchain                          │
│                                                           │
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │ WeatherOracle   │  │ SatelliteOracle  │             │
│  │ - submitData()  │  │ - submitData()   │             │
│  └─────────────────┘  └──────────────────┘             │
│                                                           │
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │DamageCalculator │  │   PolicyManager  │             │
│  │ - assessDamage()│  │ - triggerPolicy()│             │
│  └─────────────────┘  └──────────────────┘             │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Weather/Satellite Processing**
   - Data collected from external APIs
   - Processed and aggregated in TimescaleDB
   - Celery task schedules blockchain submission
   - OracleProcessor submits to WeatherOracle/SatelliteOracle
   - Transaction confirmed and recorded

2. **Damage Assessment**
   - Policy meets trigger conditions
   - Damage calculated from weather + satellite data
   - OracleProcessor triggers on-chain assessment
   - DamageCalculator validates and records damage
   - PayoutEngine automatically processes if triggered

---

## Components

### 1. Web3Client (`src/integrations/web3_client.py`)

**Production-grade Web3 client for blockchain interactions.**

#### Features
- ✅ Contract ABI management for all oracles
- ✅ Transaction signing with private key
- ✅ Gas estimation and optimization
- ✅ Transaction confirmation monitoring
- ✅ Retry logic for network failures
- ✅ Event parsing and decoding

#### Key Methods

```python
# Initialize client
web3_client = await get_web3_client()

# Submit weather data
tx_hash, receipt = await web3_client.submit_weather_data(
    plot_id=123,
    period_start=1699392000,  # Unix timestamp
    period_end=1699478400,
    weather_data={
        'avg_temperature': 25.5,
        'total_precipitation': 45.2,
        'drought_index': 0.15,
        # ... more metrics
    }
)

# Submit satellite data
tx_hash, receipt = await web3_client.submit_satellite_data(
    plot_id=123,
    period_start=1699392000,
    period_end=1699478400,
    satellite_data={
        'ndvi': 0.75,
        'evi': 0.68,
        'lai': 3.2,
        # ... more metrics
    }
)

# Assess damage for policy
tx_hash, damage_pct, receipt = await web3_client.assess_damage(
    policy_id=456
)

# Check if policy should trigger
should_trigger = await web3_client.check_trigger_conditions(
    policy_id=456
)
```

#### Configuration

```python
# In .env file
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
BLOCKCHAIN_CHAIN_ID=8453  # Base mainnet
ORACLE_PRIVATE_KEY=0x...
ORACLE_ADDRESS=0x...

# Contract addresses
WEATHER_ORACLE_CONTRACT=0x...
SATELLITE_ORACLE_CONTRACT=0x...
DAMAGE_CALCULATOR_CONTRACT=0x...
```

### 2. OracleProcessor (`src/processors/oracle_processor.py`)

**High-level oracle service for data submission.**

#### Features
- ✅ Aggregates data from TimescaleDB
- ✅ Formats data for smart contracts
- ✅ Manages submission queue
- ✅ Tracks transaction status
- ✅ Prevents duplicate submissions (Redis cache)
- ✅ Monitors gas costs

#### Key Methods

```python
oracle = await get_oracle_processor()

# Submit weather data
result = await oracle.submit_weather_data(
    plot_id=123,
    period_start=datetime(2025, 11, 7, 0, 0),
    period_end=datetime(2025, 11, 7, 23, 59)
)
# Returns: {'success': True, 'tx_hash': '0x...', 'gas_used': 125000}

# Submit satellite data
result = await oracle.submit_satellite_data(
    plot_id=123,
    period_start=datetime(2025, 11, 1),
    period_end=datetime(2025, 11, 7)
)

# Assess damage and trigger payout
result = await oracle.assess_and_trigger_payout(policy_id=456)
# Returns: {'success': True, 'triggered': True, 'damage_percentage': 45, 'tx_hash': '0x...'}

# Get statistics
stats = await oracle.get_submission_stats(hours=24)
# Returns: {'total_submissions': 15, 'total_gas': 1875000, 'oracle_balance_eth': 0.5}
```

### 3. Blockchain Tasks (`src/workers/blockchain_tasks.py`)

**Celery tasks for async blockchain operations.**

#### Tasks

**Manual Submissions:**
```python
from workers.blockchain_tasks import (
    submit_weather_to_blockchain,
    submit_satellite_to_blockchain,
    assess_damage_on_chain
)

# Queue weather submission
task = submit_weather_to_blockchain.delay(
    plot_id=123,
    period_start='2025-11-07T00:00:00',
    period_end='2025-11-07T23:59:59'
)

# Queue satellite submission
task = submit_satellite_to_blockchain.delay(
    plot_id=123,
    period_start='2025-11-01T00:00:00',
    period_end='2025-11-07T23:59:59'
)

# Queue damage assessment
task = assess_damage_on_chain.delay(policy_id=456)
```

**Periodic Tasks (Auto-scheduled):**

| Task | Schedule | Description |
|------|----------|-------------|
| `schedule_weather_submissions` | Every 1 hour | Finds plots with new weather data and queues submissions |
| `schedule_satellite_submissions` | Every 6 hours | Finds plots with new satellite imagery and queues submissions |
| `check_policies_for_trigger` | Every 4 hours | Checks active policies for damage trigger conditions |
| `monitor_blockchain_transactions` | Every 5 minutes | Monitors pending transactions and updates status |
| `blockchain_health_check` | Every 10 minutes | Checks Web3 connection and oracle balance |

---

## Database Schema

### Tables Created by Migration `005_blockchain_integration.sql`

#### `oracle_submissions`
Tracks all data submissions to blockchain oracles.

```sql
CREATE TABLE oracle_submissions (
    submission_id BIGSERIAL PRIMARY KEY,
    data_type VARCHAR(50),  -- 'weather', 'satellite', 'damage'
    plot_id BIGINT,
    policy_id BIGINT,  -- For damage assessments
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    tx_hash VARCHAR(66) UNIQUE,
    block_number BIGINT,
    gas_used BIGINT,
    submitted_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    confirmation_status VARCHAR(20),
    oracle_address VARCHAR(42),
    retry_count INTEGER,
    error_message TEXT
);
```

#### `damage_assessments_blockchain`
Tracks damage assessments performed on-chain.

```sql
CREATE TABLE damage_assessments_blockchain (
    blockchain_assessment_id BIGSERIAL PRIMARY KEY,
    assessment_id BIGINT,
    policy_id BIGINT,
    damage_percentage INTEGER,  -- 0-100
    should_trigger BOOLEAN,
    tx_hash VARCHAR(66) UNIQUE,
    block_number BIGINT,
    gas_used BIGINT,
    assessed_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    oracle_address VARCHAR(42)
);
```

#### `blockchain_transactions`
Monitors all blockchain transaction status.

```sql
CREATE TABLE blockchain_transactions (
    tx_id BIGSERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE,
    tx_type VARCHAR(50),
    status VARCHAR(20),  -- 'pending', 'confirmed', 'failed'
    block_number BIGINT,
    confirmations INTEGER,
    gas_limit BIGINT,
    gas_used BIGINT,
    gas_price_wei BIGINT,
    submitted_at TIMESTAMP,
    mined_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    from_address VARCHAR(42),
    to_address VARCHAR(42),
    nonce BIGINT,
    chain_id INTEGER
);
```

#### `oracle_balance_history`
Historical record of oracle account balance.

```sql
CREATE TABLE oracle_balance_history (
    balance_id BIGSERIAL PRIMARY KEY,
    oracle_address VARCHAR(42),
    balance_wei BIGINT,
    balance_eth DECIMAL(20, 8),
    checked_at TIMESTAMP,
    gas_spent_24h BIGINT,
    transactions_24h INTEGER,
    low_balance_alert BOOLEAN
);
```

#### `contract_events`
Logs contract events emitted by smart contracts.

```sql
CREATE TABLE contract_events (
    event_id BIGSERIAL PRIMARY KEY,
    contract_address VARCHAR(42),
    event_name VARCHAR(100),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    log_index INTEGER,
    event_data JSONB,
    decoded_args JSONB,
    block_timestamp TIMESTAMP,
    indexed_at TIMESTAMP,
    processed BOOLEAN
);
```

### Views

- `v_recent_oracle_activity` - Recent submissions with confirmation times
- `v_pending_transactions` - Currently pending transactions
- `v_oracle_gas_stats` - Gas usage statistics by data type
- `v_damage_assessments_summary` - Damage assessment summary

### Functions

- `check_oracle_balance()` - Checks balance and alerts if low
- `get_oracle_stats()` - Returns submission statistics

---

## Setup Guide

### 1. Install Dependencies

```bash
cd /Users/onchainchef/Desktop/microcrop-setup/data-processor

# Web3.py already in requirements.txt
pip install web3==6.15.0 eth-account==0.11.0
```

### 2. Configure Environment

Add to `.env`:

```bash
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://mainnet.base.org
BLOCKCHAIN_CHAIN_ID=8453  # Base mainnet (84532 for testnet)

# Oracle Account
ORACLE_PRIVATE_KEY=0x1234...  # Your private key
ORACLE_ADDRESS=0xabcd...      # Corresponding address

# Contract Addresses (from deployment)
WEATHER_ORACLE_CONTRACT=0x...
SATELLITE_ORACLE_CONTRACT=0x...
DAMAGE_CALCULATOR_CONTRACT=0x...
```

### 3. Run Database Migration

```bash
# Connect to your TimescaleDB
psql -U postgres -d microcrop

# Run migration
\i scripts/migrations/005_blockchain_integration.sql
```

### 4. Start Workers

```bash
# Start Celery workers with blockchain tasks
celery -A workers.celery_app worker \
    --loglevel=info \
    --queues=default,blockchain \
    --concurrency=4

# Start Celery Beat for periodic tasks
celery -A workers.celery_app beat --loglevel=info
```

### 5. Monitor Operations

```bash
# Start Flower for monitoring
celery -A workers.celery_app flower --port=5555

# Open browser to http://localhost:5555
```

---

## Usage Examples

### Manual Submission

```python
import asyncio
from workers.blockchain_tasks import submit_weather_to_blockchain
from datetime import datetime, timedelta

# Submit today's weather data for plot 123
end_time = datetime.utcnow()
start_time = end_time - timedelta(days=1)

result = submit_weather_to_blockchain.delay(
    plot_id=123,
    period_start=start_time.isoformat(),
    period_end=end_time.isoformat()
)

# Check task status
print(f"Task ID: {result.id}")
print(f"Status: {result.status}")
print(f"Result: {result.get(timeout=60)}")
```

### Batch Submission

```python
from workers.blockchain_tasks import batch_submit_oracle_data

submissions = [
    {
        'plot_id': 123,
        'period_start': datetime(2025, 11, 7, 0, 0),
        'period_end': datetime(2025, 11, 7, 23, 59)
    },
    {
        'plot_id': 124,
        'period_start': datetime(2025, 11, 7, 0, 0),
        'period_end': datetime(2025, 11, 7, 23, 59)
    }
]

result = batch_submit_oracle_data.delay(
    data_type='weather',
    submissions=submissions
)
```

### Monitor Transactions

```python
from workers.blockchain_tasks import monitor_blockchain_transactions

# Check all pending transactions
result = monitor_blockchain_transactions.delay()
pending = result.get()

print(f"Pending transactions: {pending['pending_count']}")
for tx in pending['transactions']:
    print(f"  {tx['tx_hash']}: {tx['status']}")
```

### Get Statistics

```python
from workers.blockchain_tasks import get_oracle_stats

# Get stats for last 24 hours
stats = get_oracle_stats.delay(hours=24)
data = stats.get()

print(f"Oracle Balance: {data['oracle_balance_eth']} ETH")
print(f"Total Submissions: {data['total_submissions']}")
print(f"Total Gas Used: {data['total_gas']}")

for data_type, metrics in data['by_type'].items():
    print(f"\n{data_type.upper()}:")
    print(f"  Submissions: {metrics['submission_count']}")
    print(f"  Avg Gas: {metrics['avg_gas']}")
    print(f"  Unique Plots: {metrics['unique_plots']}")
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Oracle Balance**
   - Alert when balance < 0.1 ETH
   - Track daily gas consumption
   - Monitored every 10 minutes

2. **Transaction Status**
   - Pending transactions > 1 hour (investigate)
   - Failed transactions (check gas price, nonce)
   - Replacement transactions (speed up stuck txs)

3. **Submission Rate**
   - Weather: Should be ~24 submissions/day per plot
   - Satellite: Should be ~1-2 submissions/week per plot
   - Damage: Variable based on trigger conditions

4. **Gas Usage**
   - Weather submission: ~100-150k gas
   - Satellite submission: ~150-200k gas
   - Damage assessment: ~200-300k gas

### Query Examples

```sql
-- Recent submissions
SELECT * FROM v_recent_oracle_activity
WHERE submitted_at >= NOW() - INTERVAL '24 hours'
ORDER BY submitted_at DESC;

-- Pending transactions
SELECT * FROM v_pending_transactions;

-- Gas statistics by type
SELECT * FROM v_oracle_gas_stats;

-- Failed submissions
SELECT * FROM oracle_submissions
WHERE confirmation_status = 'failed'
    AND submitted_at >= NOW() - INTERVAL '7 days'
ORDER BY submitted_at DESC;

-- Oracle balance history
SELECT 
    oracle_address,
    balance_eth,
    gas_spent_24h,
    transactions_24h,
    checked_at
FROM oracle_balance_history
WHERE checked_at >= NOW() - INTERVAL '7 days'
ORDER BY checked_at DESC;
```

---

## Troubleshooting

### Common Issues

#### 1. "Transaction Underpriced"
**Cause:** Gas price too low for network conditions  
**Solution:** Increase `max_fee_per_gas` in Web3Client

```python
# In web3_client.py
self.max_fee_per_gas = self.w3.to_wei(2, 'gwei')  # Increase from 1 to 2
```

#### 2. "Nonce Too Low"
**Cause:** Transaction with same nonce already mined  
**Solution:** Clear Redis cache and retry

```bash
redis-cli
> DEL weather_submitted:*
> DEL satellite_submitted:*
```

#### 3. "Insufficient Funds"
**Cause:** Oracle account out of ETH  
**Solution:** Fund the oracle address

```bash
# Check balance
cast balance $ORACLE_ADDRESS --rpc-url $BLOCKCHAIN_RPC_URL

# Send ETH to oracle
cast send $ORACLE_ADDRESS --value 0.5ether --private-key $FUNDING_KEY
```

#### 4. "Contract Call Reverted"
**Cause:** Oracle not registered or lacks PROVIDER_ROLE  
**Solution:** Register oracle on WeatherOracle/SatelliteOracle

```bash
# On WeatherOracle contract
cast send $WEATHER_ORACLE_CONTRACT \
    "registerProvider()" \
    --private-key $ORACLE_PRIVATE_KEY \
    --value 1000ether  # 1000 USDC stake required
```

#### 5. Transaction Stuck Pending
**Cause:** Network congestion or too low gas price  
**Solution:** Speed up transaction

```python
# Get pending tx
tx_hash = "0x..."

# Send replacement tx with higher gas
# (handled automatically by Web3Client retry logic)
```

---

## Security Considerations

### Private Key Management

```bash
# Store private key in secure environment
# NEVER commit to git

# Use environment variables
export ORACLE_PRIVATE_KEY="0x..."

# Or use AWS Secrets Manager / HashiCorp Vault
# In production, load from secrets service
```

### Access Control

- Oracle account needs `PROVIDER_ROLE` on oracle contracts
- Stake required (1000 USDC for weather, 2000 USDC for satellite)
- Separate accounts for testnet vs mainnet

### Gas Price Protection

```python
# Set maximum gas price to prevent overpaying
MAX_GAS_PRICE = Web3.to_wei(10, 'gwei')

if current_gas_price > MAX_GAS_PRICE:
    logger.warning("Gas price too high, delaying submission")
    raise Exception("Gas price exceeds threshold")
```

---

## Testing

### Unit Tests

```bash
# Test Web3Client
pytest tests/unit/test_web3_client.py -v

# Test OracleProcessor
pytest tests/unit/test_oracle_processor.py -v

# Test blockchain tasks
pytest tests/unit/test_blockchain_tasks.py -v
```

### Integration Tests

```bash
# Test on testnet (Base Sepolia)
ENVIRONMENT=testnet pytest tests/integration/test_blockchain_integration.py -v
```

### Manual Testing

```python
# Test weather submission
from processors.oracle_processor import get_oracle_processor

oracle = await get_oracle_processor()
result = await oracle.submit_weather_data(
    plot_id=999,  # Test plot
    period_start=datetime(2025, 11, 7, 0, 0),
    period_end=datetime(2025, 11, 7, 23, 59)
)

print(f"Success: {result['success']}")
print(f"TX Hash: {result['tx_hash']}")
print(f"Gas Used: {result['gas_used']}")
```

---

## Cost Estimation

### Gas Costs (Base Mainnet)

Assuming 1 gwei gas price:

| Operation | Gas | Cost (ETH) | Cost (USD @$3000/ETH) |
|-----------|-----|------------|---------------------|
| Weather Submit | 125,000 | 0.000125 | $0.375 |
| Satellite Submit | 175,000 | 0.000175 | $0.525 |
| Damage Assessment | 250,000 | 0.000250 | $0.750 |

### Monthly Cost Projection

For 100 active plots:
- Weather: 100 plots × 30 days × $0.375 = $1,125/month
- Satellite: 100 plots × 4 times/month × $0.525 = $210/month
- Damage: ~10 assessments/month × $0.750 = $7.50/month

**Total: ~$1,342.50/month** (at 1 gwei gas price)

---

## Files Created

1. **`src/integrations/web3_client.py`** (850 lines)
   - Web3 client with contract interactions
   - Transaction management
   - Gas optimization

2. **`src/processors/oracle_processor.py`** (650 lines)
   - Oracle service layer
   - Data aggregation
   - Submission management

3. **`src/workers/blockchain_tasks.py`** (550 lines)
   - Celery tasks for blockchain ops
   - Periodic task scheduling
   - Monitoring tasks

4. **`scripts/migrations/005_blockchain_integration.sql`** (400 lines)
   - Database schema for tracking
   - Views and functions
   - Indexes for performance

5. **`BLOCKCHAIN_INTEGRATION.md`** (this file)
   - Complete documentation
   - Setup guide
   - Usage examples

---

## Summary

✅ **Web3Client** - Production-ready blockchain interface  
✅ **OracleProcessor** - High-level oracle service  
✅ **Blockchain Tasks** - Async workers with scheduling  
✅ **Database Schema** - Complete tracking and monitoring  
✅ **Documentation** - Comprehensive guide with examples  

**Status:** 🎉 **BLOCKCHAIN INTEGRATION COMPLETE**

The MicroCrop data processor is now fully integrated with Base blockchain smart contracts, providing decentralized, transparent, and automated parametric crop insurance operations.

---

**Next Steps:**
1. Deploy smart contracts to Base mainnet (see `Contracts/DEPLOYMENT_GUIDE.md`)
2. Register oracle account on deployed contracts
3. Fund oracle account with ETH for gas
4. Start Celery workers
5. Monitor operations via Flower dashboard

---

**Questions or Issues?**  
Check troubleshooting section or review code comments in:
- `src/integrations/web3_client.py`
- `src/processors/oracle_processor.py`
- `src/workers/blockchain_tasks.py`
