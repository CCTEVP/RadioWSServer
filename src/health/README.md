# Health Check Module

## Overview

The health check module provides server monitoring and status endpoints for the Echo server. It reports server uptime, connected clients, and detailed room statistics.

## Endpoints

### `GET /health`

Returns basic health information.

**Response:**

```json
{
  "status": "ok",
  "uptime": 3600,
  "clients": 10,
  "rooms": {
    "radio": {
      "clients": 8,
      "hasCustomHandler": true
    },
    "chat": {
      "clients": 2,
      "hasCustomHandler": true
    }
  },
  "registeredHandlers": ["radio", "chat"]
}
```

### `GET /health?detailed=true`

Returns detailed health information including client details.

**Response:**

```json
{
  "status": "ok",
  "uptime": 3600,
  "clients": 10,
  "rooms": {
    "radio": {
      "clients": {
        "total": 8,
        "details": [
          {
            "id": "screen",
            "connected": "2m 45s",
            "joinedAt": "2025-10-17T08:00:00.000Z",
            "lastActivity": "2025-10-17T08:02:30.000Z",
            "messageCount": 5,
            "clientAddress": "192.168.1.100:54321",
            "userAgent": "Mozilla/5.0...",
            "broadsign": {
              "frameId": "frame-123",
              "adCopyId": "ad-456",
              "playerId": "player-789",
              "expectedSlotDurationMs": "30000"
            }
          }
        ]
      },
      "contentHistorySize": 10,
      "lastContent": "2025-10-17T08:02:36.157Z",
      "hasCustomHandler": true
    }
  },
  "registeredHandlers": ["radio", "chat"]
}
```

## Functions

### `generateHealthResponse(rooms, wss, detailed)`

Generates the health check response object.

**Parameters:**

- `rooms` (Map): Map of room names to Set of WebSocket clients
- `wss` (WebSocketServer): WebSocket server instance
- `detailed` (boolean): Whether to include detailed client information

**Returns:** Promise<Object> - Health response object

### `handleHealthRequest(req, res, rooms, wss)`

HTTP request handler for health endpoint.

**Parameters:**

- `req` (http.IncomingMessage): HTTP request
- `res` (http.ServerResponse): HTTP response
- `rooms` (Map): Map of room names to Set of WebSocket clients
- `wss` (WebSocketServer): WebSocket server instance

### `isHealthRequest(req)`

Check if a request is for the health endpoint.

**Parameters:**

- `req` (http.IncomingMessage): HTTP request

**Returns:** boolean - True if this is a health check request

## Usage

### In server.js:

```javascript
import { handleHealthRequest, isHealthRequest } from "./health/index.js";

const server = http.createServer(async (req, res) => {
  if (isHealthRequest(req)) {
    await handleHealthRequest(req, res, rooms, wss);
    return;
  }

  // Other routes...
});
```

## Monitoring

### Basic Health Check

Use for simple uptime monitoring:

```bash
curl http://localhost:8080/health
```

### Detailed Health Check

Use for debugging and detailed client information:

```bash
curl http://localhost:8080/health?detailed=true
```

Accepted truthy values: `true`, `1`, `yes`. Any other value (or missing parameter) keeps detailed mode disabled.

## Room Statistics

Each room handler can provide custom statistics via `getRoomStats()` method:

- **Radio Room**: Content history size, last content timestamp, Broadsign metadata
- **Chat Room**: Basic client count
- **Custom Rooms**: Any custom metrics

### Broadsign Metadata

For radio room clients, if Broadsign-specific metadata is provided during authentication, it will be included in the `broadsign` object:

- `frameId` - Broadsign frame identifier
- `adCopyId` - Advertisement copy identifier
- `playerId` - Media player identifier
- `expectedSlotDurationMs` - Expected slot duration in milliseconds

**Note:** The `broadsign` object only appears if at least one of these fields is present in the client's authentication token metadata.

## Error Handling

If an error occurs during health check generation:

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

Status Code: 500

## Use Cases

1. **Load Balancer Health Checks**: Cloud Run uses `/health` for instance health
2. **Monitoring Tools**: Prometheus, Datadog can scrape `/health`
3. **Debugging**: Use `?detailed=true` to see all connected clients
4. **Operations Dashboard**: Display real-time server status
