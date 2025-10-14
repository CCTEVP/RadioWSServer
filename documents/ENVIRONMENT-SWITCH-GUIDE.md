# Environment Switch Quick Reference

## 🔄 Development ↔️ Production

### Code Changes Required: **NONE** ✅

The server automatically adapts based on environment variables!

---

## 🌍 Environment URLs

| Environment | HTTP | WebSocket |
|------------|------|-----------|
| **Development** | `http://localhost:8080` | `ws://localhost:8080` |
| **Production** | `https://radiowsserver-763503917257.europe-west1.run.app` | `wss://radiowsserver-763503917257.europe-west1.run.app` |

---

## ⚙️ Key Differences

| Setting | Development | Production |
|---------|-------------|------------|
| Protocol | HTTP/WS | HTTPS/WSS |
| AUTH_SECRET | From .env file | Cloud Run env var |
| NODE_ENV | `development` | `production` |
| Timeouts | Disabled (0) | Enabled |
| Debug Logs | Enabled | Disabled |
| CORS | Permissive | Restricted |

---

## 🔑 Environment Variables

### Set in Cloud Run (Production):

```
AUTH_SECRET=<your-production-secret>
NODE_ENV=production
PORT=8080
PUBLIC_BASE_URL=https://radiowsserver-763503917257.europe-west1.run.app
HEARTBEAT_INTERVAL_MS=30000
IDLE_TIMEOUT_MS=300000
MAX_CONN_AGE_MS=3600000
```

### Set in .env (Development):

Already configured in your `.env` file!

---

## 🚀 Quick Deploy

```bash
# Cloud Run automatically uses environment variables
# Just deploy - no code changes!
gcloud run deploy radiowsserver --region europe-west1
```

---

## 🧪 Test Both Environments

### Development:
```javascript
ws://localhost:8080/radio?token=YOUR_DEV_TOKEN
```

### Production:
```javascript
wss://radiowsserver-763503917257.europe-west1.run.app/radio?token=YOUR_PROD_TOKEN
```

---

## ⚠️ Important Notes

1. **Use different AUTH_SECRET** for dev and production
2. **Use different tokens** for dev and production  
3. **Protocol automatically switches** (WS→WSS, HTTP→HTTPS)
4. **No code changes needed** - everything is environment-driven!

---

## 📋 Deployment Checklist

- [ ] Set production AUTH_SECRET in Cloud Run
- [ ] Set NODE_ENV=production
- [ ] Deploy to Cloud Run
- [ ] Generate production tokens
- [ ] Update clients to use wss:// and https://
- [ ] Test!

---

## 💡 The server code automatically:

✅ Detects protocol (HTTP vs HTTPS)  
✅ Uses correct WebSocket protocol (WS vs WSS)  
✅ Reads environment variables  
✅ Applies production settings  
✅ Works in both environments without changes  

**You don't need to modify any `.js` files!** 🎉
