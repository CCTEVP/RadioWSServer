# Routing Architecture Change - Migration Guide

## 🔄 Breaking Change: Room-Based Routing Update

**Date:** October 14, 2025  
**Impact:** All HTTP endpoints for room operations

---

## What Changed?

The server routing architecture has been updated for better clarity and separation of concerns.

### Old Routing Pattern

```
/:roomName/:path
```

Examples:

- `/radio/post` → Radio room POST endpoint
- `/chat/messages` → Chat room messages endpoint

**Problem:** Single-level paths like `/health`, `/auth`, `/postcontent` were caught by the same regex and required a skip list.

### New Routing Pattern

```
/room/:roomName/:path
```

Examples:

- `/room/radio/post` → Radio room POST endpoint
- `/room/chat/messages` → Chat room messages endpoint

**Benefit:** Clear separation between special endpoints and room-based routing. The `/room/` prefix makes it explicit.

---

## Migration Steps

### 1. Update HTTP POST Requests

#### Before (❌ Old):

```bash
POST /radio/post
Authorization: Bearer <token>
```

#### After (✅ New):

```bash
POST /room/radio/post
Authorization: Bearer <token>
```

### 2. Update Client Code

#### JavaScript/Node.js:

```javascript
// OLD
const response = await fetch("http://localhost:8080/radio/post", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

// NEW
const response = await fetch("http://localhost:8080/room/radio/post", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
```

#### PowerShell:

```powershell
# OLD
Invoke-WebRequest -Uri http://localhost:8080/radio/post `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -Body ($payload | ConvertTo-Json)

# NEW
Invoke-WebRequest -Uri http://localhost:8080/room/radio/post `
  -Method POST `
  -Headers @{ "Authorization" = "Bearer $token" } `
  -Body ($payload | ConvertTo-Json)
```

#### cURL:

```bash
# OLD
curl -X POST http://localhost:8080/radio/post \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @payload.json

# NEW
curl -X POST http://localhost:8080/room/radio/post \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

### 3. Update Postman Collections

1. Open your Postman collection
2. Find all requests to `/:room/post` or `/:room/*`
3. Update URL to `/room/:room/post` or `/room/:room/*`
4. Save the collection

Example:

- Old: `{{baseUrl}}/radio/post`
- New: `{{baseUrl}}/room/radio/post`

### 4. Update Environment Variables

If you have base URLs stored in environment variables or config files:

```javascript
// OLD
const RADIO_POST_URL = "http://localhost:8080/radio/post";

// NEW
const RADIO_POST_URL = "http://localhost:8080/room/radio/post";
```

---

## Backward Compatibility

### Legacy `/postcontent` Endpoint

The `/postcontent` endpoint remains **unchanged** and does NOT require the `/room/` prefix.

```bash
POST /postcontent  # Still works (no authentication required)
```

This is intentional for backward compatibility with legacy clients. When all clients migrate to `/room/radio/post`, the `/postcontent` endpoint can be removed.

**Migration path for legacy clients:**

- **Current:** `/postcontent` (no auth) → works
- **Recommended:** `/room/radio/post` (with auth) → use this for new implementations
- **Future:** `/postcontent` will be deprecated once all clients migrate

---

## Unchanged Endpoints

These endpoints remain the same (single-level paths):

✅ `/health` - Health check  
✅ `/auth/token` - Token generation  
✅ `/postcontent` - Legacy backward compatibility (no `/room/` prefix)

---

## Room-Based Endpoints

All room-based endpoints now require the `/room/` prefix:

| Room   | Old URL            | New URL                 |
| ------ | ------------------ | ----------------------- |
| Radio  | `/radio/post`      | `/room/radio/post`      |
| Chat   | `/chat/messages`   | `/room/chat/messages`   |
| Custom | `/:roomName/:path` | `/room/:roomName/:path` |

---

## Testing the Changes

### Test Script Updated

The test scripts have been updated to use the new routing:

```bash
# Test the new /room/radio/post endpoint (requires authentication)
node test-post-endpoint.js

# Test the legacy /postcontent endpoint (no authentication)
node test-postcontent-endpoint.js
```

### Manual Testing with cURL

```bash
# 1. Generate a token
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"clientId":"test-client","room":"radio"}'

# 2. Test the new endpoint
curl -X POST http://localhost:8080/room/radio/post \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "post",
    "timestamp": "2025-10-14T15:00:00.000Z",
    "data": {
      "content": {"id": "123", "name": "Test Content"},
      "advertiser": {"id": "456", "name": "Test Advertiser"}
    }
  }'
```

---

## Production Deployment

### Environment Variables

Update your production environment variables if you have hardcoded URLs:

```bash
# OLD
RADIO_POST_ENDPOINT=https://your-server.com/radio/post

# NEW
RADIO_POST_ENDPOINT=https://your-server.com/room/radio/post
```

### Cloud Run / Docker

No changes needed to deployment configuration. The routing change is internal to the application.

---

## Rollback Plan

If you need to rollback, the change is in `src/server.js`:

```javascript
// NEW (current)
const roomRouteMatch = req.url.match(/^\/room\/([^\/]+)(\/[^\/]+.*)$/);

// OLD (rollback)
const roomRouteMatch = req.url.match(/^\/([^\/]+)(\/.*)?$/);
// Plus re-add the skip list: if (["health", "auth", "postcontent"].includes(roomName))
```

---

## Support

If you encounter issues during migration:

1. Check that you've updated all endpoints to include `/room/` prefix
2. Verify your authentication tokens are valid
3. Review server logs for error messages
4. Test with the provided test scripts first

---

## Summary Checklist

- [ ] Updated all HTTP client code to use `/room/:roomName/:path`
- [ ] Updated Postman collections
- [ ] Updated environment variables and config files
- [ ] Tested with `test-post-endpoint.js`
- [ ] Updated production deployment scripts
- [ ] Documented the change for your team
- [ ] Scheduled legacy `/postcontent` deprecation (optional)

---

**Note:** The `/postcontent` endpoint continues to work without the `/room/` prefix for backward compatibility. Plan to migrate legacy clients to `/room/radio/post` and eventually remove `/postcontent`.
