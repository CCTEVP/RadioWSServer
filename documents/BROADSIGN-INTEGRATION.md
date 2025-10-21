# Broadsign Integration Guide

## Overview

The Echo server supports Broadsign-specific metadata for radio room clients. This metadata can be included in authentication tokens and will be visible in the health endpoint for monitoring and debugging.

## Broadsign Metadata Fields

The following Broadsign-specific fields are supported:

- **`frameId`** - Broadsign frame identifier
- **`adCopyId`** - Advertisement copy identifier
- **`playerId`** - Media player identifier
- **`expectedSlotDurationMs`** - Expected slot duration in milliseconds

## Passing Broadsign Metadata

### Method 1: Dynamic Token with Metadata (Recommended)

**Each client generates their own token with custom Broadsign metadata:**

```javascript
// Each client provides their own unique Broadsign values
const response = await fetch("http://localhost:8080/auth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    clientId: "screen-lobby-01", // Unique per client
    room: "radio",
    metadata: {
      frameId: "frame-lobby-01", // Client's frame ID
      adCopyId: "winter-campaign-2025", // Client's ad copy
      playerId: "player-bsn-001", // Client's player ID
      expectedSlotDurationMs: "45000", // Client's slot duration
    },
  }),
});

const { token } = await response.json();
// Use this token to connect
```

**Response:**

```json
{
  "token": "eyJjbGllbnRJZCI6InNjcmVlbi1sb2JieS0wMSI...",
  "clientId": "screen-lobby-01",
  "room": "radio",
  "expiresAt": "2025-10-21T10:00:00.000Z"
}
```

### Method 2: Query Parameters (Alternative)

**Pass Broadsign metadata directly in WebSocket URL:**

```javascript
// Each client provides their values in the URL
const token = "your-token-here";
const frameId = "frame-lobby-01";
const adCopyId = "winter-campaign-2025";
const playerId = "player-bsn-001";
const expectedSlotDurationMs = "45000";

const ws = new WebSocket(
  `ws://localhost:8080?token=${token}&frameId=${frameId}&adCopyId=${adCopyId}&playerId=${playerId}&expectedSlotDurationMs=${expectedSlotDurationMs}`
);
```

**Note:** Query parameters override token metadata. This allows using a shared token with client-specific Broadsign values.

### Method 3: Hardcoded Tokens (Static Metadata)

For permanent tokens with fixed metadata (not recommended for dynamic values):

```javascript
// In src/auth/index.js
screen: {
  payload: {
    clientId: "screen",
    room: "radio",
    metadata: {
      role: "screen",
      frameId: "frame-123",  // Static value
      // ...
    }
  }
}
```

## WebSocket Connection Examples

### Example 1: Each Client with Unique Token

```javascript
// Client 1: Lobby screen
const token1 = await generateToken({
  clientId: "screen-lobby",
  metadata: {
    frameId: "frame-lobby-01",
    playerId: "player-001",
  },
});

const ws1 = new WebSocket(`ws://localhost:8080?token=${token1}`);

// Client 2: Entrance screen (different metadata)
const token2 = await generateToken({
  clientId: "screen-entrance",
  metadata: {
    frameId: "frame-entrance-01",
    playerId: "player-002",
  },
});

const ws2 = new WebSocket(`ws://localhost:8080?token=${token2}`);
```

### Example 2: Shared Token with Query Parameters

```javascript
// All clients share the same token
const sharedToken = "eyJjbGllbnRJZCI6InNjcmVlbiI...";

// But each provides their own Broadsign values
const ws1 = new WebSocket(
  `ws://localhost:8080?token=${sharedToken}&frameId=frame-lobby-01&playerId=player-001`
);

const ws2 = new WebSocket(
  `ws://localhost:8080?token=${sharedToken}&frameId=frame-entrance-01&playerId=player-002`
);
```

## Monitoring Broadsign Clients

### Health Endpoint

Check connected clients with Broadsign metadata:

```bash
curl "http://localhost:8080/health?detailed=true"
```

**Response includes Broadsign data:**

```json
{
  "status": "ok",
  "rooms": {
    "radio": {
      "clients": {
        "total": 1,
        "details": [
          {
            "id": "screen-001",
            "connected": "5m 32s",
            "joinedAt": "2025-10-21T09:00:00.000Z",
            "lastActivity": "2025-10-21T09:05:32.000Z",
            "messageCount": 15,
            "clientAddress": "192.168.1.100",
            "userAgent": "Mozilla/5.0...",
            "broadsign": {
              "frameId": "frame-123",
              "adCopyId": "ad-456",
              "playerId": "player-789",
              "expectedSlotDurationMs": "30000"
            }
          }
        ]
      }
    }
  }
}
```

### Filtering by Broadsign Metadata

You can parse the health endpoint response to filter clients by Broadsign properties:

```javascript
const response = await fetch("http://localhost:8080/health?detailed=true");
const health = await response.json();

