# WebSocket Broadcast & HTTP Injection Server

A lightweight, **modular** Node.js WebSocket broadcast server with **room-based routing** and **custom room handlers**. Each room can have its own folder with specific functionality while inheriting base capabilities from the server. Designed for deployment on Google Cloud Run (or any container platform) with long‑lived connections supported via heartbeat (ping/pong) and optional connection policies.

---

## 🔐 **IMPORTANT: Authentication Required**

**All connections now require authentication.** This server uses HMAC-SHA256 token-based authentication to verify client identity.

### Quick Start with Authentication:

1. **Start the server**:

   ```bash
   npm start
   ```

2. **Generate a token** (using Postman, curl, or any HTTP client):

   ```bash
   # PowerShell
   Invoke-WebRequest -Uri http://localhost:8080/auth/token -Method POST -Body '{"clientId":"user123","room":"radio","expiresIn":86400000}' -ContentType 'application/json'

   # curl
   curl -X POST http://localhost:8080/auth/token \
     -H 'Content-Type: application/json' \
     -d '{"clientId":"user123","room":"radio","expiresIn":86400000}'
   ```

3. **Connect with your token**:
   - **WebSocket**: `ws://localhost:8080/roomName?token=YOUR_TOKEN`
   - **HTTP POST**: Include `Authorization: Bearer YOUR_TOKEN` header

📖 **See [AUTHENTICATION-GUIDE.md](AUTHENTICATION-GUIDE.md) for complete documentation**

---

## 🌟 Key Features

### Room-Based Architecture

- **Room-based routing**: Clients connect to specific rooms; messages are only shared within the same room.
- **Modular room handlers**: Each room has its own folder (`src/rooms/roomName/`) with custom logic.
- **Auto-discovery**: Just create a room folder with `index.js` - the server finds it automatically.
- **Inheritance model**: All rooms extend `BaseRoomHandler` and override only what they need.
- **Default room**: `radioContent` - maintains backward compatibility with existing applications.

### Communication

- **WebSocket broadcasting**: JSON messages from a WebSocket client are forwarded (with metadata) to all other clients in the same room.
- **HTTP push endpoint**: `POST /:room/postcontent` accepts validated JSON and broadcasts it to every WebSocket client in the specified room. Each room defines its own HTTP routes in `src/rooms/:room/routes.js`.
- **Custom message processing**: Each room can validate, transform, and enrich messages.

### Management & Monitoring

- **Health endpoint**: `GET /health` returns status, uptime, client count, room statistics, and registered handlers.
- **Heartbeat keepalive**: periodic ping to detect stale/dead connections (configurable via env var).
- **Optional per-connection policies**: idle timeout and max connection age (disabled by default).
- **Graceful shutdown**: sends close code `4002` on SIGTERM (Cloud Run lifecycle friendly).

### Security & Control

- **🔐 Token-based authentication**: HMAC-SHA256 signed tokens required for all connections.
- **Per-room verification**: Each room can implement custom authentication logic.
- **Client identity**: Secure client recognition via cryptographically signed tokens.
- **Origin allowlist**: restrict WebSocket connections via `ORIGIN_ALLOWLIST`.
- **Payload size limits**: independent limits for WebSocket frames and HTTP POST body.
- **No default room**: All clients must explicitly connect to a specific room with valid credentials.

### Cloud-Ready

- **Cloud Run friendly logging** & env-based URL configuration (`PUBLIC_BASE_URL`).
- **Scalable architecture**: Easy to add new rooms without touching existing code.

---

## 📁 Project Structure

```
src/
├── server.js                          # Main server (delegates to room handlers)
├── rooms/
    ├── BaseRoomHandler.js             # Abstract base class for all rooms
    ├── index.js                       # Room registry (auto-discovers handlers)
    ├── radioContent/
    │   └── index.js                   # Radio content room handler
    └── chat/
        └── index.js                   # Example chat room handler
```

**Want to add a new room?** Just create `src/rooms/yourRoom/index.js` - that's it! See [QUICK-REFERENCE.md](QUICK-REFERENCE.md) for a 3-step guide.

---

## 📚 Documentation

| Document                                                         | Description                                 |
| ---------------------------------------------------------------- | ------------------------------------------- |
| **[🔐 AUTHENTICATION-GUIDE.md](AUTHENTICATION-GUIDE.md)**        | **Authentication setup and security guide** |
| **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)**                     | Quick start guide for creating rooms        |
| **[ROOM-HANDLER-GUIDE.md](ROOM-HANDLER-GUIDE.md)**               | Complete API reference and examples         |
| **[ROOM-ARCHITECTURE-SUMMARY.md](ROOM-ARCHITECTURE-SUMMARY.md)** | Architecture overview and benefits          |
| **[ARCHITECTURE-DIAGRAM.md](ARCHITECTURE-DIAGRAM.md)**           | Visual diagrams of the architecture         |
| **[QUICKSTART-ROOMS.md](QUICKSTART-ROOMS.md)**                   | Basic room usage examples                   |

