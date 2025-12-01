# 🛰️ Planet Labs Crop Biomass Integration Guide

## Overview

This guide explains how to integrate **Planet Labs Crop Biomass** (Planetary Variables) into the MicroCrop CRE workflow for satellite-based damage assessment.

## Why Crop Biomass?

Planet Labs specifically identifies **Crop Biomass** as ideal for:
- ✅ **Claim Verification (Insurance)** - Your exact use case!
- ✅ Crop monitoring throughout the season
- ✅ Historical baseline comparisons
- ✅ Time-series analysis for parametric triggers

Source: [Planet University - Crop Biomass Use Cases](https://university.planet.com/intro-to-crop-biomass/1749785/scorm/27m6c46uaxhww)

## Architecture Options

### Option A: Pre-Created Subscriptions (Recommended for Production)

**When to create subscriptions:**
- When farmer purchases policy → Create Planet subscription for their field
- Store subscription ID in backend database (linked to `plotId`)

**How CRE workflow uses it:**
1. Read `plotId` from PolicyManager contract
2. Query backend API for subscription ID
3. Fetch latest biomass time-series from Planet Subscriptions API
4. Calculate damage based on biomass deviation from baseline

**Pros:**
- ✅ Continuous monitoring (data ready when needed)
- ✅ Historical data accumulates automatically
- ✅ Lower latency for CRE workflow
- ✅ Better for recurring policies

**Cons:**
- ❌ Costs accrue during entire policy period (not just at claim time)
- ❌ Requires subscription management infrastructure

---

### Option B: On-Demand Queries (Simpler for MVP)

**How it works:**
1. CRE workflow fetches GPS coordinates from backend
2. Query Planet Data API for historical biomass data during policy period
3. Calculate damage based on retrieved data

**Pros:**
- ✅ Pay only when assessing damage
- ✅ Simpler initial setup
- ✅ No subscription management needed

**Cons:**
- ❌ Higher per-query costs
- ❌ Potential API rate limits
- ❌ Longer execution time for CRE workflow

---

## Implementation: Option A (Subscriptions - Recommended)

### 1. Backend Setup

#### Install Planet SDK
```bash
pip install planet
planet auth login
```

#### Create Subscription When Policy Activates

```python
# backend/src/services/planet_service.py
import asyncio
import datetime as dt
from planet import Auth, Session
from planet.clients.subscriptions import SubscriptionsClient
from planet.subscription_request import planetary_variable_source, build_request

class PlanetService:
    def __init__(self, api_key: str):
        self.auth = Auth.from_key(api_key)
    
    async def create_biomass_subscription(
        self, 
        policy_id: int,
        field_geometry: dict,  # GeoJSON polygon
        start_date: datetime,
        end_date: datetime
    ) -> str:
        """
        Create a Crop Biomass subscription for an insured field.
        Returns subscription ID to store in database.
        """
        
        # Create biomass source
        pv_source = planetary_variable_source(
            var_type="biomass_proxy",
            var_id="BIOMASS-PROXY_V4.0_10",  # Latest version
            geometry=field_geometry,
            start_time=start_date,
            end_time=end_date
        )
        
        # Build subscription request
        request = build_request(
            name=f"microcrop_policy_{policy_id}",
            source=pv_source,
            delivery={
                "type": "google_cloud_storage",
                "parameters": {
                    "bucket": "microcrop-biomass-data",
                    "credentials": self._get_gcs_credentials()
                }
            }
        )
        
        # Create subscription
        async with Session(auth=self.auth) as sess:
            cl = SubscriptionsClient(sess)
            details = await cl.create_subscription(request)
            
            return details["id"]  # Store this in your database!
    
    async def get_biomass_timeseries(
        self, 
        subscription_id: str
    ) -> list[dict]:
        """
        Fetch biomass time-series data from an active subscription.
        Returns list of {date, biomass_value} dicts.
        """
        async with Session(auth=self.auth) as sess:
            cl = SubscriptionsClient(sess)
            
            # Get subscription results
            results = await cl.get_results(subscription_id)
            
            # Parse CSV results (Planet delivers as CSVs)
            timeseries = []
            for result in results:
                if result["name"].endswith(".csv"):
                    csv_data = await self._download_csv(result["location"])
                    timeseries.extend(csv_data)
            
            return timeseries
    
    def _get_gcs_credentials(self) -> str:
        # Return base64-encoded GCS credentials
        pass
    
    async def _download_csv(self, url: str) -> list[dict]:
        # Download and parse CSV from GCS
        pass
```

#### Backend API Endpoint for CRE

```python
# backend/src/routes/planet.py
from fastapi import APIRouter, HTTPException
from ..services.planet_service import PlanetService

router = APIRouter()
planet_service = PlanetService(api_key=os.getenv("PLANET_API_KEY"))

@router.get("/api/planet/biomass/{plot_id}")
async def get_biomass_data(plot_id: int):
    """
    Fetch biomass time-series for a field.
    Called by CRE workflow during damage assessment.
    """
    # Get subscription ID from database
    policy = await db.policies.find_one({"plotId": plot_id})
    if not policy or not policy.get("planet_subscription_id"):
        raise HTTPException(404, "No biomass subscription found")
    
    # Fetch biomass data
    timeseries = await planet_service.get_biomass_timeseries(
        policy["planet_subscription_id"]
    )
    
    # Calculate statistics
    baseline_biomass = await calculate_baseline(plot_id, timeseries)
    current_biomass = timeseries[-1]["value"] if timeseries else 0
    
    return {
        "plotId": plot_id,
        "subscriptionId": policy["planet_subscription_id"],
        "timeseries": timeseries,
        "baseline": baseline_biomass,
        "current": current_biomass,
        "deviation": baseline_biomass - current_biomass
    }

async def calculate_baseline(plot_id: int, timeseries: list) -> float:
    """
    Calculate historical baseline biomass for the field.
    Could use previous years' data or seasonal averages.
    """
    # TODO: Implement baseline calculation
    # For now, use simple average of historical data
    if not timeseries:
        return 0.7  # Default baseline
    
    values = [t["value"] for t in timeseries]
    return sum(values) / len(values)
```

### 2. Update CRE Workflow

#### Updated fetchSatelliteData function

Replace the current Planet Labs API integration in `main.ts` with:

```typescript
/**
 * Fetch crop biomass data from MicroCrop backend (which queries Planet subscriptions)
 * Runs on individual nodes with consensus aggregation
 */
function fetchCropBiomassData(
  nodeRuntime: NodeRuntime<Config>, 
  policy: Policy
): SatelliteData {
  const httpClient = new cre.capabilities.HTTPClient()

  // Fetch biomass data from backend API
  const response = httpClient
    .sendRequest(nodeRuntime, {
      url: `${nodeRuntime.config.backendApiUrl}/api/planet/biomass/${policy.plotId}`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add auth header if needed
        "Authorization": `Bearer ${nodeRuntime.getSecret({ id: "BACKEND_API_TOKEN" }).result().value}`
      },
    })
    .result()

  // Parse response
  const data = JSON.parse(new TextDecoder().decode(response.body))

  // Convert Planet biomass to damage assessment format
  return {
    avgNDVI: data.current,           // Current biomass proxy
    minNDVI: Math.min(...data.timeseries.map(t => t.value)),
    ndviTrend: calculateTrend(data.timeseries.map(t => t.value)),
    baselineNDVI: data.baseline
  }
}
```

#### Updated satellite damage calculation

```typescript
/**
 * Calculate satellite damage score based on Crop Biomass deviation
 * Uses Planet's Crop Biomass Proxy instead of raw NDVI
 */
function calculateSatelliteDamage(satellite: SatelliteData): number {
  // Calculate deviation from baseline
  const deviation = satellite.baselineNDVI - satellite.avgNDVI

  // Negative deviation means crop health declined
  if (deviation <= 0) return 0

  // Scale deviation to damage percentage
  // Based on Planet Crop Biomass research:
  // - 15% biomass loss = moderate damage (30%)
  // - 30% biomass loss = severe damage (70%)
  // - 50%+ biomass loss = total loss (100%)
  
  const deviationPercent = deviation / satellite.baselineNDVI
  
  if (deviationPercent < 0.15) {
    // <15% loss: Minor damage (0-30%)
    return Math.floor((deviationPercent / 0.15) * 3000)
  } else if (deviationPercent < 0.30) {
    // 15-30% loss: Moderate damage (30-70%)
    return Math.floor(3000 + ((deviationPercent - 0.15) / 0.15) * 4000)
  } else if (deviationPercent < 0.50) {
    // 30-50% loss: Severe damage (70-100%)
    return Math.floor(7000 + ((deviationPercent - 0.30) / 0.20) * 3000)
  } else {
    // 50%+ loss: Total loss (100%)
    return 10000
  }
}
```

### 3. Update Configuration

#### Add Backend API URL to configs

`config.staging.json`:
```json
{
  ...
  "backendApiUrl": "https://staging-api.microcrop.example.com",
  ...
}
```

#### Add Backend API Token to Secrets

`secrets.yaml`:
```yaml
CRE secrets:
  - id: BACKEND_API_TOKEN
    env: BACKEND_API_TOKEN
  - id: PLANET_API_KEY
    env: PLANET_API_KEY
```

`.env`:
```bash
BACKEND_API_TOKEN=your_backend_jwt_token_here
PLANET_API_KEY=your_planet_api_key_here
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Policy Creation (Backend)                                    │
│  ─────────────────────────────                                   │
│  Farmer purchases policy                                         │
│    → Backend calls Planet API                                    │
│    → Creates Crop Biomass subscription for field                 │
│    → Stores subscription ID in database (linked to plotId)       │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Continuous Monitoring (Planet)                               │
│  ──────────────────────────────                                  │
│  Planet satellites pass over field every ~3-7 days               │
│    → Captures multispectral imagery                              │
│    → Calculates Crop Biomass Proxy (BIOMASS-PROXY_V4.0_10)      │
│    → Delivers CSV time-series to GCS bucket                      │
│    → Accumulates historical data throughout policy period        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Daily CRE Assessment (00:00 UTC)                             │
│  ───────────────────────────────────                             │
│  CRE Workflow triggers                                           │
│    → Reads active policies from PolicyManager                    │
│    → For each policy nearing end:                                │
│        ├─ Fetch weather data (WeatherXM API)                     │
│        └─ Fetch biomass data (Backend API)                       │
│            └─ Backend queries Planet subscription                │
│            └─ Returns latest biomass time-series                 │
│    → Calculate damage: 60% weather + 40% biomass                 │
│    → If damage > 10%: Submit signed report on-chain              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Automatic Payout (On-Chain)                                  │
│  ──────────────────────────                                      │
│  PayoutReceiver validates CRE report                             │
│    → Checks cryptographic signature                              │
│    → Calls Treasury.requestPayoutFromOracle()                    │
│    → Treasury transfers USDC to farmer                           │
│    → Farmer receives funds automatically (no claim filing!)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost Considerations

### Planet Costs (Estimated)

**Crop Biomass Subscriptions:**
- ~$0.10-0.50 per field per month (depends on field size and area)
- For 100 policies over 6-month season: $300-3,000
- Contact Planet Sales for exact pricing: [planet.com/contact-sales](https://www.planet.com/contact-sales/)

**Optimization Strategies:**
1. **Regional Subscriptions**: Instead of per-field, subscribe to larger regions covering multiple farms
2. **Seasonal Subscriptions**: Only subscribe during active policy periods
3. **Tiered Monitoring**: Use cheaper daily PlanetScope + occasional high-res for claims

### Total System Costs

| Component | Before (Manual NDVI) | After (Crop Biomass) | 
|-----------|---------------------|----------------------|
| CRE Execution | $300/month | $300/month |
| Planet Data | $0 (no API) | $300-3,000/month |
| WeatherXM | $50/month | $50/month |
| Backend API | $100/month | $100/month |
| **Total** | **$450/month** | **$750-3,450/month** |

**ROI Analysis:**
- Manual claim processing: ~$50/claim × 300 claims/month = $15,000
- Automated system: $750-3,450/month
- **Net savings: $11,500-14,250/month (76-95% reduction)**

---

## Next Steps

### Phase 1: Proof of Concept (Week 1-2)
- [ ] Get Planet API key and test Crop Biomass API
- [ ] Create test subscription for 1-2 sample fields
- [ ] Build backend API endpoint to query subscription data
- [ ] Update CRE workflow to use backend API
- [ ] Test full flow end-to-end on Base Sepolia

### Phase 2: Backend Integration (Week 3-4)
- [ ] Add subscription creation to policy activation flow
- [ ] Implement baseline calculation algorithm
- [ ] Set up GCS bucket for Planet data delivery
- [ ] Add subscription management (cancel when policy expires)

### Phase 3: Production Deployment (Week 5-6)
- [ ] Contact Planet Sales for production pricing
- [ ] Deploy to Base Mainnet
- [ ] Monitor first 30 days of automated assessments
- [ ] Tune damage calculation thresholds based on results

---

## Resources

### Planet Documentation
- [Crop Biomass Overview](https://university.planet.com/intro-to-crop-biomass/1749785/scorm/27m6c46uaxhww)
- [Subscriptions API Guide](https://developers.planet.com/docs/subscriptions/)
- [Python SDK Documentation](https://planet-sdk-for-python-v2.readthedocs.io/en/latest/)

### Example Notebooks
- [Crop Biomass Single Field](https://github.com/planetlabs/notebooks/blob/master/jupyter-notebooks/api_guides/subscriptions_api/crop_biomass/Crop_Biomass_Example.ipynb)
- [Crop Biomass Multiple Fields](https://github.com/planetlabs/notebooks/blob/master/jupyter-notebooks/api_guides/subscriptions_api/crop_biomass/Crop_Biomass_Example_Multiple_Fields.ipynb)
- [Phenometrics Analysis](https://github.com/planetlabs/notebooks/blob/master/jupyter-notebooks/use_cases/crop_phenometrics/CB_phenometrics.ipynb)

### MicroCrop Docs
- [CRE Architecture](../CRE_ARCHITECTURE.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Complete Checklist](../COMPLETE_CHECKLIST.md)

---

## Questions?

Contact:
- **Planet Sales**: [planet.com/contact-sales](https://www.planet.com/contact-sales/)
- **Planet Support**: [support.planet.com](https://support.planet.com)
- **MicroCrop Team**: [Your contact info]
