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
    this.lastKnownDurationMs = null;
    this.lastControlSnapshot = null;
    this.radioPostBroadcastDelaySeconds = this.resolveBroadcastDelaySeconds();
  }

  async getBroadcastDelay(context) {
    const isPostMessage = [context?.processed?.type, context?.original?.type]
      .filter((value) => typeof value === "string")
      .some((value) => value.toLowerCase() === "post");

    if (!isPostMessage) {
      return 0;
    }

    // 1. Check for delay in payload (context.processed or context.original)
    let delayValue =
      context?.processed?.delay ??
      context?.original?.delay ??
      context?.processed?.data?.delay ??
      context?.original?.data?.delay;

    let delaySeconds = this.parseBroadcastDelaySeconds(delayValue);
    if (delaySeconds > 0) {
      return delaySeconds * 1000;
    }

    // 2. Fallback to env/config
    if (!Number.isFinite(this.radioPostBroadcastDelaySeconds)) {
      this.radioPostBroadcastDelaySeconds = this.resolveBroadcastDelaySeconds();
    }

    if (!Number.isFinite(this.radioPostBroadcastDelaySeconds)) {
      return 0;
    }

    return Math.max(0, this.radioPostBroadcastDelaySeconds) * 1000;
  }

  parseBroadcastDelaySeconds(value) {
    if (value === undefined || value === null || value === "") {
      return 0;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) && value > 0 ? value : 0;
    }

    if (typeof value === "string") {
      const parsed = Number.parseFloat(value.trim());
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }

    return 0;
  }

  resolveBroadcastDelaySeconds() {
    const envValue = process.env.RADIO_POST_BROADCAST_DELAY_SECONDS || 0;

    const parsed = this.parseBroadcastDelaySeconds(envValue);
    if (parsed > 0) {
      return parsed;
    }

    return 0;
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

        const clientInfo = {
          id: client.radioMetadata.clientId,
          connected: connectedDuration,
          joinedAt: new Date(client.radioMetadata.joinedAt).toISOString(),
          lastActivity: client.radioMetadata.lastActivity
            ? new Date(client.radioMetadata.lastActivity).toISOString()
            : null,
          messageCount: client.radioMetadata.messageCount || 0,
          clientAddress: client.radioMetadata.clientAddress,
          userAgent: client.radioMetadata.userAgent || "Unknown",
        };

        // Add Broadsign metadata if available
        const metadata = client.radioMetadata.metadata || {};
        if (
          metadata.frameId ||
          metadata.adCopyId ||
          metadata.playerId ||
          metadata.expectedSlotDurationMs
        ) {
          clientInfo.broadsign = {
            frameId: metadata.frameId || "",
            adCopyId: metadata.adCopyId || "",
            playerId: metadata.playerId || "",
            expectedSlotDurationMs: metadata.expectedSlotDurationMs || "",
          };
        }

        clientDetails.push(clientInfo);
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
   * Build standard control broadcast payload
   */
  buildControlBroadcastPayload(durationMs, roomName = this.roomName) {
    const parsedMs =
      typeof durationMs === "number"
        ? durationMs
        : Number.parseFloat(durationMs ?? "0");
    const safeMs = Number.isFinite(parsedMs) ? parsedMs : 0;
    const maxDurationSeconds = Math.max(
      0,
      Math.round(safeMs / 1000)
    ).toString();

    const formattedRoomName = this.formatRoomName(roomName);

    return {
      rc: {
        version: "1",
        id: "1",
        action: "play_now",
        name: formattedRoomName,
        "max-duration": maxDurationSeconds,
      },
    };
  }

  formatRoomName(roomName) {
    if (!roomName || typeof roomName !== "string") {
      return "RoomContent";
    }

    if (roomName.length === 1) {
      return `${roomName.toUpperCase()}Content`;
    }

    return `${roomName[0].toUpperCase()}${roomName.slice(1)}Content`;
  }

  parseDuration(value, multiplier = 1) {
    if (value === undefined || value === null) return null;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value * multiplier : null;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed * multiplier : null;
    }
    return null;
  }

  recursiveFindDuration(source, visited = new Set()) {
    if (!source || typeof source !== "object") {
      return null;
    }

    if (visited.has(source)) {
      return null;
    }
    visited.add(source);

    const direct = this.parseDuration(source.expectedSlotDurationMs);
    if (direct !== null) return direct;

    const secondsCandidates = [
      source.expectedSlotDurationSeconds,
      source.maxDurationSeconds,
      source.durationSeconds,
    ];
    for (const candidate of secondsCandidates) {
      const parsedSeconds = this.parseDuration(candidate, 1000);
      if (parsedSeconds !== null) return parsedSeconds;
    }

    if (Array.isArray(source)) {
      for (const item of source) {
        const nested = this.recursiveFindDuration(item, visited);
        if (nested !== null) return nested;
      }
      return null;
    }

    for (const [key, value] of Object.entries(source)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === "object") {
        const nested = this.recursiveFindDuration(value, visited);
        if (nested !== null) return nested;
      } else if (
        (typeof value === "number" || typeof value === "string") &&
        /duration/i.test(key)
      ) {
        const keyLower = key.toLowerCase();
        const hasMsHint = /ms|millisecond/.test(keyLower);
        const hasSecondsHint = /second/.test(keyLower);
        const numericValue =
          typeof value === "number" ? value : Number.parseFloat(value ?? "NaN");
        let multiplier = 1;

        if (hasSecondsHint || (!hasMsHint && keyLower.includes("duration"))) {
          multiplier = 1000;
          if (Number.isFinite(numericValue) && numericValue >= 1000) {
            multiplier = 1;
          }
        }

        const parsed = this.parseDuration(value, multiplier);
        if (parsed !== null) return parsed;
      }
    }

    return null;
  }

  extractDurationFromSource(source) {
    if (!source || typeof source !== "object") return null;

    const direct = this.parseDuration(source.expectedSlotDurationMs);
    if (direct !== null) return direct;

    if (source.metadata && typeof source.metadata === "object") {
      const fromMetadata = this.parseDuration(
        source.metadata.expectedSlotDurationMs
      );
      if (fromMetadata !== null) return fromMetadata;
    }

    if (source.data && typeof source.data === "object") {
      const fromData = this.parseDuration(source.data.expectedSlotDurationMs);
      if (fromData !== null) return fromData;
    }

    const recursive = this.recursiveFindDuration(source);
    if (recursive !== null) return recursive;

    return null;
  }

  resolveDurationMs(context) {
    const candidates = [
      this.extractDurationFromSource(context.processed),
      this.extractDurationFromSource(context.original),
      this.extractDurationFromSource(context.socket?.radioMetadata),
    ];

    for (const candidate of candidates) {
      if (candidate !== null) return candidate;
    }

    const socketDuration = this.parseDuration(
      context.socket?.radioMetadata?.metadata?.expectedSlotDurationMs
    );
    if (socketDuration !== null) return socketDuration;

    const authDuration = this.parseDuration(
      context.authPayload?.metadata?.expectedSlotDurationMs
    );
    if (authDuration !== null) return authDuration;

    return null;
  }

  async getControlPayload(context) {
    const roomName = context.roomName || this.roomName;

    if (!context.original && !context.processed && this.lastControlSnapshot) {
      return this.lastControlSnapshot;
    }

    let durationMs = this.resolveDurationMs(context);
    if (durationMs !== null) {
      this.lastKnownDurationMs = durationMs;
    } else if (this.lastKnownDurationMs !== null) {
      durationMs = this.lastKnownDurationMs;
    } else {
      return null;
    }

    const payload = this.buildControlBroadcastPayload(durationMs, roomName);
    this.lastControlSnapshot = JSON.parse(JSON.stringify(payload));
    return payload;
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

    // Extract Broadsign metadata from query parameters (if provided)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryMetadata = {};

    // Check for Broadsign-specific query parameters
    const frameId = url.searchParams.get("frameId");
    const adCopyId = url.searchParams.get("adCopyId");
    const playerId = url.searchParams.get("playerId");
    const expectedSlotDurationMs = url.searchParams.get(
      "expectedSlotDurationMs"
    );

    if (frameId) queryMetadata.frameId = frameId;
    if (adCopyId) queryMetadata.adCopyId = adCopyId;
    if (playerId) queryMetadata.playerId = playerId;
    if (expectedSlotDurationMs)
      queryMetadata.expectedSlotDurationMs = expectedSlotDurationMs;
    const broadcastDelay = url.searchParams.get("broadcastDelay");
    if (broadcastDelay) queryMetadata.broadcastDelay = broadcastDelay;

    // Merge metadata: query parameters override token metadata
    const combinedMetadata = {
      ...(authPayload?.metadata || {}),
      ...queryMetadata,
    };

    // Attach detailed metadata to socket for this room
    socket.radioMetadata = {
      clientId: authPayload?.clientId || "anonymous",
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      messageCount: 0,
      receivedCount: 0,
      clientAddress: clientAddress,
      userAgent: req.headers["user-agent"] || "Unknown",
      metadata: combinedMetadata,
      broadcastDelaySeconds: this.radioPostBroadcastDelaySeconds,
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
}
