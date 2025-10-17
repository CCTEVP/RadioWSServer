import { BaseRoomHandler } from "../BaseRoomHandler.js";

/**
 * Radio Room Handler
 *
 * Handles radio content broadcasting with content validation,
 * advertiser tracking, and content metadata.
 */
export class RadioHandler extends BaseRoomHandler {
  constructor() {
    super("radio");
    this.contentHistory = []; // Store recent content for new joiners
    this.maxHistorySize = 10;
    this.requiresAuth = true; // Enforce authentication
  }

  /**
   * Verify authentication for radio room
   * Only authenticated clients with valid tokens can join
   */
  async verifyAuth(authPayload, req, clientAddress) {
    // Call parent verification first
    const parentResult = await super.verifyAuth(
      authPayload,
      req,
      clientAddress
    );
    if (parentResult && parentResult.reject) {
      return parentResult;
    }

    // Additional radio-specific auth checks
    // For example, verify client has permission for radio content
    if (authPayload && authPayload.metadata) {
      // Could check metadata.permissions, metadata.subscription, etc.
      console.log(`[Radio] Authenticated client: ${authPayload.clientId}`);
    }

    return true; // Accept
  }

  /**
   * Validate radio messages
   */
  async validateMessage(payload, socket) {
    // Allow all WebSocket messages by default for backward compatibility
    return null;
  }

  /**
   * Validate HTTP POST messages for radio
   */
  async validateHttpPost(payload) {
    // Additional validation specific to radio content
    if (payload.data) {
      // Check if content has expected structure for radio
      if (payload.data.content) {
        if (!payload.data.content.id) {
          return { error: "Content must have an id", code: 422 };
        }
      }
    }
    return null; // Accept
  }

  /**
   * Process radio messages
   */
  async onMessage(payload, socket, clientAddress) {
    // Update client activity tracking
    if (socket.radioMetadata) {
      socket.radioMetadata.lastActivity = Date.now();
      socket.radioMetadata.messageCount =
        (socket.radioMetadata.messageCount || 0) + 1;
    }

    // Add radio-specific metadata
    const enriched = {
      ...payload,
      room: this.roomName,
      processedBy: "RadioHandler",
    };

    // Store in history for new joiners
    this.addToHistory({
      timestamp: new Date().toISOString(),
      data: enriched,
    });

    return enriched; // Return modified payload
  }

  /**
   * Process HTTP POST for radio content
   */
  async onHttpPost(payload) {
    // DEBUG: Log what we received
    console.log(
      "[Radio] onHttpPost received payload:",
      JSON.stringify(payload, null, 2)
    );

    // Add radio-specific tracking
    const enriched = {
      ...payload,
      room: this.roomName,
      contentType: "radio",
    };

    // DEBUG: Log what we're sending back
    console.log(
      "[Radio] onHttpPost enriched payload:",
      JSON.stringify(enriched, null, 2)
    );

    // Store in history
    this.addToHistory({
      timestamp: payload.serverReceivedAt || new Date().toISOString(),
      data: enriched,
    });

    return enriched;
  }

  /**
   * Custom welcome message with recent content history
   */
  async getWelcomeMessage(socket) {
    return {
      type: "welcome",
      message: "Connected to Radio Content room",
      room: this.roomName,
      time: Date.now(),
      recentContent: this.contentHistory.slice(-5), // Last 5 items
      features: [
        "Real-time radio content updates",
        "Advertiser tracking",
        "Content history available",
      ],
    };
  }

  /**
   * Enhanced room statistics with detailed client info
   */
  async getRoomStats(clients) {
    const clientDetails = [];

    // Collect detailed information about each client
    for (const client of clients) {
      if (client.radioMetadata) {
        const connectedTime = Date.now() - client.radioMetadata.joinedAt;
        const connectedDuration = this.formatDuration(connectedTime);

        clientDetails.push({
          id: client.radioMetadata.clientId,
          connected: connectedDuration,
          joinedAt: new Date(client.radioMetadata.joinedAt).toISOString(),
          lastActivity: client.radioMetadata.lastActivity
            ? new Date(client.radioMetadata.lastActivity).toISOString()
            : null,
          messageCount: client.radioMetadata.messageCount || 0,
          clientAddress: client.radioMetadata.clientAddress,
          userAgent: client.radioMetadata.userAgent || "Unknown",
        });
      } else {
        // Fallback for clients without metadata
        clientDetails.push({
          id: "unknown",
          connected: "unknown",
          joinedAt: null,
          lastActivity: null,
          messageCount: 0,
          clientAddress: "unknown",
          userAgent: "unknown",
        });
      }
    }

    return {
      clients: {
        total: clients.size,
        details: clientDetails,
      },
      contentHistorySize: this.contentHistory.length,
      lastContent:
        this.contentHistory.length > 0
          ? this.contentHistory[this.contentHistory.length - 1].timestamp
          : null,
    };
  }

  /**
   * Format duration in human-readable format
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Called when client joins (after authentication)
   */
  async onJoin(socket, req, clientAddress, authPayload) {
    const clientId = authPayload?.clientId || clientAddress;
    console.log(
      `[Radio] Client ${clientId} joined - ${this.contentHistory.length} items in history`
    );

    // Attach detailed metadata to socket for this room
    socket.radioMetadata = {
      clientId: authPayload?.clientId || "anonymous",
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      receivedCount: 0,
      clientAddress: clientAddress,
      userAgent: req.headers["user-agent"] || "Unknown",
      metadata: authPayload?.metadata || {},
    };

    return true;
  }

  /**
   * Called when client leaves
   */
  async onLeave(socket, clientAddress, code, reason) {
    if (socket.radioMetadata) {
      const duration = Date.now() - socket.radioMetadata.joinedAt;
      console.log(
        `[Radio] Client ${clientAddress} left after ${Math.round(
          duration / 1000
        )}s, ` + `received ${socket.radioMetadata.receivedCount} messages`
      );
    }
  }

  /**
   * Periodic cleanup of old content
   */
  async onHeartbeat() {
    // Keep only recent history
    if (this.contentHistory.length > this.maxHistorySize) {
      this.contentHistory = this.contentHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Helper to add content to history
   */
  addToHistory(item) {
    this.contentHistory.push(item);
    if (this.contentHistory.length > this.maxHistorySize * 2) {
      this.contentHistory = this.contentHistory.slice(-this.maxHistorySize);
    }
  }

  // Uses generic routes from BaseRoomHandler (src/rooms/routes.js)
  // Override getRoutes() here if you need radio-specific custom routes
}
