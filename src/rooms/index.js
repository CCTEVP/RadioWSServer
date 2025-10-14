import { BaseRoomHandler } from "./BaseRoomHandler.js";
import { RadioHandler } from "./radio/index.js";
import { readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Room Registry - Manages room handlers
 *
 * Dynamically loads room handlers from the rooms directory
 * and provides a fallback for rooms without custom handlers.
 */
class RoomRegistry {
  constructor() {
    this.handlers = new Map();
    this.defaultHandler = new BaseRoomHandler("default");
  }

  /**
   * Initialize and load all room handlers
   */
  async initialize() {
    console.log("Initializing room handlers...");

    // Register known handlers
    this.registerHandler("radio", new RadioHandler());

    // Auto-discover room handlers from directories
    await this.discoverRoomHandlers();

    console.log(
      `Registered ${this.handlers.size} room handler(s):`,
      Array.from(this.handlers.keys())
    );
  }

  /**
   * Register a room handler
   */
  registerHandler(roomName, handler) {
    if (!(handler instanceof BaseRoomHandler)) {
      throw new Error(`Handler for ${roomName} must extend BaseRoomHandler`);
    }
    this.handlers.set(roomName, handler);
    console.log(`✓ Registered handler for room: ${roomName}`);
  }

  /**
   * Get handler for a specific room (returns default if not found)
   */
  getHandler(roomName) {
    if (this.handlers.has(roomName)) {
      return this.handlers.get(roomName);
    }

    // Return a default handler instance for this room
    return new BaseRoomHandler(roomName);
  }

  /**
   * Check if a room has a custom handler
   */
  hasCustomHandler(roomName) {
    return this.handlers.has(roomName);
  }

  /**
   * Get all registered room names
   */
  getRegisteredRooms() {
    return Array.from(this.handlers.keys());
  }

  /**
   * Auto-discover room handlers from the rooms directory
   */
  async discoverRoomHandlers() {
    try {
      const roomsDir = __dirname;
      const entries = await readdir(roomsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== "node_modules") {
          const roomName = entry.name;

          // Skip if already registered
          if (this.handlers.has(roomName)) {
            continue;
          }

          // Try to load index.js from the room directory
          try {
            const handlerPath = join(roomsDir, roomName, "index.js");
            // Convert to file:// URL for Windows compatibility
            const handlerUrl = new URL(
              `file:///${handlerPath.replace(/\\/g, "/")}`
            );
            const module = await import(handlerUrl);

            // Look for a class that extends BaseRoomHandler
            const HandlerClass = Object.values(module).find(
              (exp) =>
                exp.prototype instanceof BaseRoomHandler ||
                exp === BaseRoomHandler
            );

            if (HandlerClass && HandlerClass !== BaseRoomHandler) {
              const handler = new HandlerClass();
              this.registerHandler(roomName, handler);
            }
          } catch (err) {
            // Ignore rooms without handlers or with errors
            if (
              err.code !== "MODULE_NOT_FOUND" &&
              err.code !== "ERR_MODULE_NOT_FOUND"
            ) {
              console.warn(
                `Warning: Could not load handler for room "${roomName}":`,
                err.message
              );
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not discover room handlers:", err.message);
    }
  }

  /**
   * Get statistics for all rooms with handlers
   */
  async getHandlerStats() {
    const stats = {};
    for (const [roomName, handler] of this.handlers) {
      stats[roomName] = {
        hasCustomHandler: true,
        handlerClass: handler.constructor.name,
      };
    }
    return stats;
  }
}

// Export singleton instance
export const roomRegistry = new RoomRegistry();
