# Creating Custom Room Handlers

This guide explains how to create custom room handlers for the WebSocket server. Room handlers allow you to add room-specific logic, validation, and features.

## Architecture Overview

```
src/
├── server.js                    # Main server
├── rooms/
    ├── index.js                 # Room registry (auto-discovers handlers)
    ├── BaseRoomHandler.js       # Abstract base class
    ├── radioContent/
    │   └── index.js            # Radio content room handler
    └── chat/
        └── index.js            # Chat room handler (example)
```

## Quick Start

### 1. Create Room Folder

Create a new folder under `src/rooms/` with your room name:

```bash
mkdir src/rooms/myNewRoom
```

### 2. Create Handler File

Create `index.js` in your room folder:

```javascript
import { BaseRoomHandler } from "../BaseRoomHandler.js";

export class MyNewRoomHandler extends BaseRoomHandler {
  constructor() {
    super("myNewRoom"); // Must match folder name
  }

  // Override methods as needed (see below)
}
```

### 3. That's It!

The server will automatically discover and load your handler when it starts.

## BaseRoomHandler API

Your handler extends `BaseRoomHandler` and can override these methods:

### Connection Lifecycle

#### `async onJoin(socket, req, clientAddress)`

Called when a client joins the room.

**Parameters:**

- `socket` - WebSocket connection
- `req` - HTTP upgrade request
- `clientAddress` - Client's IP:port

**Returns:**

- `true` or custom data - Accept the connection
- `false` - Reject the connection

**Example:**

```javascript
async onJoin(socket, req, clientAddress) {
  // Check authentication
  const token = new URL(req.url, 'http://host').searchParams.get('token');
  if (!token) {
    return false; // Reject
  }

  socket.userData = { token, joinedAt: Date.now() };
  return true; // Accept
}
```

#### `async onLeave(socket, clientAddress, code, reason)`

Called when a client leaves the room.

**Example:**

```javascript
async onLeave(socket, clientAddress, code, reason) {
  console.log(`User left: ${socket.userData?.username}`);
  // Cleanup, send notifications, etc.
}
```

### Message Processing

#### `async validateMessage(payload, socket)`

Validate incoming WebSocket messages before processing.

**Returns:**

- `null` - Message is valid
- `{ error: "reason" }` - Reject message

**Example:**

```javascript
async validateMessage(payload, socket) {
  if (payload.type === 'post' && !payload.title) {
    return { error: 'Post must have a title' };
  }
  return null;
}
```

#### `async onMessage(payload, socket, clientAddress)`

Process and optionally modify messages before broadcasting.

**Returns:**

- `null` - Use default enriched message
- Modified object - Use this instead
- `false` - Suppress broadcast

**Example:**

```javascript
async onMessage(payload, socket, clientAddress) {
  if (payload.type === 'chatMessage') {
    return {
      type: 'chat',
      username: socket.username || 'Anonymous',
      text: payload.text,
      timestamp: new Date().toISOString(),
    };
  }
  return null; // Use default
}
```

### HTTP POST Processing

#### `async validateHttpPost(payload)`

Validate HTTP POST to `/postcontent/roomName`.

**Returns:**

- `null` - Accept
- `{ error: "reason", code: 422 }` - Reject

**Example:**

```javascript
async validateHttpPost(payload) {
  if (!payload.data.priority) {
    return { error: 'Priority required', code: 422 };
  }
  return null;
}
```

#### `async onHttpPost(payload)`

Process HTTP POST messages before broadcasting.

**Returns:**

- `null` - Use original
- Modified object - Use this instead
- `false` - Reject

**Example:**

```javascript
async onHttpPost(payload) {
  return {
    ...payload,
    processedBy: this.roomName,
    priority: payload.data.priority || 'normal',
  };
}
```

### Custom Features

#### `async getWelcomeMessage(socket)`

Customize the welcome message sent to new clients.

**Returns:**

- `null` - Use default welcome
- Custom object - Send this instead

**Example:**

```javascript
async getWelcomeMessage(socket) {
  return {
    type: 'welcome',
    message: 'Welcome to My Room!',
    room: this.roomName,
    features: ['Chat', 'Notifications', 'File sharing'],
    onlineUsers: this.getUserCount(),
  };
}
```

