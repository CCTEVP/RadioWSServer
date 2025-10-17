/**
 * Documentation Authentication Module
 *
 * Provides session-based authentication for protected documentation routes.
 * Uses email/password validation with session tokens.
 */

import crypto from "crypto";

// In-memory session storage (use Redis in production)
const sessions = new Map();

// Session configuration
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up every hour

/**
 * Get documentation credentials from environment
 */
export function getDocsCredentials() {
  return {
    email: process.env.DOCS_EMAIL || "admin@radiows.local",
    password: process.env.DOCS_PASSWORD || "admin123",
  };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a new session
 */
export function createSession(email) {
  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_DURATION;

  sessions.set(token, {
    email,
    createdAt: Date.now(),
    expiresAt,
    lastActivity: Date.now(),
  });

  console.log(
    `✅ Session created for ${email}, expires at ${new Date(
      expiresAt
    ).toISOString()}`
  );

  return token;
}

/**
 * Validate a session token
 */
export function validateSession(token) {
  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  // Check if session expired
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    console.log(`⏰ Session expired and removed`);
    return null;
  }

  // Update last activity
  session.lastActivity = Date.now();

  return session;
}

/**
 * Destroy a session
 */
export function destroySession(token) {
  if (sessions.has(token)) {
    sessions.delete(token);
    console.log(`🗑️  Session destroyed`);
    return true;
  }
  return false;
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired session(s)`);
  }
}

// Start periodic cleanup
setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL);

/**
 * Authenticate user credentials
 */
export function authenticateDocsUser(email, password) {
  if (!email || !password) {
    return { success: false, message: "Email and password are required" };
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return { success: false, message: "Invalid email format" };
  }

  // Get credentials from environment
  const credentials = getDocsCredentials();

  // Check credentials
  if (email === credentials.email && password === credentials.password) {
    const token = createSession(email);
    return {
      success: true,
      message: "Login successful",
      token,
    };
  }

  console.log(`❌ Failed login attempt for email: ${email}`);
  return { success: false, message: "Invalid credentials" };
}

/**
 * Middleware to protect routes
 * Checks for valid session token in cookies or Authorization header
 */
export function requireDocsAuth(req, res, next) {
  // Check for token in Authorization header
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // Check for token in cookies
  if (!token && req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies.docs_auth_token;
  }

  // Validate session
  const session = validateSession(token);

  if (session) {
    req.docsUser = session;
    next();
  } else {
    // Redirect to login page for browser requests
    if (req.headers.accept && req.headers.accept.includes("text/html")) {
      res.writeHead(302, {
        Location: "/auth/docs-login-page",
        "Content-Type": "text/plain",
      });
      res.end("Redirecting to login...");
    } else {
      // Return 401 for API requests
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Authentication required",
          message: "Please log in to access this resource",
        })
      );
    }
  }
}

/**
 * Parse cookies from cookie header
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });
  return cookies;
}

/**
 * Get session statistics
 */
export function getSessionStats() {
  return {
    activeSessions: sessions.size,
    sessions: Array.from(sessions.entries()).map(([token, session]) => ({
      email: session.email,
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      lastActivity: new Date(session.lastActivity).toISOString(),
    })),
  };
}
