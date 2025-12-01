# Pinata IPFS Configuration Guide

## Overview

MicroCrop Data Processor uses **Pinata** as the IPFS provider for storing damage assessment proofs. Pinata provides reliable IPFS pinning services with a custom gateway for fast content retrieval.

**Updated**: November 7, 2025  
**IPFS Provider**: Pinata Cloud  
**Purpose**: Decentralized storage of damage assessment proofs

---

## 🔧 Configuration

### Environment Variables

Your `.env` file should contain the following Pinata credentials:

```bash
# ============ IPFS ============

# Pinata API Credentials
API_KEY=1aab546b4b1d5840a618
API_SECRET=886ef4af9126ab533226fc999645e0d49498edb1b6e8b4cc48a21ce6195d688b

# Pinata JWT Token (recommended for authentication)
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIwMjQ0Yzc3NS1lZWM3LTRjZDQtYjU1Yy1jMWYxY2FkMzUxM2UiLCJlbWFpbCI6InRpbWJ3YW1vc2VzODNAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjFhYWI1NDZiNGIxZDU4NDBhNjE4Iiwic2NvcGVkS2V5U2VjcmV0IjoiODg2ZWY0YWY5MTI2YWI1MzMyMjZmYzk5OTY0NWUwZDQ5NDk4ZWRiMWI2ZThiNGNjNDhhMjFjZTYxOTVkNjg4YiIsImV4cCI6MTc5NDAzMTE1Mn0.9kUpuuycxrTjgo3hdvcu7TkXxcdGnoh-Qcw-vzXeIiw

# Custom Pinata Gateway (faster retrieval)
PINATA_GATEWAY=maroon-careful-wren-616.mypinata.cloud
```

### Configuration Mapping

The settings are mapped in `src/config/settings.py`:

```python
# IPFS Storage Configuration
PINATA_API_KEY: str = Field(..., env="API_KEY")
PINATA_SECRET_KEY: str = Field(..., env="API_SECRET")
PINATA_JWT: Optional[str] = Field(None, env="PINATA_JWT")
PINATA_GATEWAY: str = Field("gateway.pinata.cloud", env="PINATA_GATEWAY")
```

---

## 🔐 Authentication

### JWT Token (Recommended)

The IPFS client prioritizes JWT token authentication when available:

```python
if self.pinata_jwt:
    headers = {
        "Authorization": f"Bearer {self.pinata_jwt}",
    }
```

**Benefits**:
- ✅ More secure than API key/secret
- ✅ Scoped permissions
- ✅ Easier rotation
- ✅ Better for production

### API Key/Secret (Fallback)

If JWT token is not provided, the client falls back to API key/secret:

```python
else:
    headers = {
        "pinata_api_key": self.pinata_api_key,
        "pinata_secret_api_key": self.pinata_secret,
    }
```

---

## 🚀 Usage

### IPFSClient Operations

The `IPFSClient` class provides the following operations:

#### 1. Upload Damage Proof

```python
from src.storage.ipfs_client import IPFSClient

ipfs_client = IPFSClient()
await ipfs_client.connect()

# Upload damage assessment proof
proof_data = {
    "assessment_id": "DA_plot_123_20251107_143000",
    "plot_id": "plot_123",
    "farmer_address": "0x1234...",
    "damage_scores": {...},
    "payout": {...},
}

cid = await ipfs_client.upload_damage_proof(
    assessment_id="DA_plot_123_20251107_143000",
    proof_data=proof_data,
    metadata={
        "plot_id": "plot_123",
        "payout_amount": "3640.0",
    }
)

print(f"Proof uploaded to IPFS: {cid}")
# Output: QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 2. Upload Generic JSON

```python
# Upload any JSON data
data = {
    "timestamp": "2025-11-07T14:30:00Z",
    "type": "weather_report",
    "data": {...}
}

cid = await ipfs_client.upload_json(
    data=data,
    name="weather_report_20251107.json",
    metadata={"type": "weather"}
)
```

#### 3. Retrieve Content

```python
# Retrieve content by CID
content = await ipfs_client.get_content(cid)
print(content)
```

#### 4. Get Gateway URL

```python
# Generate public gateway URL
url = ipfs_client.get_gateway_url(cid)
print(url)
# Output: https://maroon-careful-wren-616.mypinata.cloud/ipfs/QmXxx...
```

#### 5. Pin Management

```python
# Pin an existing hash
success = await ipfs_client.pin_hash(
    cid="QmXxx...",
    name="damage_proof_plot_123"
)

# Unpin a hash
success = await ipfs_client.unpin_hash(cid="QmXxx...")

# Get pin list
pins = await ipfs_client.get_pin_list(status="pinned", limit=100)