#### `async getRoomStats(clients)`

Provide custom statistics for the health endpoint.

**Example:**

```javascript
async getRoomStats(clients) {
  return {
    clients: clients.size,
    messages: this.messageCount,
    customMetric: this.calculateSomething(),
  };
}
```

#### `async onHeartbeat()`

Called periodically (every heartbeat interval) if room has active clients.

**Example:**

```javascript
async onHeartbeat() {
  // Cleanup old data
  this.cleanupOldMessages();

  // Send periodic updates
  if (this.hasUpdates()) {
    // Would need to broadcast somehow
  }
}
```

## Complete Example: Game Room

```javascript
import { BaseRoomHandler } from "../BaseRoomHandler.js";

export class GameRoomHandler extends BaseRoomHandler {
  constructor() {
    super("gameRoom");
    this.players = new Map();
    this.gameState = {
      started: false,
      round: 0,
    };
  }

  async onJoin(socket, req, clientAddress) {
    const username = new URL(req.url, "http://host").searchParams.get(
      "username"
    );

    if (!username) {
      return false; // Require username
    }

    if (this.gameState.started) {
      return false; // Game in progress
    }

    socket.playerUsername = username;
    this.players.set(socket, {
      username,
      score: 0,
      joinedAt: Date.now(),
    });

    console.log(`[Game] ${username} joined (${this.players.size} players)`);
    return true;
  }

  async validateMessage(payload, socket) {
    // Ensure player is registered
    if (!this.players.has(socket)) {
      return { error: "Not registered as player" };
    }

    // Validate game actions
    if (payload.type === "move") {
      if (!this.gameState.started) {
        return { error: "Game not started" };
      }
      if (!payload.position) {
        return { error: "Move must include position" };
      }
    }

    return null;
  }

  async onMessage(payload, socket, clientAddress) {
    const player = this.players.get(socket);

    // Start game command
    if (payload.type === "startGame") {
      if (this.players.size < 2) {
        return false; // Need more players
      }
      this.gameState.started = true;
      this.gameState.round = 1;

      return {
        type: "gameStarted",
        players: Array.from(this.players.values()).map((p) => p.username),
        round: this.gameState.round,
      };
    }

    // Player moves
    if (payload.type === "move") {
      return {
        type: "playerMove",
        username: player.username,
        position: payload.position,
        round: this.gameState.round,
      };
    }

    return null;
  }

  async getWelcomeMessage(socket) {
    return {
      type: "welcome",
      message: "Welcome to Game Room!",
      room: this.roomName,
      username: socket.playerUsername,
      players: Array.from(this.players.values()).map((p) => p.username),
      gameState: this.gameState,
      instructions: {
        startGame: 'Send {type: "startGame"} to begin',
        move: 'Send {type: "move", position: {x, y}}',
      },
    };
  }

  async getRoomStats(clients) {
    return {
      clients: clients.size,
      players: this.players.size,
      gameStarted: this.gameState.started,
      currentRound: this.gameState.round,
    };
  }

  async onLeave(socket, clientAddress, code, reason) {
    const player = this.players.get(socket);
    if (player) {
      console.log(`[Game] ${player.username} left`);
      this.players.delete(socket);

      // End game if not enough players
      if (this.gameState.started && this.players.size < 2) {
        this.gameState.started = false;
        console.log("[Game] Game ended - not enough players");
      }
    }
  }

  async onHeartbeat() {
    // Auto-advance rounds, cleanup, etc.
    if (this.gameState.started) {
      // Game logic here
    }
  }
}
```

## Testing Your Handler

### 1. Start the Server

```bash
npm start
```

You should see:

```
✓ Registered handler for room: myNewRoom
Room handlers ready: radioContent, chat, myNewRoom
```

### 2. Connect via WebSocket

```javascript
const ws = new WebSocket("ws://localhost:8080/myNewRoom");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received:", data);
};
```

### 3. Check Health Endpoint

```bash
curl http://localhost:8080/health
```

Response shows your room:

```json
{
  "rooms": {
    "myNewRoom": {
      "clients": 1,
      "hasCustomHandler": true
    }
  },
  "registeredHandlers": ["radioContent", "chat", "myNewRoom"]
}
```

