# Legacy `/postcontent` Endpoint

## Purpose

This folder contains the backward compatibility endpoint `/postcontent` that forwards requests to the `/radio/post` endpoint without requiring authentication.

This exists for legacy clients that have not yet migrated to the new room-based routing system.

## Endpoint Details

- **URL:** `POST /postcontent`
- **Authentication:** None required (internal forwarding)
- **Target:** Forwards to radio room
- **Payload:** Same format as `/radio/post`:
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

New clients should use the standard room-based endpoint:

- **Old:** `POST /postcontent`
- **New:** `POST /room/radio/post` (with Bearer token authentication)

## How to Remove This Endpoint

When all clients have migrated to `/radio/post`, follow these steps:

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
// POST /postcontent - Legacy endpoint that forwards to /radio/post
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

- `/radio/post` still works with authentication
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