// Find all clients with a specific frameId
const clients = health.rooms.radio.clients.details.filter(
  (client) => client.broadsign?.frameId === "frame-123"
);

console.log(`Found ${clients.length} clients with frameId: frame-123`);
```

## Use Cases

### 1. Player Monitoring

Track which Broadsign players are currently connected and receiving content:

```javascript
const players = health.rooms.radio.clients.details
  .filter((c) => c.broadsign?.playerId)
  .map((c) => ({
    playerId: c.broadsign.playerId,
    status: "online",
    lastSeen: c.lastActivity,
  }));
```

### 2. Frame Management

Identify all screens displaying content for a specific frame:

```javascript
const framesScreens = health.rooms.radio.clients.details.filter(
  (c) => c.broadsign?.frameId === "frame-abc"
);
```

### 3. Slot Duration Tracking

Monitor expected slot durations across connected screens:

```javascript
const slotDurations = health.rooms.radio.clients.details
  .filter((c) => c.broadsign?.expectedSlotDurationMs)
  .map((c) => ({
    clientId: c.id,
    duration: parseInt(c.broadsign.expectedSlotDurationMs),
  }));
```

### 4. Ad Copy Verification

Verify which clients are configured for specific ad copies:

```javascript
const adCopyClients = health.rooms.radio.clients.details.filter(
  (c) => c.broadsign?.adCopyId === "ad-summer-promo"
);
```

## Implementation Notes

### Metadata Storage

- Broadsign metadata is stored in `socket.radioMetadata.metadata`
- It persists for the lifetime of the WebSocket connection
- Metadata is lost when the client disconnects

### Optional Fields

- All Broadsign fields are optional
- The `broadsign` object only appears in health responses if at least one field is present
- Empty strings are acceptable values

### Performance

- Metadata storage has minimal memory overhead (~100 bytes per client)
- Health endpoint response size increases slightly with metadata
- No impact on broadcast performance

## Example: Full Integration

Here's a complete example of a Broadsign client connecting with metadata:

```javascript
// 1. Generate token with Broadsign metadata
const response = await fetch("http://localhost:8080/auth/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    clientId: "broadsign-player-01",
    room: "radio",
    metadata: {
      frameId: "frame-lobby-01",
      adCopyId: "winter-campaign-2025",
      playerId: "player-bsn-001",
      expectedSlotDurationMs: "45000",
    },
  }),
});

const { token } = await response.json();

// 2. Connect WebSocket
const ws = new WebSocket(`ws://localhost:8080?token=${token}`);

ws.onopen = () => {
  console.log("Broadsign player connected");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received content:", data);

  // Play content for expectedSlotDurationMs
  playContent(data, 45000);
};

// 3. Monitor connection in health endpoint
setInterval(async () => {
  const health = await fetch("http://localhost:8080/health?detailed=true").then(
    (r) => r.json()
  );

  const myClient = health.rooms.radio.clients.details.find(
    (c) => c.id === "broadsign-player-01"
  );

  if (myClient) {
    console.log("Player status:", {
      connected: myClient.connected,
      messagesReceived: myClient.messageCount,
      broadsign: myClient.broadsign,
    });
  }
}, 30000); // Check every 30 seconds
```

## Troubleshooting

### Broadsign Object Not Appearing

**Problem:** The `broadsign` object doesn't appear in health endpoint response.

**Causes:**

1. No Broadsign fields were included in token metadata
2. All Broadsign fields are empty strings and no values provided
3. Client hasn't connected yet

**Solution:** Ensure at least one Broadsign field has a value when generating the token.

### Metadata Lost After Reconnection

**Problem:** Broadsign metadata disappears after reconnection.

**Cause:** Metadata is stored in WebSocket connection, not persisted.

**Solution:** Include metadata in every new authentication token when reconnecting.

## Security Considerations

- Broadsign metadata is visible in health endpoint (requires authentication)
- Consider using player IDs instead of sensitive information
- Validate metadata values before using in production systems
- Monitor for unexpected or malicious metadata values

## Future Enhancements

Potential future features:

- Persistent storage of Broadsign metadata
- Historical tracking of player connections
- Alerting when players disconnect unexpectedly
- Metadata validation rules
- Custom metadata fields per client type
