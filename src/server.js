import { WebSocketServer } from "ws";
import http from "http";

const PORT = process.env.PORT || 8080;
// Heartbeat interval (ms). If 0 or negative, heartbeat disabled. 30s default keeps most proxies/NATs alive.
// PowerShell example: $env:HEARTBEAT_INTERVAL_MS=30000; node src/server.js
const HEARTBEAT_INTERVAL_MS = parseInt(
  process.env.HEARTBEAT_INTERVAL_MS || "30000",
  10
);
// Optional per-connection policies (disabled by default if 0)
const IDLE_TIMEOUT_MS = parseInt(process.env.IDLE_TIMEOUT_MS || "0", 10);
const MAX_CONN_AGE_MS = parseInt(process.env.MAX_CONN_AGE_MS || "0", 10);

// Public base URL for clients (override in env). Fallback to the deployed Cloud Run URL.
// Example (PowerShell): $env:PUBLIC_BASE_URL='https://radiowsserver-763503917257.europe-west1.run.app'
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL ||
  "https://radiowsserver-763503917257.europe-west1.run.app"
).replace(/\/$/, "");

// Basic HTTP server (optional for health check / upgrade flexibility)
const server = http.createServer((req, res) => {
  // Simple router
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        uptime: process.uptime(),
        clients: wss?.clients?.size || 0,
      })
    );
    return;
  }

  // Preflight for /postcontent (basic CORS allowance if needed from browsers)
  if (req.method === "OPTIONS" && req.url === "/postcontent") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/postcontent") {
    const MAX_POST_BYTES = parseInt(
      process.env.POST_CONTENT_MAX_BYTES || "262144",
      10
    ); // 256KB default
    let raw = "";
    let received = 0;
    req.on("data", (chunk) => {
      received += chunk.length;
      if (received > MAX_POST_BYTES) {
        res.writeHead(413, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Payload too large" }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on("end", () => {
      let body;
      try {
        body = JSON.parse(raw || "{}");
      } catch (_) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      // Mandatory fields validation: type, timestamp, data
      const errors = [];
      if (!body || typeof body !== "object")
        errors.push("Body must be a JSON object");
      if (!("type" in body)) errors.push("Missing field: type");
      if (!("timestamp" in body)) errors.push("Missing field: timestamp");
      if (!("data" in body)) errors.push("Missing field: data");

      if (body && typeof body.type !== "string")
        errors.push("Field type must be a string");
      if (body && typeof body.timestamp === "string") {
        if (isNaN(Date.parse(body.timestamp)))
          errors.push("timestamp must be an ISO-8601 date string");
      } else if (body) {
        errors.push("timestamp must be a string");
      }
      if (
        body &&
        (typeof body.data !== "object" ||
          body.data === null ||
          Array.isArray(body.data))
      ) {
        errors.push("data must be a non-null JSON object");
      }

      if (errors.length) {
        res.writeHead(422, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "Validation failed", details: errors })
        );
        return;
      }

      // Attach server receipt timestamp; otherwise broadcast the payload as-is per requirement
      const broadcastPayload = {
        ...body,
        serverReceivedAt: new Date().toISOString(),
      };

      let delivered = 0;
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          delivered++;
          sendJson(client, broadcastPayload);
        }
      });

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({ status: "ok", delivered, echo: broadcastPayload })
      );
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// Optional origin allowlist (comma separated). If unset, all origins allowed.
const ORIGIN_ALLOWLIST = (process.env.ORIGIN_ALLOWLIST || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Max payload (bytes) to guard against very large messages (default 1MB if unspecified)
const MAX_PAYLOAD_BYTES = parseInt(
  process.env.MAX_PAYLOAD_BYTES || "1048576",
  10
);

const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });
// Extract client address (respect Cloud Run / proxy headers)
function getClientAddress(req) {
  const fwd = req.headers["x-forwarded-for"]; // may contain list
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket.remoteAddress + ":" + req.socket.remotePort;
}

function isOriginAllowed(originHeader) {
  if (!ORIGIN_ALLOWLIST.length) return true; // allow all if no list configured
  if (!originHeader) return false; // if list provided, require an origin
  try {
    const url = new URL(originHeader);
    const originHost = url.origin.toLowerCase();
    return ORIGIN_ALLOWLIST.some(
      (allowed) => allowed.toLowerCase() === originHost
    );
  } catch (_) {
    return false;
  }
}

