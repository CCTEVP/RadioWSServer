# WebSocket Broadcast Server

A minimal Node.js WebSocket server that accepts JSON payloads from a client and broadcasts them to all other connected clients.

## Features

- Accepts JSON messages from any client
- Broadcasts each JSON object to all other clients with metadata (sender address, timestamp)
- Simple health endpoint at `/health`
- Helpful error responses for invalid JSON / payload shape

## Requirements

- Node.js 18+ (for native ESM and modern APIs)

## Install

```bash
npm install
```

## Run (production mode)

```bash
npm start
```

## Run (development with auto-restart)

```bash
npm run dev
```

Server listens on port 8080 by default (override with `PORT=9000` etc.)

## Test With `wscat`

Install globally if you don't have it:

```bash
npm install -g wscat
```

Connect two terminals:

```bash
wscat -c ws://localhost:8080
wscat -c ws://localhost:8080
```

In one terminal send:

```json
{ "hello": "world" }
```

The other terminal should receive a broadcast message with metadata.

## Browser Test Snippet

Open DevTools console and run:

```js
const ws = new WebSocket("ws://localhost:8080");
ws.onmessage = (e) => console.log("message", JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({ test: "123" }));
```

## Message Shapes

Incoming (client -> server): any JSON object, e.g.

```json
{ "type": "chat", "text": "Hello" }
```

Broadcast (server -> other clients):

```json
{
  "type": "broadcast",
  "from": "::1:54321",
  "receivedAt": 1710000000000,
  "data": { "type": "chat", "text": "Hello" }
}
```

Welcome message (server -> new client):

```json
{
  "type": "welcome",
  "message": "Connected to broadcast server",
  "time": 1710000000000
}
```

Error message:

```json
{ "type": "error", "error": "Invalid JSON payload" }
```

## Production Hardening Ideas

- Add authentication (tokens / headers)
- Rate limiting & payload size limits
- Structured logging (pino / winston)
- Heartbeat / ping-pong to detect dead connections
- TLS (wss) termination via reverse proxy
- Horizontal scaling using Redis pub/sub

## License

MIT