# Verify CID is pinned
is_pinned = await ipfs_client.verify_cid(cid="QmXxx...")

# Get pin information
pin_info = await ipfs_client.get_pin_info(cid="QmXxx...")
```

---

## 📦 Damage Assessment Proof Structure

When a damage assessment triggers a payout, the proof is automatically uploaded to IPFS:

```json
{
  "assessment_id": "DA_plot_123_20251107_143000",
  "plot_id": "plot_123",
  "policy_id": "policy_456",
  "farmer_address": "0x1234567890123456789012345678901234567890",
  "assessment_period": {
    "start": "2025-11-01T00:00:00Z",
    "end": "2025-11-07T23:59:59Z"
  },
  "damage_scores": {
    "weather_damage_score": 0.68,
    "satellite_damage_score": 0.42,
    "composite_damage_score": 0.52
  },
  "payout": {
    "triggered": true,
    "gross_payout_usdc": 5200.0,
    "deductible_usdc": 1560.0,
    "net_payout_usdc": 3640.0,
    "trigger_reasons": [
      "Composite damage score (0.52) exceeds threshold (0.30)",
      "Weather damage: Severe drought detected",
      "Satellite data: NDVI decline of 35%"
    ]
  },
  "evidence": {
    "weather_indices": {
      "composite_stress_score": 0.68,
      "dominant_stress": "drought",
      "drought_score": 0.82,
      "flood_score": 0.05,
      "heat_score": 0.32
    },
    "satellite_image_count": 3,
    "confidence_score": 0.87
  },
  "timestamp": "2025-11-07T14:30:00Z"
}
```

---

## 🔗 Gateway URLs

### Custom Pinata Gateway

Your custom gateway: `maroon-careful-wren-616.mypinata.cloud`

**Format**: `https://maroon-careful-wren-616.mypinata.cloud/ipfs/{CID}`

**Example**: 
```
https://maroon-careful-wren-616.mypinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco
```

**Benefits**:
- ⚡ Faster retrieval (dedicated gateway)
- 🔒 Better control
- 📊 Analytics
- 🌐 Custom domain

### Public IPFS Gateways (Alternative)

If custom gateway is unavailable, content is also accessible via public gateways:

- `https://ipfs.io/ipfs/{CID}`
- `https://gateway.pinata.cloud/ipfs/{CID}`
- `https://cloudflare-ipfs.com/ipfs/{CID}`

---

## 🔄 Integration with Celery Tasks

The IPFS client is integrated into the damage assessment workflow:

### In `damage_tasks.py`:

```python
# When payout is triggered
if assessment.payout_trigger.is_triggered:
    logger.info(f"Payout triggered for plot {plot_id}, uploading proof to IPFS")
    
    # Create proof document
    proof_data = {...}
    
    # Upload to IPFS via Pinata
    ipfs_cid = await ipfs_client.upload_damage_proof(
        assessment_id=assessment_id,
        proof_data=proof_data,
        metadata={
            "plot_id": plot_id,
            "policy_id": policy_id,
            "payout_amount": assessment.payout_trigger.net_payout_usdc,
        },
    )
    
    # Also upload to MinIO for backup
    await minio_client.upload_damage_proof(
        assessment_id=assessment_id,
        proof_data=json.dumps(proof_data).encode(),
        content_type="application/json",
        metadata={"ipfs_cid": ipfs_cid},
    )
    
    # Store IPFS CID in database
    await timescale_client.execute_query(
        "UPDATE damage_assessments SET ipfs_cid = $1 WHERE assessment_id = $2",
        ipfs_cid,
        assessment_id,
    )
```

---

## 🔍 Testing the Configuration

### Test Connection

```python
import asyncio
from src.storage.ipfs_client import IPFSClient

async def test_pinata():
    client = IPFSClient()
    
    try:
        # Connect and test authentication
        await client.connect()
        print("✅ Connected to Pinata successfully")
        
        # Upload test data
        test_data = {
            "test": "data",
            "timestamp": "2025-11-07T14:30:00Z"
        }
        
        cid = await client.upload_json(
            data=test_data,
            name="test.json",
            metadata={"type": "test"}
        )
        
        print(f"✅ Test data uploaded: {cid}")
        
        # Get gateway URL
        url = client.get_gateway_url(cid)
        print(f"✅ Gateway URL: {url}")
        
        # Retrieve content
        content = await client.get_content(cid)
        print(f"✅ Content retrieved: {content}")
        
        await client.disconnect()
        
    except Exception as e:
        print(f"❌ Error: {e}")

# Run test
asyncio.run(test_pinata())
```

### Expected Output

