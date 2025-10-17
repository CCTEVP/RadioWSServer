// Load environment variables from .env file
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

import { WebSocketServer } from "ws";
import http from "http";
import swaggerUi from "swagger-ui-express";
import { generateSwaggerSpecs } from "./swagger.js";
import { roomRegistry } from "./rooms/index.js";
import {
  extractToken,
  verifyAuthToken,
  validateHttpPostAuth,
  AuthConfig,
  generateAuthToken,
} from "./auth/index.js";
import {
  handlePostContentRequest,
  handlePostContentOptions,
} from "./postcontent/index.js";

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
const server = http.createServer(async (req, res) => {
  // Simple router
  if (req.method === "GET" && req.url.startsWith("/health")) {
    // Parse query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const detailed = url.searchParams.get("detailed") === "true";

    const roomStats = {};

    // Gather room statistics from handlers
    for (const [roomName, clients] of rooms.entries()) {
      const handler = roomRegistry.getHandler(roomName);

      if (detailed) {
        // Get detailed statistics with client information
        const handlerStats = await handler.getRoomStats(clients);
        roomStats[roomName] = {
          ...handlerStats,
          hasCustomHandler: roomRegistry.hasCustomHandler(roomName),
        };
      } else {
        // Get minimal statistics (just counts)
        roomStats[roomName] = {
          clients: clients.size,
          hasCustomHandler: roomRegistry.hasCustomHandler(roomName),
        };
      }
    }

    const response = {
      status: "ok",
      uptime: process.uptime(),
      clients: wss?.clients?.size || 0,
      rooms: roomStats,
      registeredHandlers: roomRegistry.getRegisteredRooms(),
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
    return;
  }

  // API Documentation endpoint
  if (req.method === "GET" && req.url === "/docs") {
    try {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>RadioWSServer API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
  <style>
    .swagger-ui .topbar { display: none }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/docs/swagger.json',
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIStandalonePreset
      ],
      layout: "StandaloneLayout"
    });
  </script>
</body>
</html>`;
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    } catch (error) {
      console.error("Error generating docs:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to generate documentation" }));
    }
    return;
  }

  // Swagger JSON specification endpoint
  if (req.method === "GET" && req.url === "/docs/swagger.json") {
    // Use the same PUBLIC_BASE_URL that the server is configured with
    const swaggerSpecs = generateSwaggerSpecs(PUBLIC_BASE_URL);
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(swaggerSpecs, null, 2));
    return;
  }

  // Authentication Routes
  // POST /auth/token - Generate authentication token (API only, use Postman)

  // POST /auth/token - Generate authentication token
  if (req.method === "POST" && req.url === "/auth/token") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        if (!data.clientId || !data.room) {
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(
            JSON.stringify({
              error: "clientId and room are required",
              example: {
                clientId: "user123",
                room: "radio",
              },
            })
          );
          return;
        }

        const token = generateAuthToken({
          clientId: data.clientId,
          room: data.room,
          metadata: data.metadata || {},
        });

        // Calculate expiration (1 hour from now)
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(
          JSON.stringify({
            token,
            clientId: data.clientId,
            room: data.room,
            expiresAt: expiresAt.toISOString(),
          })
        );
      } catch (err) {
        res.writeHead(400, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: "Invalid request: " + err.message }));
      }
    });
    return;
  }

  // OPTIONS for /auth/token (CORS preflight)
  if (req.method === "OPTIONS" && req.url === "/auth/token") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  // ============================================================================
  // BACKWARD COMPATIBILITY ENDPOINT
  // ============================================================================
  // POST /postcontent - Legacy endpoint that forwards to /radio/post
  // See src/postcontent/index.js for implementation
  // Delete the entire /src/postcontent/ folder when no longer needed
  if (req.method === "POST" && req.url === "/postcontent") {
    console.log("✅ /postcontent endpoint matched - forwarding to radio room");
    handlePostContentRequest(req, res, roomRegistry, broadcastToRoom);
    return;
  }

  // OPTIONS for /postcontent (CORS preflight)
  if (req.method === "OPTIONS" && req.url === "/postcontent") {
    console.log("✅ /postcontent OPTIONS matched");
    handlePostContentOptions(req, res);
    return;
  }
  // ============================================================================
  // END BACKWARD COMPATIBILITY
  // ============================================================================

  // OPTIONS for room-based routing (CORS preflight)
  // Handle preflight requests for /room/:roomName/:path endpoints
  const roomOptionsMatch = req.url.match(/^\/room\/([^\/]+)(\/[^\/]+.*)$/);
  if (req.method === "OPTIONS" && roomOptionsMatch) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  // Room-based routing ONLY: /room/:roomName/:path
  // Examples: /room/radio/post, /room/chat/messages
  // This matches paths starting with /room/ prefix
  const roomRouteMatch = req.url.match(/^\/room\/([^\/]+)(\/[^\/]+.*)$/);
  if (roomRouteMatch) {
    const roomName = roomRouteMatch[1];
    const roomPath = roomRouteMatch[2];

    // Get room handler
    const handler = roomRegistry.getHandler(roomName);

    // Try to get routes from the handler
    const routes = await handler.getRoutes();

    if (routes && routes.length > 0) {
      // Find matching route
      const matchingRoute = routes.find(
        (route) => route.method === req.method && route.path === roomPath
      );

      if (matchingRoute) {
        // Check authentication if required
        if (matchingRoute.requiresAuth) {
          const authPayload = validateHttpPostAuth(req, roomName);
          if (!authPayload) {
            res.writeHead(401, {
              "Content-Type": "application/json",
              "WWW-Authenticate": "Bearer",
            });
            res.end(
              JSON.stringify({
                error:
                  "Authentication required. Include Authorization: Bearer <token>",
              })
            );
            return;
          }

          // Call the route handler with auth payload
          await matchingRoute.handler(
            req,
            res,
            authPayload,
            handler,
            broadcastToRoom
          );
        } else {
          // Call the route handler without auth
          await matchingRoute.handler(req, res, null, handler, broadcastToRoom);
        }
        return;
      }
    }
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

// Comma-separated list of message .type values that should NOT be broadcast to
// other clients. They will be treated as internal control messages. Default
// suppresses keepalive messages (case-insensitive). Example to add more:
// PowerShell: $env:SUPPRESSED_TYPES='keepalive,typing'
const SUPPRESSED_TYPES = (process.env.SUPPRESSED_TYPES || "keepalive,ack")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const wss = new WebSocketServer({ server, maxPayload: MAX_PAYLOAD_BYTES });

// Room management: Maps room name to Set of WebSocket clients
const rooms = new Map();

// Helper to get or create a room
function getRoom(roomName) {
  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  return rooms.get(roomName);
}

// Helper to add client to room with handler support
async function joinRoom(socket, roomName, req, clientAddress, authPayload) {
  const room = getRoom(roomName);
  const handler = roomRegistry.getHandler(roomName);

  // Call handler's onJoin method with auth payload
  const joinResult = await handler.onJoin(
    socket,
    req,
    clientAddress,
    authPayload
  );

  // If handler returns false, reject the connection
  if (joinResult === false) {
    return false;
  }

  room.add(socket);
  socket.currentRoom = roomName;
  socket.roomHandler = handler;
  const clientId = authPayload?.clientId || clientAddress;
  console.log(
    `Client joined room: ${roomName} (${room.size} clients) - ID: ${clientId}`
  );
  return true;
}

// Helper to remove client from room with handler support
async function leaveRoom(socket, code, reason, clientAddress) {
  if (socket.currentRoom) {
    const room = rooms.get(socket.currentRoom);
    if (room) {
      room.delete(socket);

      // Call handler's onLeave method
      if (socket.roomHandler) {
        await socket.roomHandler.onLeave(socket, clientAddress, code, reason);
      }

      console.log(
        `Client left room: ${socket.currentRoom} (${room.size} clients)`
      );
      // Clean up empty rooms
      if (room.size === 0) {
        rooms.delete(socket.currentRoom);
      }
    }
    socket.currentRoom = null;
    socket.roomHandler = null;
  }
}

// Helper to broadcast to room
function broadcastToRoom(roomName, message, excludeSocket = null) {
  const room = rooms.get(roomName);
  if (!room) return 0;

  let delivered = 0;
  room.forEach((client) => {
    if (client !== excludeSocket && client.readyState === client.OPEN) {
      sendJson(client, message);
      delivered++;
    }
  });
  return delivered;
}

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
  heartbeatInterval = setInterval(async () => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (_) {
        /* ignore ping failures */
      }
    });

    // Call heartbeat on room handlers
    for (const [roomName, clients] of rooms.entries()) {
      if (clients.size > 0) {
        const handler = roomRegistry.getHandler(roomName);
        try {
          await handler.onHeartbeat();
        } catch (err) {
          console.error(`Heartbeat error for room ${roomName}:`, err);
        }
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
  wss.on("close", () => clearInterval(heartbeatInterval));
}

wss.on("connection", async (socket, req) => {
  socket.isAlive = true; // initial state for heartbeat
  let lastActivity = Date.now();
  const clientAddress = getClientAddress(req);

  // Basic origin check AFTER upgrade (lightweight; for stricter security use custom upgrade handling)
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin)) {
    console.warn("Closing connection due to disallowed origin", origin);
    try {
      socket.close(4003, "Origin not allowed");
    } catch (_) {}
    return;
  }

  // Extract room from URL path or query parameter
  // Examples:
  //   - ws://server/room/radio?token=xxx (preferred with /room/ prefix)
  //   - ws://server/radio?token=xxx (legacy, backward compatible)
  //   - ws://server/?room=radio&token=xxx (query parameter)
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Extract room name - NO DEFAULT ROOM (security requirement)
  let roomName = null;

  // Check path first
  const pathname = url.pathname;
  console.log(`🔍 WebSocket connection attempt - pathname: ${pathname}`);

  // 1. Try /room/:roomName pattern (preferred)
  const roomPrefixMatch = pathname.match(/^\/room\/([^\/]+)/);
  if (roomPrefixMatch) {
    roomName = roomPrefixMatch[1];
    console.log(`✅ Matched /room/ prefix pattern - room: ${roomName}`);
  }
  // 2. Try legacy /:roomName pattern (backward compatible)
  else {
    const legacyPathRoom = pathname.replace(/^\/+/, "").split("/")[0];
    if (legacyPathRoom && legacyPathRoom !== "room") {
      roomName = legacyPathRoom;
      console.log(`✅ Matched legacy pattern - room: ${roomName}`);
    }
  }

  // 3. Fallback to query parameter (e.g., ?room=myRoom)
  if (!roomName) {
    const queryRoom = url.searchParams.get("room");
    if (queryRoom) {
      roomName = queryRoom;
      console.log(`✅ Matched query parameter - room: ${roomName}`);
    }
  }

  // SECURITY: Reject if no room specified
  if (!roomName) {
    console.warn("Connection rejected: No room specified", clientAddress);
    try {
      socket.close(AuthConfig.ERRORS.NO_ROOM_SPECIFIED, "Room name required");
    } catch (_) {}
    return;
  }

  // SECURITY: Extract and verify authentication token
  const token = extractToken(req);
  let authPayload = null;

  if (token) {
    authPayload = verifyAuthToken(token, roomName);
    if (!authPayload) {
      console.warn(
        "Connection rejected: Invalid token",
        clientAddress,
        roomName
      );
      try {
        socket.close(
          AuthConfig.ERRORS.INVALID_TOKEN,
          "Invalid or expired token"
        );
      } catch (_) {}
      return;
    }
  }

  // Get room handler and verify authentication
  const roomHandler = roomRegistry.getHandler(roomName);
  const authResult = await roomHandler.verifyAuth(
    authPayload,
    req,
    clientAddress
  );

  if (authResult && authResult.reject) {
    console.warn(
      "Connection rejected by auth:",
      authResult.reason,
      clientAddress,
      roomName
    );
    try {
      socket.close(
        authResult.code || AuthConfig.ERRORS.INVALID_TOKEN,
        authResult.reason
      );
    } catch (_) {}
    return;
  }

  // Store auth payload on socket
  socket.authPayload = authPayload;

  // Join the specified room (with handler support)
  const joined = await joinRoom(
    socket,
    roomName,
    req,
    clientAddress,
    authPayload
  );

  if (!joined) {
    console.warn("Client rejected by room handler", clientAddress, roomName);
    try {
      socket.close(4004, "Rejected by room");
    } catch (_) {}
    return;
  }

  console.log(
    "Client connected",
    clientAddress,
    `room=${roomName}`,
    origin ? `origin=${origin}` : ""
  );

  // Proof-of-life updates
  socket.on("pong", () => {
    socket.isAlive = true;
    lastActivity = Date.now();
  });

  // Get custom welcome message from handler
  const handler = roomRegistry.getHandler(roomName);
  const customWelcome = await handler.getWelcomeMessage(socket);

  const welcomeMessage = customWelcome || {
    type: "welcome",
    message: "Connected to broadcast server",
    room: roomName,
    time: Date.now(),
  };

  sendJson(socket, welcomeMessage);

  // Idle timeout watcher (per connection) if enabled
  if (IDLE_TIMEOUT_MS > 0) {
    const idleCheck = () => {
      if (Date.now() - lastActivity > IDLE_TIMEOUT_MS)
        return socket.close(4000, "Idle timeout");
      if (socket.readyState === socket.OPEN)
        setTimeout(idleCheck, Math.max(5000, IDLE_TIMEOUT_MS / 2));
    };
    setTimeout(idleCheck, Math.max(5000, IDLE_TIMEOUT_MS / 2));
  }

  // Max connection age enforcement if enabled
  if (MAX_CONN_AGE_MS > 0) {
    setTimeout(() => {
      if (socket.readyState === socket.OPEN)
        socket.close(4001, "Max connection age reached");
    }, MAX_CONN_AGE_MS);
  }

  // Whenever you process a real message, update activity time
  socket.on("message", async (data, isBinary) => {
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
      sendJson(socket, { type: "error", error: "Invalid JSON payload" });
      return;
    }

    // Basic validation (ensure object)
    if (typeof payload !== "object" || payload === null) {
      sendJson(socket, {
        type: "error",
        error: "Payload must be a JSON object",
      });
      return;
    }

    // Validate with room handler
    const handler =
      socket.roomHandler || roomRegistry.getHandler(socket.currentRoom);
    const validationError = await handler.validateMessage(payload, socket);

    if (validationError) {
      sendJson(socket, {
        type: "error",
        error: validationError.error || "Validation failed",
      });
      return;
    }

    let enriched = {
      type: "broadcast",
      from: clientAddress,
      receivedAt: Date.now(),
      data: payload,
    };

    // Suppress internal/control message types from being broadcast. This
    // allows clients to send periodic {type:"keepalive"} (or other configured
    // types) without spamming all connected peers. We still update lastActivity
    // above so idle timeout logic is satisfied.
    const payloadType =
      payload && typeof payload.type === "string"
        ? payload.type.toLowerCase()
        : null;
    if (payloadType && SUPPRESSED_TYPES.includes(payloadType)) {
      // Optionally acknowledge only to the sender so they know the server saw it.
      sendJson(socket, {
        type: "ack",
        ackType: payload.type,
        receivedAt: Date.now(),
      });
      return; // Do NOT broadcast further
    }

    // Let handler process/modify the message
    const handlerResult = await handler.onMessage(
      payload,
      socket,
      clientAddress
    );

    if (handlerResult === false) {
      // Handler suppressed the message
      return;
    }

    // Use handler's modified payload if provided
    if (handlerResult !== null && handlerResult !== undefined) {
      enriched = {
        type: "broadcast",
        from: clientAddress,
        receivedAt: Date.now(),
        data: handlerResult,
      };
    }

    // Broadcast to other clients in the same room only
    broadcastToRoom(socket.currentRoom, enriched, socket);
  });

  socket.on("close", async (code, reason) => {
    await leaveRoom(socket, code, reason.toString(), clientAddress);
    console.log(
      "Client disconnected",
      clientAddress,
      "code=",
      code,
      "reason=",
      reason.toString()
    );
  });

  socket.on("error", (err) => {
    console.error("WebSocket error from", clientAddress, err);
  });
});

// Initialize room handlers before starting server
await roomRegistry.initialize();

server.listen(PORT, () => {
  console.log(`WebSocket broadcast server listening (internal port ${PORT}).`);
  console.log(`Public base: ${PUBLIC_BASE_URL}`);
  console.log(`Health endpoint: ${PUBLIC_BASE_URL}/health`);
  console.log(`WebSocket URL: ${PUBLIC_BASE_URL.replace(/^http/, "ws")}`);
  console.log(
    `Room handlers ready: ${roomRegistry.getRegisteredRooms().join(", ")}`
  );
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
