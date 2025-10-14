# Production Deployment Guide

## 🚀 Deploying to Google Cloud Run

Your production URL: `https://radiowsserver-763503917257.europe-west1.run.app`

## ✅ What's Already Configured

The server code **automatically adapts** to the environment! No code changes needed.

### Environment-Aware Features:

1. **PUBLIC_BASE_URL**: Defaults to production URL if not set
2. **PORT**: Uses Cloud Run's assigned port (via `process.env.PORT`)
3. **WebSocket Protocol**: Automatically uses WSS (secure) with HTTPS
4. **CORS**: Configured for production use
5. **Authentication**: Uses environment variables for secrets

---

## 📋 Pre-Deployment Checklist

### 1. Set Production AUTH_SECRET

**⚠️ CRITICAL:** Use a different AUTH_SECRET for production!

```powershell
# Generate a new production secret
.\setup-auth-secret.ps1

# Save it securely - you'll need it for Cloud Run
```

**Copy the generated secret for the next step.**

### 2. Configure Cloud Run Environment Variables

Set these in Cloud Run console or via `gcloud` CLI:

```bash
# Required
AUTH_SECRET=your-production-secret-here
NODE_ENV=production
PORT=8080

# Optional (with good defaults)
PUBLIC_BASE_URL=https://radiowsserver-763503917257.europe-west1.run.app
HEARTBEAT_INTERVAL_MS=30000
IDLE_TIMEOUT_MS=300000
MAX_CONN_AGE_MS=3600000
POST_CONTENT_MAX_BYTES=262144
```

### 3. Generate Production Tokens

After setting production AUTH_SECRET in Cloud Run:

```powershell
# Connect to production and generate tokens
curl -X POST https://radiowsserver-763503917257.europe-west1.run.app/auth/token `
  -H "Content-Type: application/json" `
  -d '{"clientId":"production-admin","room":"radio","expiresIn":3153600000000}'
```

Save these tokens securely!

---

## 🔐 Security Configuration

### Required Environment Variables (Cloud Run):

| Variable | Value | Description |
|----------|-------|-------------|
| `AUTH_SECRET` | `<secure-random-string>` | **REQUIRED** - Token signing key |
| `NODE_ENV` | `production` | Enable production mode |
| `PORT` | `8080` | Cloud Run assigns this |

### Recommended Environment Variables:

| Variable | Development | Production |
|----------|------------|------------|
| `IDLE_TIMEOUT_MS` | `0` (disabled) | `300000` (5 min) |
| `MAX_CONN_AGE_MS` | `0` (disabled) | `3600000` (1 hour) |
| `LOG_LEVEL` | `debug` | `warn` or `error` |
| `DEBUG` | `true` | `false` |

---

## 🌐 Client Connection Updates

### Development (Local):
```javascript
const ws = new WebSocket("ws://localhost:8080/radio?token=YOUR_TOKEN");
```

### Production:
```javascript
const ws = new WebSocket("wss://radiowsserver-763503917257.europe-west1.run.app/radio?token=YOUR_TOKEN");
```

**Note the protocol change:** `ws://` → `wss://` (secure WebSocket)

### HTTP Endpoint:

**Development:**
```
POST http://localhost:8080/radio/post
```

**Production:**
```
POST https://radiowsserver-763503917257.europe-west1.run.app/radio/post
```

**Note the protocol change:** `http://` → `https://`

---

## 📦 Deployment Methods

### Method 1: Cloud Run Console (Easiest)

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Find your service: `radiowsserver`
3. Click **Edit & Deploy New Revision**
4. Set environment variables:
   - Click **Variables & Secrets**
   - Add `AUTH_SECRET`, `NODE_ENV`, etc.
5. Deploy!

### Method 2: gcloud CLI

```bash
# Deploy with environment variables
gcloud run deploy radiowsserver \
  --image gcr.io/YOUR_PROJECT/radiowsserver \
  --platform managed \
  --region europe-west1 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "AUTH_SECRET=your-production-secret" \
  --set-env-vars "PORT=8080" \
  --set-env-vars "PUBLIC_BASE_URL=https://radiowsserver-763503917257.europe-west1.run.app" \
  --allow-unauthenticated
```

### Method 3: Using .env.production

If your deployment process supports it:

```bash
# Load production config
cp .env.production .env

# Build and deploy
docker build -t radiowsserver .
gcloud run deploy radiowsserver --image radiowsserver
```

---

## 🧪 Testing Production Deployment

### 1. Health Check

```powershell
Invoke-RestMethod -Uri "https://radiowsserver-763503917257.europe-west1.run.app/health"
```

**Expected response:**
```json
{
  "status": "ok",
  "uptime": 123.45,
  "clients": 0,
  "rooms": {...}
}
```

### 2. Generate Token

```powershell
$body = @{
    clientId = "test-prod"
    room = "radio"
    expiresIn = 3600000
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "https://radiowsserver-763503917257.europe-west1.run.app/auth/token" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

Write-Host "Token: $($response.token)"
```

### 3. WebSocket Connection Test

Create a test HTML file:

