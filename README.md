# WebSocket Broadcast & HTTP Injection Server

A lightweight Node.js WebSocket broadcast server with an HTTP endpoint for pushing content to all connected clients. Designed for deployment on Google Cloud Run (or any container platform) with long‑lived connections supported via heartbeat (ping/pong) and optional connection policies.

---

## Key Features

- WebSocket broadcasting: any JSON message from a WebSocket client is forwarded (with metadata) to all other clients.
- HTTP push endpoint: `POST /postcontent` accepts validated JSON and broadcasts it to every WebSocket client.
- Heartbeat keepalive: periodic ping to detect stale/dead connections (configurable via env var).
- Optional per-connection policies: idle timeout and max connection age (disabled by default).
- Health endpoint: `GET /health` returns status, uptime, and current client count.
- Graceful shutdown: sends close code `4002` on SIGTERM (Cloud Run lifecycle friendly).
- Origin allowlist: restrict WebSocket connections via `ORIGIN_ALLOWLIST`.
- Payload size limits: independent limits for WebSocket frames and HTTP POST body.
- Cloud Run friendly logging & env-based URL configuration (`PUBLIC_BASE_URL`).

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

## HTTP API

### `GET /health`

Returns JSON:

```json
{ "status": "ok", "uptime": 12.34, "clients": 3 }
```

### `POST /postcontent`

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

```bash
npm install -g wscat
wscat -c ws://localhost:8080
```

Open another terminal:

```bash
wscat -c ws://localhost:8080
```

Send JSON in one; observe broadcast in the other.

### Using curl for /postcontent

```bash
curl -X POST http://localhost:8080/postcontent \
  -H 'Content-Type: application/json' \
  -d '{"type":"ping","timestamp":"2025-10-02T00:00:00Z","data":{"msg":"hello"}}'
```

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