```
✅ Connected to Pinata successfully
✅ Test data uploaded: QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco
✅ Gateway URL: https://maroon-careful-wren-616.mypinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco
✅ Content retrieved: {'test': 'data', 'timestamp': '2025-11-07T14:30:00Z'}
```

---

## 📊 Pinata Dashboard

Access your Pinata account at: https://app.pinata.cloud

**Features**:
- 📁 View all pinned files
- 📊 Storage usage statistics
- 🔍 Search pins by name/CID
- 📈 API usage analytics
- ⚙️ Gateway configuration
- 🔑 API key management

**Your Configuration**:
- **Gateway**: maroon-careful-wren-616.mypinata.cloud
- **API Key**: 1aab546b4b1d5840a618
- **Regions**: FRA1 (France), NYC1 (New York) - 1 replica each

---

## 🔒 Security Best Practices

### 1. Environment Variables

- ✅ **Never commit** `.env` file to git
- ✅ Use `.env.example` for templates
- ✅ Rotate JWT tokens periodically
- ✅ Use different keys for dev/staging/production

### 2. JWT Token Security

```bash
# Generate new JWT token from Pinata dashboard:
# 1. Go to https://app.pinata.cloud
# 2. Navigate to API Keys
# 3. Create New Key
# 4. Set permissions (pinning, unpinning)
# 5. Copy JWT token
# 6. Update PINATA_JWT in .env
```

### 3. Access Control

- Limit JWT token permissions to minimum required
- Use scoped keys for different environments
- Monitor API usage in Pinata dashboard
- Set up alerts for unusual activity

---

## 📈 Monitoring & Analytics

### Pinata Metrics

Monitor your IPFS usage:

```python
from src.storage.ipfs_client import IPFSClient

async def get_pinata_stats():
    client = IPFSClient()
    await client.connect()
    
    # Get total pins
    pins = await client.get_pin_list(status="pinned", limit=1000)
    print(f"Total pins: {len(pins)}")
    
    # Get storage usage (available in Pinata dashboard)
    # API: GET /data/pinList?status=pinned
```

### Key Metrics

- Total pins
- Storage used (GB)
- Bandwidth used (GB)
- API requests/day
- Gateway requests/day

---

## 🔮 Future Enhancements

### 1. Pin Lifecycle Management

```python
# Archive old proofs (>90 days)
async def archive_old_proofs():
    # Get old assessments
    old_assessments = await get_old_assessments(days=90)
    
    for assessment in old_assessments:
        # Optionally unpin from IPFS
        await ipfs_client.unpin_hash(assessment.ipfs_cid)
        
        # Keep in MinIO for long-term storage
```

### 2. Content Encryption

```python
# Encrypt sensitive data before IPFS upload
from cryptography.fernet import Fernet

def encrypt_proof(proof_data: dict, key: bytes) -> bytes:
    f = Fernet(key)
    json_str = json.dumps(proof_data)
    return f.encrypt(json_str.encode())

# Upload encrypted proof
encrypted_data = encrypt_proof(proof_data, encryption_key)
cid = await ipfs_client.upload_encrypted_proof(encrypted_data)
```

### 3. Multi-Gateway Support

```python
# Replicate to multiple gateways for redundancy
gateways = [
    "maroon-careful-wren-616.mypinata.cloud",
    "gateway.pinata.cloud",
    "ipfs.io",
]

for gateway in gateways:
    try:
        content = await fetch_from_gateway(gateway, cid)
        if content:
            break
    except:
        continue
```

---

## ✅ Configuration Checklist

- [x] Pinata account created
- [x] API key and secret obtained
- [x] JWT token generated
- [x] Custom gateway configured
- [x] Environment variables set in `.env`
- [x] `settings.py` updated with correct field mappings
- [x] `ipfs_client.py` updated to use JWT authentication
- [x] Gateway URL functions updated
- [x] Integration tested with damage assessment workflow

---

## 📝 Summary

Your MicroCrop Data Processor is now configured to use **Pinata** for IPFS storage:

✅ **Authentication**: JWT token (primary), API key/secret (fallback)  
✅ **Custom Gateway**: maroon-careful-wren-616.mypinata.cloud  
✅ **Redundancy**: FRA1 + NYC1 regions (1 replica each)  
✅ **Integration**: Fully integrated with damage assessment workflow  
✅ **Backup**: MinIO storage alongside IPFS  

**IPFS CID Format**: `QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`  
**Gateway URL Format**: `https://maroon-careful-wren-616.mypinata.cloud/ipfs/{CID}`

All damage assessment proofs will be automatically uploaded to IPFS when a payout is triggered, providing **immutable, verifiable proof** of crop damage for insurance claims.

