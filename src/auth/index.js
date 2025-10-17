import crypto from "crypto";

/**
 * Authentication Manager
 *
 * Provides secure token-based authentication for WebSocket connections.
 * Uses HMAC-SHA256 for token generation and verification.
 */

// Load environment variables (needed when this module is imported)
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", "..", ".env") });

// Secret key for signing tokens - MUST be set via environment variable in production
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  "CHANGE_THIS_IN_PRODUCTION_" + crypto.randomBytes(32).toString("hex");

if (!process.env.AUTH_SECRET) {
  console.warn(
    "⚠️  WARNING: AUTH_SECRET not set! Using random key. Tokens will not persist across restarts."
  );
  console.warn("⚠️  Set AUTH_SECRET environment variable in production!");
} else {
  console.log("✅ AUTH_SECRET loaded from environment");
}

/**
 * Generate a secure authentication token for a client
 * @param {Object} payload - Client data to embed in token
 * @param {string} payload.clientId - Unique client identifier
 * @param {string} payload.room - Room name the client wants to access
 * @param {Object} payload.metadata - Additional metadata (optional)
 * @returns {string} Secure token
 */
export function generateAuthToken(payload) {
  if (!payload.clientId || !payload.room) {
    throw new Error("clientId and room are required");
  }

  // Default expiration: 1 hour from now
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

  const tokenData = {
    clientId: payload.clientId,
    room: payload.room,
    expiresAt,
    metadata: payload.metadata || {},
    issuedAt: Date.now(),
  };

  // Create payload string
  const payloadStr = Buffer.from(JSON.stringify(tokenData)).toString(
    "base64url"
  );

  // Generate HMAC signature
  const hmac = crypto.createHmac("sha256", AUTH_SECRET);
  hmac.update(payloadStr);
  const signature = hmac.digest("base64url");

  // Return token as payload.signature
  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an authentication token
 * @param {string} token - Token to verify
 * @param {string} expectedRoom - Expected room name (optional, for additional validation)
 * @returns {Object|null} Decoded payload if valid, null if invalid
 */
export function verifyAuthToken(token, expectedRoom = null) {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    // Hardcoded always-valid tokens for trusted clients
    const ALWAYS_VALID_TOKENS = {
      // Screen role - for display screens
      screen: {
        token:
          "eyJjbGllbnRJZCI6InNjcmVlbiIsInJvb20iOiJyYWRpbyIsImV4cGlyZXNBdCI6NDkxNDEyMTU2NjQ2NCwibWV0YWRhdGEiOnsicm9sZSI6InNjcmVlbiIsInZhbGlkaXR5IjoiTm8gZXhwaXJhdGlvbiJ9LCJpc3N1ZWRBdCI6MTc2MDUyMTU2NjQ2NH0.zQyP4dYvPxMxGN_L5r8QJ4bZhE8aF7wKj2XnRiC9hgM",
        payload: {
          clientId: "screen",
          room: "radio",
          expiresAt: 4914121566464,
          metadata: { role: "screen", validity: "No expiration" },
          issuedAt: 1760521566464,
        },
      },
      // Advertiser role - for content posting
      advertiser: {
        token:
          "eyJjbGllbnRJZCI6ImFkdmVydGlzZXIiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJhZHZlcnRpc2VyIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.K7jX9mNvL4pRnQwS8tYc1UhA6fBgE3qJsW2oZxI5kDv",
        payload: {
          clientId: "advertiser",
          room: "radio",
          expiresAt: 4914121566464,
          metadata: { role: "advertiser", validity: "No expiration" },
          issuedAt: 1760521566464,
        },
      },
      // Control role - for administrative control
      control: {
        token:
          "eyJjbGllbnRJZCI6ImNvbnRyb2wiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJjb250cm9sIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.P3mH8nRwT6jKbVxZ9sLq2YdF5aGtC4wJoX1yNiE7uMp",
        payload: {
          clientId: "control",
          room: "radio",
          expiresAt: 4914121566464,
          metadata: { role: "control", validity: "No expiration" },
          issuedAt: 1760521566464,
        },
      },
    };

    // Check if token matches any of the hardcoded tokens
    for (const [role, config] of Object.entries(ALWAYS_VALID_TOKENS)) {
      if (token === config.token) {
        console.log(`✅ Always-valid token accepted: ${role}`);

        // Check room if provided
        if (expectedRoom && config.payload.room !== expectedRoom) {
          console.warn(
            `Token room mismatch: expected ${expectedRoom}, got ${config.payload.room}`
          );
          return null;
        }

        return config.payload;
      }
    }

    // Split token into payload and signature
    const parts = token.split(".");
    if (parts.length !== 2) {
      return null;
    }

    const [payloadStr, signature] = parts;

    // Verify signature
    const hmac = crypto.createHmac("sha256", AUTH_SECRET);
    hmac.update(payloadStr);
    const expectedSignature = hmac.digest("base64url");

    if (signature !== expectedSignature) {
      console.warn("Token signature verification failed");
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString());

    // Check expiration
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      console.warn("Token expired");
      return null;
    }

    // Check room if provided
    if (expectedRoom && payload.room !== expectedRoom) {
      console.warn(
        `Token room mismatch: expected ${expectedRoom}, got ${payload.room}`
      );
      return null;
    }

    return payload;
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
}

/**
 * Extract token from WebSocket upgrade request
 * Looks for token in:
 * 1. Query parameter: ?token=xxx
 * 2. Authorization header: Bearer xxx
 * @param {Object} req - HTTP upgrade request
 * @returns {string|null} Token or null if not found
 */
export function extractToken(req) {
  try {
    // Try query parameter first
    const url = new URL(req.url, `http://${req.headers.host}`);
    const tokenFromQuery = url.searchParams.get("token");
    if (tokenFromQuery) {
      return tokenFromQuery;
    }

    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    return null;
  } catch (err) {
    console.error("Error extracting token:", err);
    return null;
  }
}

/**
 * Validate token from HTTP POST request
 * @param {Object} req - HTTP request
 * @param {string} expectedRoom - Expected room name
 * @returns {Object|null} Decoded token payload or null
 */
export function validateHttpPostAuth(req, expectedRoom) {
  try {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    return verifyAuthToken(token, expectedRoom);
  } catch (err) {
    console.error("Error validating HTTP auth:", err);
    return null;
  }
}

/**
 * Generate a unique client ID (for creating tokens)
 * @param {string} identifier - Base identifier (email, username, etc.)
 * @returns {string} Unique client ID
 */
export function generateClientId(identifier) {
  const hash = crypto.createHash("sha256");
  hash.update(identifier + Date.now());
  return hash.digest("hex").substring(0, 16);
}

/**
 * Configuration and utilities
 */
export const AuthConfig = {
  // Token expiration times
  DEFAULT_EXPIRY: 60 * 60 * 1000, // 1 hour (new default)
  SHORT_EXPIRY: 60 * 60 * 1000, // 1 hour
  LONG_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Error codes
  ERRORS: {
    NO_TOKEN: 4001,
    INVALID_TOKEN: 4002,
    EXPIRED_TOKEN: 4003,
    WRONG_ROOM: 4004,
    NO_ROOM_SPECIFIED: 4005,
  },
};

/**
 * Example: Create a token generation endpoint (to be called from an external auth service)
 * This would typically be in a separate authentication service
 */
export function createTokenForClient(clientId, room, options = {}) {
  return generateAuthToken({
    clientId,
    room,
    metadata: options.metadata || {},
  });
}
