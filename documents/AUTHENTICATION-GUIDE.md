# Authentication & Security Guide

## 🔐 Security Model

As of the latest update, **all connections require authentication**. There is no default room, and clients must:

1. **Specify a room explicitly** in the URL
2. **Provide a valid authentication token**
3. **Pass room-specific authentication checks**

## Why Authentication?

- **Security**: Prevent unauthorized access to room data
- **Identity**: Track and identify clients reliably
- **Access Control**: Different rooms can have different auth requirements
- **Audit**: Log who accessed what and when

## Authentication Flow

```
Client Request
     ↓
Extract Token (from query param or Authorization header)
     ↓
Verify Token Signature (HMAC-SHA256)
     ↓
Check Token Expiration
     ↓
Verify Room Matches Token
     ↓
Room Handler Custom Auth (verifyAuth method)
     ↓
Accept or Reject Connection
```

## Token Format

Tokens use HMAC-SHA256 signing:

```
<base64url(payload)>.<base64url(signature)>
```

**Payload contains:**

```json
{
  "clientId": "user123",
  "room": "radioContent",
  "expiresAt": 1729000000000,
  "issuedAt": 1728900000000,
  "metadata": {
    "permissions": ["read", "write"],
    "subscription": "premium"
  }
}
```

## Generating Tokens

### Method 1: Token Generator UI (For Testing)

Open the token generator in your browser:

```
http://localhost:8080/auth
```

This provides a simple web interface to generate tokens with:

- Client ID
- Room selection
- Custom expiration time
- Optional metadata

### Method 2: Token API Endpoint

Use the POST endpoint to generate tokens programmatically:

```bash
# PowerShell
$body = @{clientId='user123';room='radioContent';expiresIn=86400000} | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:8080/auth/token -Method POST -Body $body -ContentType 'application/json'

# curl
curl -X POST http://localhost:8080/auth/token \
  -H 'Content-Type: application/json' \
  -d '{
    "clientId": "user123",
    "room": "radioContent",
    "expiresIn": 86400000
  }'
```

**Response:**

```json
{
  "token": "eyJjbGllbnRJZCI6InVzZXIxMjMi...abc123",
  "clientId": "user123",
  "room": "radioContent",
  "expiresAt": "2025-10-15T12:00:00.000Z"
}
```

### Method 2: Programmatic Generation

```javascript
import { generateAuthToken } from "./src/auth/index.js";

const token = generateAuthToken({
  clientId: "user123",
  room: "radioContent",
  expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  metadata: {
    permissions: ["read", "write"],
    subscription: "premium",
  },
});

console.log("Token:", token);
```

### Method 3: External Auth Service (Production)

In production, integrate with your existing authentication service:

```javascript
// Your auth service
POST /api/auth/websocket-token
Body: { userId, room }
Response: { token }

// Then your client uses the token
ws://your-server.com/radioContent?token=<token>
```

## Using Tokens

### WebSocket Connections

**Option 1: Query Parameter (Recommended)**

