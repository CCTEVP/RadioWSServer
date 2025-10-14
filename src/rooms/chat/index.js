import { BaseRoomHandler } from "../BaseRoomHandler.js";

/**
 * Chat Room Handler
 *
 * Example custom room handler for a chat application.
 * Demonstrates user management, message filtering, and custom validation.
 */
export class ChatHandler extends BaseRoomHandler {
  constructor() {
    super("chat");
    this.users = new Map(); // Map socket to user info
    this.messageCount = 0;
    this.bannedWords = ["spam", "badword"]; // Example word filter
    this.requiresAuth = true; // Enforce authentication
  }

  /**
   * Verify authentication for chat room
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

    // Chat-specific auth checks
    console.log(`[Chat] Authenticated client: ${authPayload?.clientId}`);
    return true;
  }

  /**
   * Validate chat messages
   */
  async validateMessage(payload, socket) {
    // Require username
    if (!socket.chatUsername) {
      return {
        error:
          'Username required. Send {type: "setUsername", username: "YourName"} first',
      };
    }

    // Validate message type
    if (payload.type === "chatMessage") {
      if (!payload.text || typeof payload.text !== "string") {
        return { error: "Chat message must have a text field" };
      }

      // Check banned words
      const lowerText = payload.text.toLowerCase();
      for (const word of this.bannedWords) {
        if (lowerText.includes(word)) {
          return { error: "Message contains inappropriate content" };
        }
      }

      // Check message length
      if (payload.text.length > 500) {
        return { error: "Message too long (max 500 characters)" };
      }
    }

    return null; // Accept
  }

  /**
   * Process chat messages
   */
  async onMessage(payload, socket, clientAddress) {
    // Handle username setting
    if (payload.type === "setUsername") {
      if (payload.username && typeof payload.username === "string") {
        const username = payload.username.trim().substring(0, 20);
        socket.chatUsername = username;
        this.users.set(socket, { username, joinedAt: Date.now() });

        // Return system message
        return {
          type: "systemMessage",
          text: `${username} joined the chat`,
          timestamp: new Date().toISOString(),
        };
      }
      return false; // Suppress if invalid
    }

    // Handle typing indicator
    if (payload.type === "typing") {
      return {
        type: "userTyping",
        username: socket.chatUsername,
        isTyping: payload.isTyping || false,
      };
    }

    // Handle chat messages
    if (payload.type === "chatMessage") {
      this.messageCount++;

      return {
        type: "chatMessage",
        username: socket.chatUsername,
        text: payload.text,
        timestamp: new Date().toISOString(),
        messageId: this.messageCount,
      };
    }

    // Default enrichment
    return {
      ...payload,
      username: socket.chatUsername,
    };
  }

  /**
   * Custom welcome message with user list
   */
  async getWelcomeMessage(socket) {
    const userList = Array.from(this.users.values()).map((u) => u.username);

    return {
      type: "welcome",
      message: "Connected to Chat room",
      room: this.roomName,
      time: Date.now(),
      onlineUsers: userList,
      totalMessages: this.messageCount,
      instructions: {
        setUsername: 'Send {type: "setUsername", username: "YourName"}',
        sendMessage: 'Send {type: "chatMessage", text: "Your message"}',
        typing: 'Send {type: "typing", isTyping: true/false}',
      },
    };
  }

  /**
   * Enhanced room statistics
   */
  async getRoomStats(clients) {
    return {
      clients: clients.size,
      users: this.users.size,
      totalMessages: this.messageCount,
      userList: Array.from(this.users.values()).map((u) => u.username),
    };
  }

  /**
   * Called when client joins (after authentication)
   */
  async onJoin(socket, req, clientAddress, authPayload) {
    const clientId = authPayload?.clientId || clientAddress;
    console.log(`[Chat] Client ${clientId} connected (no username yet)`);
    socket.chatClientId = authPayload?.clientId;
    return true;
  }

  /**
   * Called when client leaves
   */
  async onLeave(socket, clientAddress, code, reason) {
    const username = socket.chatUsername;

    if (username) {
      this.users.delete(socket);
      console.log(`[Chat] User ${username} (${clientAddress}) left`);

      // Broadcast leave message to remaining users
      // Note: This would require access to broadcastToRoom, so we'd need to modify the architecture
      // For now, just log it
    } else {
      console.log(`[Chat] Anonymous client ${clientAddress} left`);
    }
  }

  /**
   * Periodic cleanup
   */
  async onHeartbeat() {
    // Could implement features like:
    // - Purge old messages
    // - Check for idle users
    // - Send periodic stats
  }
}
