/**
 * Health Check Module
 *
 * Provides server health status and monitoring endpoints.
 * Returns information about server uptime, connected clients, and room statistics.
 */

import { roomRegistry } from "../rooms/index.js";

/**
 * Parse boolean-like query parameters with a default value
 * Accepts common truthy values: true, 1, yes
 * Accepts common falsy values: false, 0, no
 */
function parseBooleanQueryParam(value, defaultValue = false) {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

/**
 * Generate health check response
 * @param {Map} rooms - Map of room names to Set of WebSocket clients
 * @param {WebSocketServer} wss - WebSocket server instance
 * @param {boolean} detailed - Whether to include detailed client information
 * @returns {Promise<Object>} Health check response object
 */
export async function generateHealthResponse(rooms, wss, detailed = false) {
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

  return {
    status: "ok",
    uptime: process.uptime(),
    clients: wss?.clients?.size || 0,
    rooms: roomStats,
    registeredHandlers: roomRegistry.getRegisteredRooms(),
  };
}

/**
 * Handle health check HTTP request
 * @param {http.IncomingMessage} req - HTTP request
 * @param {http.ServerResponse} res - HTTP response
 * @param {Map} rooms - Map of room names to Set of WebSocket clients
 * @param {WebSocketServer} wss - WebSocket server instance
 */
export async function handleHealthRequest(req, res, rooms, wss) {
  try {
    // Parse query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const detailed = parseBooleanQueryParam(
      url.searchParams.get("detailed"),
      false
    );

    const response = await generateHealthResponse(rooms, wss, detailed);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error("Error generating health response:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "error",
        message: "Internal server error",
      })
    );
  }
}

/**
 * Check if request is for health endpoint
 * @param {http.IncomingMessage} req - HTTP request
 * @returns {boolean} True if this is a health check request
 */
export function isHealthRequest(req) {
  return req.method === "GET" && req.url.startsWith("/health");
}