```javascript
const token = "eyJjbGllbnRJZC...";
const ws = new WebSocket(`ws://localhost:8080/radioContent?token=${token}`);
```

**Option 2: Authorization Header**

```javascript
const ws = new WebSocket("ws://localhost:8080/radioContent", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### HTTP POST Requests

**Required: Authorization Header**

```bash
curl -X POST http://localhost:8080/radioContent/postcontent \
  -H 'Authorization: Bearer eyJjbGllbnRJZC...' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "update",
    "timestamp": "2025-10-14T00:00:00Z",
    "data": {"content": {"id": 123, "name": "Test"}}
  }'
```

**JavaScript Example:**

```javascript
const token = "eyJjbGllbnRJZC...";

const response = await fetch("http://localhost:8080/radioContent/postcontent", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    type: "update",
    timestamp: new Date().toISOString(),
    data: { content: { id: 123, name: "Test" } },
  }),
});
```

## Error Codes

| Code | Reason            | Solution                        |
| ---- | ----------------- | ------------------------------- |
| 4001 | No token provided | Include token in request        |
| 4002 | Invalid token     | Generate a new token            |
| 4003 | Expired token     | Generate a new token            |
| 4004 | Wrong room        | Generate token for correct room |
| 4005 | No room specified | Include room in URL             |
| 401  | HTTP auth failed  | Include Authorization header    |

## Environment Variables

### Required in Production

**AUTH_SECRET** - Secret key for signing tokens

```bash
# Linux/Mac
export AUTH_SECRET="your-super-secret-key-min-32-chars"

# Windows PowerShell
$env:AUTH_SECRET="your-super-secret-key-min-32-chars"

# Docker
-e AUTH_SECRET="your-super-secret-key-min-32-chars"
```

⚠️ **WARNING**: If AUTH_SECRET is not set, a random key is generated on each restart, invalidating all existing tokens!

## Custom Authentication Logic

### In Room Handlers

Each room can implement custom authentication:

```javascript
import { BaseRoomHandler } from "../BaseRoomHandler.js";

export class MyRoomHandler extends BaseRoomHandler {
  constructor() {
    super("myRoom");
    this.requiresAuth = true; // Enforce auth
  }

  /**
   * Custom authentication logic for this room
   */
  async verifyAuth(authPayload, req, clientAddress) {
    // First, run parent auth (checks token validity and room match)
    const parentResult = await super.verifyAuth(
      authPayload,
      req,
      clientAddress
    );
    if (parentResult && parentResult.reject) {
      return parentResult;
    }

    // Your custom checks
    if (!authPayload) {
      return {
        reject: true,
        code: 4001,
        reason: "Authentication required",
      };
    }

    // Check permissions
    if (!authPayload.metadata?.permissions?.includes("read")) {
      return {
        reject: true,
        code: 4003,
        reason: "Insufficient permissions",
      };
    }

    // Check subscription level
    if (authPayload.metadata?.subscription !== "premium") {
      return {
        reject: true,
        code: 4003,
        reason: "Premium subscription required",
      };
    }

    // Accept
    console.log(`[MyRoom] Authenticated: ${authPayload.clientId}`);
    return true;
  }

  /**
   * Access auth info in other methods
   */
  async onJoin(socket, req, clientAddress, authPayload) {
    console.log(`User ${authPayload.clientId} joined`);
    console.log(`Permissions:`, authPayload.metadata?.permissions);

    // Store on socket for later use
    socket.userId = authPayload.clientId;
    socket.permissions = authPayload.metadata?.permissions || [];

    return true;
  }

  async onMessage(payload, socket, clientAddress) {
    // Check permissions
    if (payload.type === "delete" && !socket.permissions.includes("write")) {
      return false; // Suppress message
    }

    // Add user info to message
    return {
      ...payload,
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    };
  }
}
```

## Security Best Practices

### 1. **Always Set AUTH_SECRET in Production**

```bash
export AUTH_SECRET=$(openssl rand -base64 32)
```

### 2. **Use Short Token Expiration**

- Default: 24 hours
- Sensitive operations: 1 hour
- Long-lived: 7 days maximum

```javascript
const token = generateAuthToken({
  clientId: "user123",
  room: "radioContent",
  expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
});
```

### 3. **Include Metadata for Fine-Grained Access**

```javascript
const token = generateAuthToken({
  clientId: "user123",
  room: "radioContent",
  metadata: {
    permissions: ["read", "write"],
    roles: ["admin"],
    subscription: "premium",
    userId: "550e8400-e29b-41d4-a716-446655440000",
  },
});
```

### 4. **Validate on Every Request**

Authentication is checked:

- On WebSocket connection
- On every HTTP POST
- Can be checked in message handlers

### 5. **Rotate Secrets Regularly**

Update AUTH_SECRET periodically (requires re-generating all tokens).

### 6. **Use HTTPS/WSS in Production**

Always use secure connections:

- `wss://` for WebSocket
- `https://` for HTTP

### 7. **Log Authentication Events**

```javascript
async verifyAuth(authPayload, req, clientAddress) {
  console.log(`[Auth] ${authPayload?.clientId} from ${clientAddress} to ${this.roomName}`);
  // Your auth logic...
}
```

## Migrating from Non-Auth Setup

### Breaking Changes

1. **No default room** - Clients must specify room explicitly
2. **Authentication required** - All connections need valid tokens
3. **HTTP POST needs Authorization header**

### Migration Steps

**Step 1: Generate tokens for existing clients**

```bash
# Use the web UI at http://localhost:8080/auth
# Or use the API endpoint to generate tokens for each client/room combination
curl -X POST http://localhost:8080/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"clientId":"user123","room":"radioContent"}'
```

**Step 2: Update client code**

```javascript
// OLD (no longer works)
const ws = new WebSocket("ws://server.com");

// NEW (with auth)
const token = await getTokenFromYourAuthService();
const ws = new WebSocket(`ws://server.com/radioContent?token=${token}`);
```

**Step 3: Update HTTP POST code**

```javascript
// OLD (no longer works)
fetch('http://server.com/postcontent/radioContent', {...})

// NEW (with room-based routes and auth)
fetch('http://server.com/radioContent/postcontent', {
  headers: { 'Authorization': `Bearer ${token}` },
  ...
})
```

### Temporary: Disable Auth for Testing

**Not recommended for production!**

Create a room with custom auth that always accepts:

```javascript
export class TestRoomHandler extends BaseRoomHandler {
  constructor() {
    super("testRoom");
    this.requiresAuth = false; // ⚠️  UNSAFE
  }

  async verifyAuth(authPayload, req, clientAddress) {
    console.warn("⚠️  WARNING: Auth disabled for testing");
    return true; // Accept all connections
  }
}
```

## Testing Authentication

### 1. Generate a Test Token

```bash
# Start the server
npm start

# In browser: http://localhost:8080/auth
# Generate token for client "testUser" and room "radioContent"
```

### 2. Test WebSocket Connection

```bash
# Install wscat if needed
npm install -g wscat

# Connect with token
wscat -c "ws://localhost:8080/radioContent?token=YOUR_TOKEN_HERE"
```

### 3. Test HTTP POST

```bash
curl -X POST http://localhost:8080/radioContent/postcontent \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "timestamp": "2025-10-14T00:00:00Z",
    "data": {"message": "Hello!"}
  }'