---

## 🚀 Quick Start: Create a New Room

Creating a new room is as simple as creating a folder:

```bash
# 1. Create room folder
mkdir src/rooms/myRoom

# 2. Create handler file (src/rooms/myRoom/index.js)
cat > src/rooms/myRoom/index.js << 'EOF'
import { BaseRoomHandler } from '../BaseRoomHandler.js';

export class MyRoomHandler extends BaseRoomHandler {
  constructor() {
    super('myRoom');
  }

  async onMessage(payload, socket, clientAddress) {
    // Add your custom logic here
    return payload; // or return modified payload
  }
}
EOF

# 3. Restart server
npm start
```

**That's it!** Your room is now available at `ws://localhost:8080/myRoom`

See **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** for more details.

---

## Requirements

- Node.js 18+ (Node 20 LTS recommended)

---

## Installation

```bash
npm install
```

---

## Running

Production style:

```bash
npm start
```

Development (auto-restart):

```bash
npm run dev
```

Default port: `8080` (override with `PORT`).

PowerShell example:

```powershell
$env:HEARTBEAT_INTERVAL_MS=30000; $env:PUBLIC_BASE_URL='http://localhost:8080'; npm start
```

---

## Environment Variables

| Variable                 | Purpose                                                     | Default                |
| ------------------------ | ----------------------------------------------------------- | ---------------------- |
| `PORT`                   | Internal HTTP/WebSocket port                                | `8080`                 |
| `PUBLIC_BASE_URL`        | Public base URL (for logging hints)                         | Cloud Run URL fallback |
| `HEARTBEAT_INTERVAL_MS`  | Interval for pinging clients (0 disables)                   | `30000`                |
| `IDLE_TIMEOUT_MS`        | Close connection if no activity (0 disables)                | `0`                    |
| `MAX_CONN_AGE_MS`        | Force-close after max lifetime (0 disables)                 | `0`                    |
| `ORIGIN_ALLOWLIST`       | Comma-separated list of allowed origins (empty = allow all) | (empty)                |
| `MAX_PAYLOAD_BYTES`      | Max WebSocket message payload (bytes)                       | `1048576`              |
| `POST_CONTENT_MAX_BYTES` | Max `/postcontent` body size (bytes)                        | `262144`               |

---

## Room-Based Architecture

Clients can connect to different **rooms** to isolate message broadcasting. Only clients in the same room will receive each other's messages.

### Connecting to Rooms

**WebSocket Connections:**

Clients can specify the room in two ways:

1. **Via URL path**: `ws://server/roomName`

   ```javascript
   const ws = new WebSocket("ws://localhost:8080/myRoom");
   ```

2. **Via query parameter**: `ws://server?room=roomName`

   ```javascript
   const ws = new WebSocket("ws://localhost:8080?room=myRoom");
   ```

3. **Default room**: If no room is specified, clients join `radioContent`
   ```javascript
   const ws = new WebSocket("ws://localhost:8080"); // joins "radioContent"
   ```

**HTTP POST Endpoint:**

- `POST /:roomName/postcontent` - Broadcast to specific room (room-specific routes)

### Room Management

- Rooms are created automatically when the first client joins
- Empty rooms are automatically cleaned up when the last client leaves
- Each client can only be in one room at a time
- Room information is included in the health endpoint

---

## HTTP API

### `GET /health`

Returns JSON with room statistics:

```json
{
  "status": "ok",
  "uptime": 12.34,
  "clients": 8,
  "rooms": {
    "radioContent": 5,
    "myRoom": 2,
    "anotherRoom": 1
  }
}
```

### `POST /:room/postcontent`

Broadcast to a specific room. Each room can have its own HTTP routes defined in `src/rooms/:room/routes.js`.

**Examples:**

- `POST /radioContent/postcontent` - Broadcasts to `radioContent`
- `POST /chat/postcontent` - Broadcasts to `chat` (if that room supports this route)
- `POST /myRoom/postcontent` - Broadcasts to `myRoom`

Body (required fields: `type`, `timestamp`, `data`):

```json
{
  "type": "ping",
  "timestamp": "2025-10-02T00:00:00Z",
  "data": {
    "content": { "id": 6564, "name": "Florida" },
    "advertiser": { "id": 3, "name": "Mc Donalds" }
  }
}
```

Validation rules:

- `type`: string
- `timestamp`: ISO-8601 parseable string
- `data`: non-null JSON object (not array)

Success response:

```json
{
  "status": "ok",
  "room": "radioContent",
  "delivered": 5,
  "echo": {
    "type": "ping",
    "timestamp": "2025-10-02T00:00:00Z",
    "data": {
      "content": { "id": 6564, "name": "Florida" },
      "advertiser": { "id": 3, "name": "Mc Donalds" }
    },
    "serverReceivedAt": "2025-10-02T12:34:56.789Z"
  }
}
```

