# Breaking Changes - Room & Route Renaming

## Summary

The default room and routes have been renamed for cleaner URLs:

| Old                                | New                  |
| ---------------------------------- | -------------------- |
| Room: `radioContent`               | Room: `radio`        |
| Route: `/radioContent/postcontent` | Route: `/radio/post` |

## What Changed

### 1. Room Name: `radioContent` → `radio`

**Old:**

```bash
# Token generation
{"clientId":"user123","room":"radioContent","expiresIn":86400000}

# WebSocket connection
ws://localhost:8080/radioContent?token=YOUR_TOKEN

# Room folder
src/rooms/radioContent/
```

**New:**

```bash
# Token generation
{"clientId":"user123","room":"radio","expiresIn":86400000}

# WebSocket connection
ws://localhost:8080/radio?token=YOUR_TOKEN

# Room folder
src/rooms/radio/
```

### 2. HTTP Route: `/postcontent` → `/post`

**Old:**

```bash
POST /radioContent/postcontent
```

**New:**

```bash
POST /radio/post
```

## Migration Guide

### For Token Generation

Update your token requests to use `"room":"radio"`:

**PowerShell:**

```powershell
Invoke-WebRequest -Uri http://localhost:8080/auth/token `
  -Method POST `
  -Body '{"clientId":"user123","room":"radio","expiresIn":86400000}' `
  -ContentType 'application/json'
```

**curl:**

```bash
curl -X POST http://localhost:8080/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"clientId":"user123","room":"radio","expiresIn":86400000}'
```

### For WebSocket Connections

Update your WebSocket URLs:

**Old:**

```javascript
const ws = new WebSocket("ws://localhost:8080/radioContent?token=YOUR_TOKEN");
```

**New:**

```javascript
const ws = new WebSocket("ws://localhost:8080/radio?token=YOUR_TOKEN");
```

### For HTTP POST Requests

Update your HTTP endpoint URLs:

**Old:**

```bash
curl -X POST http://localhost:8080/radioContent/postcontent \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"type":"test","timestamp":"2025-10-14T00:00:00Z","data":{}}'
```

**New:**

```bash
curl -X POST http://localhost:8080/radio/post \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"type":"test","timestamp":"2025-10-14T00:00:00Z","data":{}}'
```

## Quick Test

Test the new endpoints:

```powershell
# Generate token
$tokenResp = Invoke-WebRequest -Uri http://localhost:8080/auth/token `
  -Method POST `
  -Body '{"clientId":"testUser","room":"radio","expiresIn":3600000}' `
  -ContentType 'application/json'

$token = ($tokenResp.Content | ConvertFrom-Json).token

# Test POST endpoint
$body = @{
  type='test'
  timestamp=(Get-Date).ToUniversalTime().ToString('o')
  data=@{content=@{id='test123';message='Testing new endpoint'}}
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8080/radio/post `
  -Method POST `
  -Body $body `
  -ContentType 'application/json' `
  -Headers @{Authorization="Bearer $token"}
```

## Code Changes

### Room Handler Class

- `RadioContentHandler` → `RadioHandler`
- Located in: `src/rooms/radio/index.js`

### Room Registration

```javascript
// Old
this.registerHandler("radioContent", new RadioContentHandler());

// New
this.registerHandler("radio", new RadioHandler());
```

### Route Configuration

```javascript
// Old
{
  method: "POST",
  path: "/postcontent",
  requiresAuth: true,
  handler: handlePostContent,
}

// New
{
  method: "POST",
  path: "/post",
  requiresAuth: true,
  handler: handlePost,
}
```

## Benefits

1. **Cleaner URLs**: `/radio/post` instead of `/radioContent/postcontent`
2. **Shorter routes**: Easier to type and remember
3. **Modern convention**: Simpler REST-style endpoints
4. **Better scalability**: Clear pattern for future rooms

## Documentation Status

> ⚠️ **Note**: Documentation files still contain references to the old names.  
> Use this migration guide as the source of truth for the current implementation.

The following documents may have outdated examples:

- `AUTHENTICATION-GUIDE.md` (examples use old room name)
- `ROOM-HANDLER-GUIDE.md` (folder structure references)
- `ROOM-ARCHITECTURE-SUMMARY.md` (examples and diagrams)
- `QUICKSTART-ROOMS.md` (quick start examples)

When following these guides, substitute:

- `radioContent` → `radio`
- `/postcontent` → `/post`

## Verification

Server startup should show:

```
✓ Registered handler for room: radio
✓ Registered handler for room: chat
Registered 2 room handler(s): [ 'radio', 'chat' ]
Room handlers ready: radio, chat
```

## Support

If you encounter issues after migration:

1. Verify tokens are generated for room `"radio"`
2. Check WebSocket URL uses `/radio`
3. Confirm HTTP POST uses `/radio/post`
4. Ensure Authorization header is included
