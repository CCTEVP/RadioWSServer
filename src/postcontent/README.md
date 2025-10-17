# Legacy `/postcontent` Endpoint

## Purpose

This folder contains the backward compatibility endpoint `/postcontent` that acts as a bridge to `/rooms/radio/post` using the hardcoded **advertiser token**.

This exists for legacy clients that have not yet migrated to the new room-based routing system with authentication.

## How It Works

1. Client sends POST request to `/postcontent` (no token required)
2. Server internally forwards to `/rooms/radio/post` with hardcoded advertiser token
3. Response from `/rooms/radio/post` is forwarded back to client

## Endpoint Details

- **URL:** `POST /postcontent`
- **Authentication:** None required from client (uses internal advertiser token)
- **Target:** Bridges to `/rooms/radio/post` with advertiser authentication
- **Token Used:** Hardcoded advertiser token (clientId: `advertiser`)
- **Payload:** Same format as `/rooms/radio/post`:
  ```json
  {
    "type": "string (required)",
    "timestamp": "ISO-8601 string (required)",
    "data": {
      // object (required)
    }
  }
  ```

## Migration Path

New clients should use the standard room-based endpoint directly:

- **Old:** `POST /postcontent` (no token, backward compatibility)
- **New:** `POST /rooms/radio/post` (with Bearer token authentication)

## How to Remove This Endpoint

When all clients have migrated to `/rooms/radio/post`, follow these steps:

### 1. Delete this folder

```powershell
Remove-Item -Path "e:\Development\Web\NODE\RadioWSServer\src\postcontent" -Recurse -Force
```

### 2. Remove the import from `src/server.js`

Delete these lines:

```javascript
import {
  handlePostContentRequest,
  handlePostContentOptions,
} from "./postcontent/index.js";
```

### 3. Remove the endpoint handlers from `src/server.js`

Delete this section (look for "BACKWARD COMPATIBILITY ENDPOINT" comments):

```javascript
// ============================================================================
// BACKWARD COMPATIBILITY ENDPOINT
// ============================================================================
// POST /postcontent - Legacy endpoint that forwards to /rooms/radio/post
// See src/postcontent/index.js for implementation
// Delete the entire /src/postcontent/ folder when no longer needed
if (req.method === "POST" && req.url === "/postcontent") {
  handlePostContentRequest(req, res, roomRegistry, broadcastToRoom);
  return;
}

// OPTIONS for /postcontent (CORS preflight)
if (req.method === "OPTIONS" && req.url === "/postcontent") {
  handlePostContentOptions(req, res);
  return;
}
// ============================================================================
// END BACKWARD COMPATIBILITY
// ============================================================================
```

### 4. Test the server

```powershell
npm start
```

Verify that:

- `/rooms/radio/post` still works with authentication
- No errors about missing modules
- Server starts successfully

## Monitoring Usage

To check if this endpoint is still being used, you can add logging:

In `src/postcontent/index.js`, add at the top of `handlePostContentRequest`:

```javascript
console.log(
  `⚠️  Legacy /postcontent endpoint used at ${new Date().toISOString()}`
);
```

Then monitor your logs to see if any requests are still coming to this endpoint.
