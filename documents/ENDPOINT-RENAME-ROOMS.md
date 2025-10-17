# Endpoint Rename: /room → /rooms

## Summary

Renamed all `/room/` endpoints to `/rooms/` for consistency with the folder structure (`src/rooms/`).

## Changes Made

### 1. Server Routes (`src/server.js`)

✅ Updated HTTP routing patterns:

- `/room/:roomName/:path` → `/rooms/:roomName/:path`
- Examples: `/rooms/radio/post`, `/rooms/chat/messages`

✅ Updated WebSocket URL patterns:

- `ws://server/room/radio` → `ws://server/rooms/radio` (preferred)
- Legacy patterns still supported: `ws://server/radio` or `?room=radio`

✅ Updated OPTIONS/CORS handlers for new path pattern

### 2. Bridge Endpoint (`src/postcontent/index.js`)

✅ Updated internal forwarding:

- Now forwards to `/rooms/radio/post` instead of `/room/radio/post`
- Error messages updated
- Documentation comments updated

### 3. Swagger Documentation (`src/swagger.js`)

✅ Updated API specification:

- `/room/radio/post` → `/rooms/radio/post`
- Updated deprecation notices for `/postcontent`

### 4. Test Scripts

✅ `src/utils/test-postcontent-bridge.js` - Updated
✅ `src/utils/test-generic-routes.js` - Updated all endpoints

### 5. Documentation Files

✅ `documents/PERMANENT-TOKENS.md` - All WebSocket and HTTP examples updated
✅ `documents/POSTCONTENT/README.md` - Migration path updated  
✅ `documents/ROUTING-CHANGE-MIGRATION.md` - All examples updated
✅ `documents/POSTMAN-TOKEN-GUIDE.md` - All examples updated
✅ `documents/ROUTES-REFACTORING.md` - All references updated

## Testing Results

### ✅ POST /postcontent (backward compatibility)

```
Status: 200 OK
Forwards to: /rooms/radio/post
Uses: Advertiser token internally
Result: Working perfectly ✅
```

### ✅ POST /rooms/radio/post (direct)

```
Status: 200 OK
Authentication: Bearer token required
Result: Working perfectly ✅
```

### ✅ WebSocket Connections

```
Preferred: ws://server/rooms/radio?token=xxx
Legacy: ws://server/radio?token=xxx (still works)
Query: ws://server/?room=radio&token=xxx (still works)
```

## API Examples

### HTTP POST

```bash
# New endpoint (consistent naming)
curl -X POST http://localhost:8080/rooms/radio/post \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"post","timestamp":"2025-10-17T00:00:00Z","data":{}}'
```

### WebSocket

```javascript
// Preferred: /rooms/ prefix matches folder structure
const ws = new WebSocket("ws://localhost:8080/rooms/radio?token=xxx");

// Legacy: Still supported for backward compatibility
const ws = new WebSocket("ws://localhost:8080/radio?token=xxx");
```

## Migration Guide

### For Existing Clients

**Option 1: Update to new endpoint (recommended)**

```javascript
// Old
fetch('http://server/room/radio/post', { ... })

// New
fetch('http://server/rooms/radio/post', { ... })
```

**Option 2: No changes needed**

- Legacy WebSocket patterns (`/radio`, `?room=radio`) still work
- The `/postcontent` bridge endpoint unchanged

### Swagger Documentation

Visit `/docs` to see updated API documentation with new `/rooms/` endpoints.

## Why This Change?

1. **Consistency:** Folder is `src/rooms/`, endpoint should be `/rooms/`
2. **Clarity:** Plural form better represents "collection of rooms"
3. **Standards:** RESTful convention uses plural resource names
4. **Backward Compatibility:** Legacy patterns still supported

## Backward Compatibility

✅ **WebSocket Legacy Patterns:**

- `ws://server/radio` - Still works
- `ws://server/?room=radio` - Still works
- `ws://server/rooms/radio` - New preferred method

✅ **HTTP POST:**

- `/postcontent` - Unchanged, still bridges to radio room
- Legacy HTTP clients don't need updates

## Files Changed

### Source Code

- `src/server.js` - Route patterns and WebSocket handling
- `src/postcontent/index.js` - Internal bridge path
- `src/swagger.js` - API specification

### Tests

- `src/utils/test-postcontent-bridge.js`
- `src/utils/test-generic-routes.js`

### Documentation (5 files)

- `documents/PERMANENT-TOKENS.md`
- `documents/POSTCONTENT/README.md`
- `documents/ROUTING-CHANGE-MIGRATION.md`
- `documents/POSTMAN-TOKEN-GUIDE.md`
- `documents/ROUTES-REFACTORING.md`

## Verification

Run tests to verify everything works:

```bash
# Test backward compatibility bridge
node src/utils/test-postcontent-bridge.js

# Test direct endpoints
node src/utils/test-generic-routes.js
```

Both tests should pass with ✅ SUCCESS messages.

---

**Date:** 2025-10-17  
**Impact:** Low (backward compatible)  
**Status:** Complete and tested ✅