### 4. Test HTTP POST

```bash
curl -X POST http://localhost:8080/postcontent/myNewRoom \
  -H 'Content-Type: application/json' \
  -d '{"type":"test","timestamp":"2025-10-14T00:00:00Z","data":{"msg":"hello"}}'
```

## Best Practices

### 1. State Management

Store room-specific state in your handler:

```javascript
constructor() {
  super('myRoom');
  this.messages = [];
  this.users = new Map();
  this.config = { maxUsers: 100 };
}
```

### 2. Error Handling

Always validate and handle errors gracefully:

```javascript
async validateMessage(payload, socket) {
  try {
    // Validation logic
    if (!payload.requiredField) {
      return { error: 'Missing required field' };
    }
    return null;
  } catch (err) {
    console.error('Validation error:', err);
    return { error: 'Validation failed' };
  }
}
```

### 3. Logging

Use consistent logging with room prefix:

```javascript
console.log(`[${this.roomName}] Important event`);
console.error(`[${this.roomName}] Error:`, err);
```

### 4. Resource Cleanup

Clean up resources in `onLeave` and `onHeartbeat`:

```javascript
async onLeave(socket, clientAddress, code, reason) {
  // Remove user data
  this.users.delete(socket);

  // Cancel timers
  if (socket.timer) clearTimeout(socket.timer);
}

async onHeartbeat() {
  // Cleanup old messages
  const cutoff = Date.now() - (24 * 60 * 60 * 1000);
  this.messages = this.messages.filter(m => m.timestamp > cutoff);
}
```

### 5. Security

Always validate user input:

```javascript
async validateMessage(payload, socket) {
  // Sanitize strings
  if (typeof payload.text === 'string') {
    if (payload.text.length > 1000) {
      return { error: 'Text too long' };
    }
  }

  // Check permissions
  if (payload.type === 'admin' && !socket.isAdmin) {
    return { error: 'Permission denied' };
  }

  return null;
}
```

## Room Handler Checklist

When creating a new room handler:

- [ ] Folder created: `src/rooms/yourRoom/`
- [ ] Handler file: `src/rooms/yourRoom/index.js`
- [ ] Extends `BaseRoomHandler`
- [ ] Constructor sets room name
- [ ] Exports handler class
- [ ] Implements required validation
- [ ] Handles state management
- [ ] Provides custom welcome message
- [ ] Includes cleanup logic
- [ ] Tested with real clients
- [ ] Documented special features

## Troubleshooting

### Handler Not Loading

Check that:

1. Folder name matches the room name you want
2. File is named `index.js`
3. Class is exported: `export class YourHandler`
4. Class extends `BaseRoomHandler`
5. No syntax errors (check server logs)

### Clients Rejected

Check:

1. `onJoin()` returns `true` or data (not `false`)
2. No exceptions thrown in `onJoin()`
3. Validation isn't too strict

### Messages Not Broadcasting

Check:

1. `onMessage()` doesn't return `false`
2. `validateMessage()` returns `null` for valid messages
3. No exceptions in message handlers

## Advanced Topics

### Sharing State Between Rooms

Create a shared module:

```javascript
// src/shared/state.js
export const globalState = {
  counters: new Map(),
};
```

Use in handlers:

```javascript
import { globalState } from '../shared/state.js';

async onMessage(payload, socket, clientAddress) {
  globalState.counters.set(this.roomName,
    (globalState.counters.get(this.roomName) || 0) + 1);
  // ...
}
```

### Custom Close Codes

You can close connections with custom codes:

```javascript
async onJoin(socket, req, clientAddress) {
  if (this.isFull()) {
    // Server.js needs to handle this
    socket.shouldClose = { code: 4010, reason: 'Room full' };
    return false;
  }
  return true;
}
```

### Scheduled Tasks

Use `onHeartbeat` for periodic tasks:

```javascript
async onHeartbeat() {
  // Every heartbeat interval (default 30s)
  this.checkTimeouts();
  this.sendPeriodicUpdates();
  this.cleanupResources();
}
```

---

For more examples, see:

- `src/rooms/radioContent/index.js` - Production room
- `src/rooms/chat/index.js` - Interactive room
