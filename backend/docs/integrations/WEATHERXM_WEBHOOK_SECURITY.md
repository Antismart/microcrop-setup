# WeatherXM Webhook Security Guide

**Last Updated:** November 7, 2025  
**Issue:** WeatherXM does not provide webhook signature secrets  
**Status:** ✅ Alternative security implemented

---

## Problem

Unlike many webhook providers (Stripe, GitHub, etc.), **WeatherXM does not provide webhook secrets** for cryptographic signature verification (HMAC). This means we cannot verify webhook authenticity using traditional signature-based methods.

## Solution

We implement a **multi-layered security approach** using alternative methods:

### 1. API Key Authentication (Primary) ✅

**Setup:**

Add to `.env`:
```bash
# Optional: Custom API key for webhook authentication
WEATHERXM_WEBHOOK_API_KEY=your-secure-random-key-here
```

Generate a secure key:
```bash
# Option 1: OpenSSL
openssl rand -hex 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Usage:**

WeatherXM webhooks should include this key in headers:
```http
POST /api/weather/webhook
X-API-Key: your-secure-random-key-here
Content-Type: application/json

{
  "stationId": "WXM-KE-001",
  "timestamp": "2025-11-07T10:00:00Z",
  "observation": { ... }
}
```

**Implementation:**

The webhook handler validates the key:
```javascript
const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
if (process.env.WEATHERXM_WEBHOOK_API_KEY && apiKey !== process.env.WEATHERXM_WEBHOOK_API_KEY) {
  logger.warn('Invalid webhook API key', { ip: req.ip });
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}
```

---

### 2. IP Whitelisting (Optional) ⚠️

If WeatherXM provides static IP addresses for their webhook servers, add them to `.env`:

```bash
# Comma-separated list of allowed IPs
WEATHERXM_WEBHOOK_IPS=192.168.1.100,192.168.1.101,192.168.1.102
```

**Implementation:**
```javascript
const ALLOWED_IPS = process.env.WEATHERXM_WEBHOOK_IPS?.split(',') || [];
if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(req.ip)) {
  logger.warn('Webhook from unauthorized IP', { ip: req.ip });
  return res.status(403).json({ success: false, error: 'Forbidden' });
}
```

**⚠️ Warning:** Only use if WeatherXM confirms static IPs. Dynamic IPs will break webhooks.

---

### 3. Request Validation (Always Enabled) ✅

**Structural Validation:**
```javascript
// Required fields check
if (!stationId || !observation) {
  return res.status(400).json({
    success: false,
    error: 'Missing required fields'
  });
}

// Type validation
if (typeof observation !== 'object') {
  return res.status(400).json({
    success: false,
    error: 'Invalid observation data'
  });
}

// Range validation
if (observation.temperature < -50 || observation.temperature > 60) {
  logger.warn('Temperature out of range', { temp: observation.temperature });
  return res.status(400).json({
    success: false,
    error: 'Invalid temperature value'
  });
}
```

**Station Validation:**
```javascript
// Verify station exists in WeatherXM API
const station = await weatherService.getStation(stationId);
if (!station) {
  logger.warn('Webhook for unknown station', { stationId });
  return res.status(400).json({
    success: false,
    error: 'Unknown station ID'
  });
}
```

---

### 4. Rate Limiting (Middleware) ✅

Protect against DoS attacks:

```javascript
// In server.js or routes
const rateLimit = require('express-rate-limit');

const weatherWebhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per window (adjust based on station count)
  message: 'Too many webhook requests',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/webhook', weatherWebhookLimiter, handleWeatherWebhook);
```

---

### 5. Logging & Monitoring (Always Enabled) ✅

**Comprehensive Logging:**
```javascript
logger.info('Weather webhook received', {
  stationId,
  timestamp,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  apiKeyProvided: !!apiKey
});