Errors:
| HTTP | Reason |
|------|--------|
| 400 | Invalid JSON |
| 413 | Payload too large |
| 422 | Validation failed |

---

## WebSocket Message Flow

### Client -> Server (example)

```json
{ "type": "chat", "text": "Hello" }
```

### Broadcast (originating from a WebSocket client)

```json
{
  "type": "broadcast",
  "from": "203.0.113.5:54321",
  "receivedAt": 1710000000000,
  "data": { "type": "chat", "text": "Hello" }
}
```

### Broadcast (originating from `/postcontent`)

```json
{
  "type": "ping",
  "timestamp": "2025-10-02T00:00:00Z",
  "data": {
    "content": { "id": 6564, "name": "Florida" },
    "advertiser": { "id": 3, "name": "Mc Donalds" }
  },
  "serverReceivedAt": "2025-10-02T12:34:56.789Z"
}
```

### Welcome Message

```json
{
  "type": "welcome",
  "message": "Connected to broadcast server",
  "room": "radioContent",
  "time": 1710000000000
}
```

### Error Message

```json
{ "type": "error", "error": "Invalid JSON payload" }
```

---

## Testing

### Using wscat

**Testing the default room (radioContent):**

```bash
npm install -g wscat
wscat -c ws://localhost:8080
```

Open another terminal:

```bash
wscat -c ws://localhost:8080
```

Send JSON in one; observe broadcast in the other.

**Testing different rooms:**

Terminal 1 (room: myRoom):

```bash
wscat -c ws://localhost:8080/myRoom
```

Terminal 2 (room: myRoom):

```bash
wscat -c ws://localhost:8080/myRoom
```

Terminal 3 (room: anotherRoom):

```bash
wscat -c ws://localhost:8080/anotherRoom
```

Messages sent in terminals 1 and 2 will only be visible to each other. Terminal 3 won't see them.

### Using curl for HTTP POST

**Post to radioContent room:**

```bash
curl -X POST http://localhost:8080/radioContent/postcontent \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d '{"type":"ping","timestamp":"2025-10-02T00:00:00Z","data":{"msg":"hello"}}'
```

**Post to a custom room (if it supports the route):**

```bash
curl -X POST http://localhost:8080/myRoom/postcontent \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -d '{"type":"update","timestamp":"2025-10-02T00:00:00Z","data":{"status":"active"}}'
```

---

## Use Cases for Multiple Rooms

The room-based architecture allows you to use one server for multiple applications:

### Example 1: Radio Content (radioContent)

- Clients connect to `ws://server/radioContent` or just `ws://server`
- Receives live radio content updates, ad campaigns, etc.

### Example 2: Chat Application (chat)

- Clients connect to `ws://server/chat`
- Real-time messaging between users

### Example 3: Dashboard Updates (dashboard)

- Clients connect to `ws://server/dashboard`
- Live metrics, analytics, or monitoring data

### Example 4: Game Lobby (game-lobby)

- Clients connect to `ws://server/game-lobby`
- Player connections, game state updates

Each room is completely isolated, so messages in one room never leak to another room.

---

## Heartbeat & Connection Management

- Heartbeat pings every `HEARTBEAT_INTERVAL_MS`; missing a pong => termination.
- Idle timeout (`IDLE_TIMEOUT_MS`) and max age (`MAX_CONN_AGE_MS`) are opt-in.
- Graceful shutdown sends close code `4002` before exit.

Custom close codes:
| Code | Meaning |
|------|---------|
| 4000 | Idle timeout |
| 4001 | Max connection age reached |
| 4002 | Server shutting down |
| 4003 | Origin not allowed |

---

## Security / Hardening Ideas

- API key or bearer auth for `/postcontent`.
- JSON schema validation (Ajv) for stricter contract.
- Structured logging (pino, winston) for observability.
- Rate limiting & DDoS protection (Cloud Armor / API Gateway).
- Scaling across instances with Redis / Pub/Sub / NATS.

---

## Docker & Cloud Run

Build locally:

```bash
docker build -t radiowsserver:local .
docker run -p 8080:8080 radiowsserver:local
```

Deploy (example):

```bash
gcloud run deploy radiowsserver \
  --source . \
  --region=europe-west1 \
  --allow-unauthenticated \
  --set-env-vars=PUBLIC_BASE_URL=https://radiowsserver-<hash>.europe-west1.run.app
```

---

## Browser Quick Test

```js
const ws = new WebSocket("ws://localhost:8080");
ws.onmessage = (e) => console.log("WS:", JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({ type: "chat", text: "Hello!" }));
```

---

## Future Enhancements (Ideas)

- Topics / rooms
- Backpressure & QoS
- Metrics endpoint (/metrics for Prometheus)
- Auth roles & per-channel permissions

---

## License

MIT
