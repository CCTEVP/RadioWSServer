/**
 * BaseRoomHandler - Abstract base class for room-specific logic
 *
 * All room handlers should extend this class and override methods
 * to implement custom behavior for their specific room.
 */
export class BaseRoomHandler {
  constructor(roomName) {
    this.roomName = roomName;
    this.requiresAuth = true; // By default, all rooms require authentication
  }

  /**
   * Verify client authentication (called before onJoin)
   * Override this to implement custom authentication logic
   * @param {Object} authPayload - Decoded auth token payload (null if no token)
   * @param {Object} req - The HTTP upgrade request
   * @param {string} clientAddress - The client's address
   * @returns {boolean|Object} - Return false to reject, true to accept, or object with rejection info
   */
  async verifyAuth(authPayload, req, clientAddress) {
    // Default: Require authentication
    if (!authPayload) {
      return {
        reject: true,
        code: 4001,
        reason: "Authentication required",
      };
    }

    // Verify token is for this room
    if (authPayload.room !== this.roomName) {
      return {
        reject: true,
        code: 4004,
        reason: "Token not valid for this room",
      };
    }

    // Default: Accept authenticated clients
    return true;
  }

  /**
   * Called when a client joins this room (after authentication)
   * @param {WebSocket} socket - The client's WebSocket connection
   * @param {Object} req - The HTTP upgrade request
   * @param {string} clientAddress - The client's address
   * @param {Object} authPayload - Decoded auth token payload
   * @returns {boolean|Object} - Return false to reject connection, or custom data to attach to socket
   */
  async onJoin(socket, req, clientAddress, authPayload) {
    console.log(
      `[${this.roomName}] Client ${
        authPayload?.clientId || clientAddress
      } joined`
    );
    return true;
  }

  /**
   * Called when a client leaves this room
   * @param {WebSocket} socket - The client's WebSocket connection
   * @param {string} clientAddress - The client's address
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   */
  async onLeave(socket, clientAddress, code, reason) {
    console.log(
      `[${this.roomName}] Client ${clientAddress} left (code: ${code})`
    );
  }

  /**
   * Process and potentially modify a message before broadcasting
   * @param {Object} payload - The parsed message payload
   * @param {WebSocket} socket - The sender's socket
   * @param {string} clientAddress - The sender's address
   * @returns {Object|null|false} - Return modified payload, null to use original, or false to suppress broadcast
   */
  async onMessage(payload, socket, clientAddress) {
    // Default: return null to use the original enriched message
    return null;
  }

  /**
   * Process and potentially modify an HTTP POST message before broadcasting
   * @param {Object} payload - The parsed POST body
   * @returns {Object|null|false} - Return modified payload, null to use original, or false to reject
   */
  async onHttpPost(payload) {
    // Default: return null to use the original payload
    return null;
  }

  /**
   * Validate a message payload (called before onMessage)
   * @param {Object} payload - The parsed message payload
   * @param {WebSocket} socket - The sender's socket
   * @returns {Object|null} - Return error object {error: "message"} to reject, or null to accept
   */
  async validateMessage(payload, socket) {
    // Default: accept all messages
    return null;
  }

  /**
   * Validate an HTTP POST payload (called before onHttpPost)
   * @param {Object} payload - The parsed POST body
   * @returns {Object|null} - Return error object {error: "message", code: 422} to reject, or null to accept
   */
  async validateHttpPost(payload) {
    // Default: accept all posts
    return null;
  }

  /**
   * Get custom welcome message for clients joining this room
   * @param {WebSocket} socket - The client's socket
   * @returns {Object|null} - Return custom welcome message object, or null for default
   */
  async getWelcomeMessage(socket) {
    return null; // Use default welcome message
  }

  /**
   * Get room statistics/metadata for health endpoint
   * @param {Set} clients - Set of WebSocket clients in this room
   * @returns {Object} - Additional room metadata
   */
  async getRoomStats(clients) {
    return {
      clients: clients.size,
    };
  }

  /**
   * Called periodically (with heartbeat) for room-specific maintenance
   * Only called if room has active clients
   */
  async onHeartbeat() {
    // Override for custom periodic logic
  }

  /**
   * Get HTTP routes for this room
   * By default, loads generic routes from src/rooms/routes.js
   * Override this to provide room-specific custom routes
   * @returns {Array|null} - Array of route configurations, or null if no custom routes
   */
  async getRoutes() {
    // Default: load generic routes that work for all rooms
    const { routes } = await import("./routes.js");
    return routes;
  }
}