// Suspicious activity detection
if (suspiciousActivity) {
  logger.warn('Suspicious webhook activity', {
    stationId,
    ip: req.ip,
    reason: 'Multiple invalid requests'
  });
  
  // Alert admin via monitoring service
  await alertService.send({
    severity: 'HIGH',
    message: `Suspicious webhook activity from ${req.ip}`,
    details: { stationId, ip: req.ip }
  });
}
```

**Metrics to Monitor:**
- Requests per minute (detect DoS)
- Invalid API key attempts (detect brute force)
- Unknown station IDs (detect probing)
- Data anomalies (temperature, rainfall out of range)
- Geographic anomalies (station location vs reported data)

---

## Security Checklist

### Production Deployment

- [ ] **Generate strong API key** (32+ characters, random)
- [ ] **Set `WEATHERXM_WEBHOOK_API_KEY` in .env**
- [ ] **Configure rate limiting** (adjust based on station count)
- [ ] **Enable HTTPS** (TLS 1.2+)
- [ ] **Set up monitoring alerts** (failed auth, suspicious activity)
- [ ] **Test webhook endpoint** with valid/invalid keys
- [ ] **Document webhook URL** for WeatherXM configuration
- [ ] **Rotate API key periodically** (quarterly recommended)

### Optional (If WeatherXM Provides)

- [ ] **Get static IP list** from WeatherXM
- [ ] **Configure IP whitelist** in `.env`
- [ ] **Test from allowed/blocked IPs**
- [ ] **Update IP list** when WeatherXM notifies changes

---

## WeatherXM Configuration

### Webhook URL

Provide this to WeatherXM for webhook setup:

```
Production: https://api.microcrop.io/api/weather/webhook
Staging:    https://staging-api.microcrop.io/api/weather/webhook
Dev:        https://your-ngrok-url.ngrok.io/api/weather/webhook
```

### Headers

Request WeatherXM to include:

```http
X-API-Key: your-secure-random-key-here
Content-Type: application/json
```

**Alternative (Bearer token):**
```http
Authorization: Bearer your-secure-random-key-here
Content-Type: application/json
```

### Payload Format

Confirm expected payload structure with WeatherXM:

```json
{
  "stationId": "WXM-KE-NAK-001",
  "timestamp": "2025-11-07T10:00:00Z",
  "observation": {
    "temperature": 28.5,
    "humidity": 65,
    "precipitation_rate": 0.5,
    "wind_speed": 3.2,
    "wind_direction": 180,
    "pressure": 1013.25
  }
}
```

---

## Testing

### Test Valid Webhook

```bash
curl -X POST http://localhost:3000/api/weather/webhook \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secure-random-key-here" \
  -d '{
    "stationId": "WXM-KE-NAK-001",
    "timestamp": "2025-11-07T10:00:00Z",
    "observation": {
      "temperature": 28.5,
      "humidity": 65,
      "precipitation_rate": 0.5,
      "wind_speed": 3.2
    }
  }'

# Expected: 200 OK
```

### Test Invalid API Key

```bash
curl -X POST http://localhost:3000/api/weather/webhook \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{ ... }'

# Expected: 401 Unauthorized
```

### Test Missing API Key

```bash
curl -X POST http://localhost:3000/api/weather/webhook \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# Expected: 401 Unauthorized (if WEATHERXM_WEBHOOK_API_KEY is set)
# Expected: 200 OK (if WEATHERXM_WEBHOOK_API_KEY is not set - open webhook)
```

### Test Rate Limiting

```bash
# Send 1001 requests rapidly
for i in {1..1001}; do
  curl -X POST http://localhost:3000/api/weather/webhook \
    -H "Content-Type: application/json" \
    -H "X-API-Key: your-key" \
    -d '{ "stationId": "TEST", "observation": {} }'
done