```html
<!DOCTYPE html>
<html>
<head><title>Production Test</title></head>
<body>
  <h1>Production WebSocket Test</h1>
  <div id="status">Connecting...</div>
  <div id="messages"></div>
  
  <script>
    const token = "YOUR_PRODUCTION_TOKEN_HERE";
    const ws = new WebSocket(
      `wss://radiowsserver-763503917257.europe-west1.run.app/radio?token=${token}`
    );
    
    ws.onopen = () => {
      document.getElementById('status').textContent = 'Connected!';
      console.log('✅ Connected to production!');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      document.getElementById('messages').innerHTML += 
        `<p>${JSON.stringify(data)}</p>`;
    };
    
    ws.onerror = (error) => {
      document.getElementById('status').textContent = 'Error!';
      console.error('❌ Error:', error);
    };
  </script>
</body>
</html>
```

### 4. HTTP POST Test

```powershell
$token = "YOUR_PRODUCTION_TOKEN_HERE"
$body = @{
    type = "post"
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    data = @{
        content = @{ id = "123"; name = "Test" }
        advertiser = @{ id = "456"; name = "Test Advertiser" }
    }
} | ConvertTo-Json -Depth 10

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod `
    -Uri "https://radiowsserver-763503917257.europe-west1.run.app/radio/post" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

---

## 🔄 Environment Switching

### Running Production Config Locally (for testing):

```powershell
# Copy production config
Copy-Item .env.production .env

# Or set environment
$env:NODE_ENV = "production"
$env:PUBLIC_BASE_URL = "https://radiowsserver-763503917257.europe-west1.run.app"

npm start
```

### Back to Development:

```powershell
# Restore development config
git checkout .env

# Or
$env:NODE_ENV = "development"
npm start
```

---

## 🚨 Common Issues & Solutions

### Issue: "AUTH_SECRET not set" in production

**Cause:** Environment variable not configured in Cloud Run

**Fix:**
1. Go to Cloud Run console
2. Edit service
3. Add `AUTH_SECRET` environment variable
4. Redeploy

### Issue: WebSocket connection fails

**Cause:** Using `ws://` instead of `wss://`

**Fix:** Change protocol to `wss://` for production

### Issue: Tokens invalid after deployment

**Cause:** Different AUTH_SECRET between environments

**Fix:**
- Use same AUTH_SECRET across restarts
- Or regenerate tokens with production AUTH_SECRET

### Issue: CORS errors

**Cause:** Client origin not allowed

**Fix:** Add to Cloud Run environment variables:
```
ORIGIN_ALLOWLIST=https://your-client-domain.com
```

---

## 📊 Monitoring Production

### View Logs (Cloud Run Console):

1. Go to Cloud Run service
2. Click **Logs** tab
3. Filter by severity

### View Logs (gcloud CLI):

```bash
# Real-time logs
gcloud logging tail --resource-type=cloud_run_revision \
  --filter="resource.labels.service_name=radiowsserver"

# Last 100 entries
gcloud logging read --limit 100 \
  "resource.type=cloud_run_revision AND resource.labels.service_name=radiowsserver"
```

### Key Metrics to Monitor:

- **Active WebSocket connections**: Check `/health` endpoint
- **Request latency**: Cloud Run metrics
- **Error rate**: Log errors
- **Memory usage**: Cloud Run metrics
- **CPU usage**: Cloud Run metrics

---

## 🔒 Production Security Checklist

- [ ] ✅ Set strong AUTH_SECRET (32+ characters, random)
- [ ] ✅ Use `NODE_ENV=production`
- [ ] ✅ Enable HTTPS only (automatic with Cloud Run)
- [ ] ✅ Set connection timeouts (`IDLE_TIMEOUT_MS`, `MAX_CONN_AGE_MS`)
- [ ] ✅ Use different tokens for dev/prod
- [ ] ✅ Don't commit `.env` to git
- [ ] ✅ Rotate AUTH_SECRET periodically (90 days)
- [ ] ✅ Monitor for suspicious activity
- [ ] ✅ Set up alerts for errors
- [ ] ✅ Limit POST payload size

---

## 📝 Deployment Commands Summary

```bash
# 1. Set environment variables in Cloud Run console or:
gcloud run services update radiowsserver \
  --region europe-west1 \
  --set-env-vars "AUTH_SECRET=your-secret,NODE_ENV=production"

# 2. Deploy new revision
gcloud run deploy radiowsserver \
  --region europe-west1 \
  --image gcr.io/YOUR_PROJECT/radiowsserver

# 3. Test deployment
curl https://radiowsserver-763503917257.europe-west1.run.app/health

# 4. Generate production token
curl -X POST https://radiowsserver-763503917257.europe-west1.run.app/auth/token \
  -H "Content-Type: application/json" \
  -d '{"clientId":"admin","room":"radio","expiresIn":3153600000000}'
```

---

## 🎯 Quick Start Checklist

- [ ] 1. Generate production AUTH_SECRET
- [ ] 2. Set AUTH_SECRET in Cloud Run
- [ ] 3. Set NODE_ENV=production
- [ ] 4. Deploy to Cloud Run
- [ ] 5. Test /health endpoint
- [ ] 6. Generate production tokens
- [ ] 7. Update client code to use `wss://` and `https://`
- [ ] 8. Test WebSocket connection
- [ ] 9. Test HTTP POST
- [ ] 10. Monitor logs for errors

---

## 📚 Related Documentation

- `ENV-CONFIGURATION-GUIDE.md` - Environment variables
- `PERSISTENT-TOKENS-GUIDE.md` - Token management
- `TOKEN-STORAGE-EXPLAINED.md` - How authentication works