```

### 4. Test Invalid Token (Should Fail)

```bash
# No token
wscat -c "ws://localhost:8080/radioContent"
# Expected: Connection closed with code 4001

# Invalid token
wscat -c "ws://localhost:8080/radioContent?token=invalid"
# Expected: Connection closed with code 4002

# Expired token (generate one with very short expiry)
# Expected: Connection closed with code 4003

# Wrong room
wscat -c "ws://localhost:8080/otherRoom?token=TOKEN_FOR_RADIO_CONTENT"
# Expected: Connection closed with code 4004
```

## FAQ

**Q: Can I use existing JWT tokens?**
A: The current implementation uses HMAC-SHA256. To use JWT, modify `src/auth.js` to import a JWT library.

**Q: How do I integrate with OAuth/SSO?**
A: Your OAuth service should generate tokens after authentication:

1. User authenticates with OAuth
2. Your backend generates a WebSocket token
3. Client uses that token to connect

**Q: Can different rooms share tokens?**
A: No. Each token is bound to a specific room for security.

**Q: What if AUTH_SECRET changes?**
A: All existing tokens become invalid. Clients need new tokens.

**Q: Can I have both authenticated and public rooms?**
A: Yes! Override `verifyAuth()` in specific room handlers to allow unauthenticated access (not recommended).

---

## Quick Reference

```bash
# Start server
npm start

# Generate token via API
POST http://localhost:8080/auth/token
Body: {"clientId": "user123", "room": "radioContent"}

# Or use the web UI
http://localhost:8080/auth

# Connect WebSocket
ws://localhost:8080/roomName?token=<token>

# HTTP POST (room-specific routes)
POST http://localhost:8080/roomName/postcontent
Header: Authorization: Bearer <token>
```