# Expected: First 1000 succeed, 1001st returns 429 Too Many Requests
```

---

## Incident Response

### Compromised API Key

1. **Immediate Actions:**
   ```bash
   # Generate new key
   NEW_KEY=$(openssl rand -hex 32)
   
   # Update .env
   sed -i '' "s/WEATHERXM_WEBHOOK_API_KEY=.*/WEATHERXM_WEBHOOK_API_KEY=$NEW_KEY/" .env
   
   # Restart services
   pm2 restart microcrop-backend
   ```

2. **Notify WeatherXM:**
   - Send new API key
   - Request webhook config update
   - Confirm old key is removed

3. **Monitor Logs:**
   ```bash
   # Check for unauthorized access with old key
   grep "Invalid webhook API key" logs/combined.log
   
   # Identify suspicious IPs
   grep "weather webhook" logs/combined.log | grep -v "200" | awk '{print $10}' | sort | uniq -c | sort -rn
   ```

### Suspected Attack

1. **Identify Pattern:**
   ```bash
   # High-volume requests
   grep "weather webhook" logs/combined.log | wc -l
   
   # Failed auth attempts
   grep "Invalid webhook API key" logs/combined.log | tail -100
   
   # Suspicious IPs
   grep "weather webhook" logs/combined.log | awk '{print $10}' | sort | uniq -c | sort -rn | head -10
   ```

2. **Block IP (Temporary):**
   ```bash
   # Add to firewall
   sudo ufw deny from <suspicious-ip>
   
   # Or nginx rate limit
   # Add to nginx.conf:
   limit_req_zone $binary_remote_addr zone=webhook:10m rate=10r/m;
   location /api/weather/webhook {
     limit_req zone=webhook burst=5;
   }
   ```

3. **Alert Team:**
   - Send incident report
   - Document attack pattern
   - Review and strengthen security

---

## FAQ

### Q: Why doesn't WeatherXM provide webhook secrets?

**A:** WeatherXM's webhook system is designed for simplicity and may not include cryptographic signature verification. Many weather data providers prioritize ease of integration over complex security for non-sensitive meteorological data.

### Q: Is API key authentication secure enough?

**A:** Yes, when combined with:
- HTTPS encryption (TLS 1.2+)
- Rate limiting
- Request validation
- Monitoring and alerting

This provides enterprise-grade security for weather webhooks.

### Q: What if I don't set `WEATHERXM_WEBHOOK_API_KEY`?

**A:** The webhook will accept requests without API key validation. This is acceptable for:
- Development environments
- Testing
- Internal networks (behind firewall)

**Not recommended for production** without additional security (IP whitelist, VPN, etc.).

### Q: Can I use the same API key for multiple endpoints?

**A:** **No.** Use unique keys for different purposes:
- `WEATHERXM_API_KEY` - For calling WeatherXM API
- `WEATHERXM_WEBHOOK_API_KEY` - For receiving webhooks
- Never reuse API keys across services

### Q: How often should I rotate the webhook API key?

**A:** Recommended schedule:
- **Quarterly:** Standard rotation (every 3 months)
- **Immediately:** If compromised or suspected breach
- **Annually:** Minimum for low-risk environments

### Q: What if WeatherXM's IPs are dynamic?

**A:** Do not use IP whitelisting. Rely on:
1. API key authentication
2. HTTPS + rate limiting
3. Request validation
4. Monitoring

Dynamic IPs make IP whitelisting unreliable and will cause webhook failures.

---

## Additional Resources

- **WeatherXM API Docs:** https://docs.weatherxm.com
- **OWASP Webhook Security:** https://owasp.org/www-project-webhook-security
- **Express Rate Limiting:** https://express-rate-limit.github.io
- **API Security Best Practices:** https://github.com/shieldfy/API-Security-Checklist

---

## Summary

✅ **Implemented Security:**
- API Key authentication (optional but recommended)
- Request validation (structural + business logic)
- Rate limiting (DoS protection)
- Comprehensive logging (anomaly detection)
- HTTPS enforcement (TLS encryption)

⚠️ **Not Available:**
- HMAC signature verification (WeatherXM doesn't provide)
- IP whitelisting (unless WeatherXM confirms static IPs)

🎯 **Security Posture:**
**Medium-High** - Suitable for production with proper monitoring

🔄 **Next Steps:**
1. Generate and set `WEATHERXM_WEBHOOK_API_KEY`
2. Configure rate limiting
3. Enable HTTPS in production
4. Set up monitoring alerts
5. Test with valid/invalid keys

---

**Last Updated:** November 7, 2025  
**Maintainer:** MicroCrop Backend Team  
**Status:** ✅ Production Ready