// Utility to send JSON safely
function sendJson(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch (err) {
    console.error("Failed to send JSON", err);
  }
}

// Heartbeat loop (one global interval) only if enabled
let heartbeatInterval = null;
if (HEARTBEAT_INTERVAL_MS > 0) {
  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (_) {
        /* ignore ping failures */
      }
    });
  }, HEARTBEAT_INTERVAL_MS);
  wss.on("close", () => clearInterval(heartbeatInterval));
}

ws.on("connection", (ws, req) => {
  ws.isAlive = true; // initial state for heartbeat
  let lastActivity = Date.now();
  const clientAddress = getClientAddress(req);

  // Basic origin check AFTER upgrade (lightweight; for stricter security use custom upgrade handling)
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin)) {
    console.warn("Closing connection due to disallowed origin", origin);
    try {
      ws.close(4003, "Origin not allowed");
    } catch (_) {}
    return;
  }

  console.log(
    "Client connected",
    clientAddress,
    origin ? `origin=${origin}` : ""
  );

  // Proof-of-life updates
  ws.on("pong", () => {
    ws.isAlive = true;
    lastActivity = Date.now();
  });

  // Send a welcome message
  sendJson(ws, {
    type: "welcome",
    message: "Connected to broadcast server",
    time: Date.now(),
  });

  // Idle timeout watcher (per connection) if enabled
  if (IDLE_TIMEOUT_MS > 0) {
    const idleCheck = () => {
      if (Date.now() - lastActivity > IDLE_TIMEOUT_MS)
        return ws.close(4000, "Idle timeout");
      if (ws.readyState === ws.OPEN)
        setTimeout(idleCheck, Math.max(5000, IDLE_TIMEOUT_MS / 2));
    };
    setTimeout(idleCheck, Math.max(5000, IDLE_TIMEOUT_MS / 2));
  }

  // Max connection age enforcement if enabled
  if (MAX_CONN_AGE_MS > 0) {
    setTimeout(() => {
      if (ws.readyState === ws.OPEN)
        ws.close(4001, "Max connection age reached");
    }, MAX_CONN_AGE_MS);
  }

  // Whenever you process a real message, update activity time
  ws.on("message", (data, isBinary) => {
    lastActivity = Date.now();
    // Accept text or binary but expect JSON when text
    if (isBinary) {
      console.warn("Binary message received; ignoring broadcast.");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(data.toString());
    } catch (err) {
      sendJson(ws, { type: "error", error: "Invalid JSON payload" });
      return;
    }

    // Basic validation (ensure object)
    if (typeof payload !== "object" || payload === null) {
      sendJson(ws, { type: "error", error: "Payload must be a JSON object" });
      return;
    }

    const enriched = {
      type: "broadcast",
      from: clientAddress,
      receivedAt: Date.now(),
      data: payload,
    };

    // Broadcast to all other connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === client.OPEN) {
        sendJson(client, enriched);
      }
    });
  });

  ws.on("close", (code, reason) => {
    console.log(
      "Client disconnected",
      clientAddress,
      "code=",
      code,
      "reason=",
      reason.toString()
    );
  });

  ws.on("error", (err) => {
    console.error("WebSocket error from", clientAddress, err);
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket broadcast server listening (internal port ${PORT}).`);
  console.log(`Public base: ${PUBLIC_BASE_URL}`);
  console.log(`Health endpoint: ${PUBLIC_BASE_URL}/health`);
  console.log(`WebSocket URL: ${PUBLIC_BASE_URL.replace(/^http/, "ws")}`);
});

// Graceful shutdown (Cloud Run sends SIGTERM before instance stops)
function shutdown() {
  console.log("Shutdown signal received. Draining connections...");
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  // Stop accepting new HTTP / WS
  try {
    server.close();
  } catch (_) {}
  // Close existing clients with a policy code
  wss.clients.forEach((client) => {
    try {
      client.close(4002, "Server shutting down");
    } catch (_) {}
  });
  // Force exit after a grace period (Cloud Run gives ~10s by default)
  setTimeout(() => process.exit(0), 8000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
