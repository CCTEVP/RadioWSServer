# Quick Reference: Room Handlers

## 🚀 Create New Room (3 Steps)

```bash
# 1. Create folder
mkdir src/rooms/myRoom

# 2. Create handler
cat > src/rooms/myRoom/index.js << 'EOF'
import { BaseRoomHandler } from '../BaseRoomHandler.js';

export class MyRoomHandler extends BaseRoomHandler {
  constructor() {
    super('myRoom');
  }
}
EOF

# 3. Restart server
npm start
```

## 📝 Common Override Methods

```javascript
import { BaseRoomHandler } from "../BaseRoomHandler.js";

export class MyRoomHandler extends BaseRoomHandler {
  constructor() {
    super("myRoom");
    this.myData = new Map(); // Your state
  }

  // Accept/reject connections
  async onJoin(socket, req, clientAddress) {
    // Check auth, limits, etc.
    return true; // or false to reject
  }

  // Cleanup when client leaves
  async onLeave(socket, clientAddress, code, reason) {
    this.myData.delete(socket);
  }

  // Validate WebSocket messages
  async validateMessage(payload, socket) {
    if (!payload.requiredField) {
      return { error: "Missing field" };
    }
    return null; // Accept
  }

  // Process WebSocket messages
  async onMessage(payload, socket, clientAddress) {
    // Transform message
    return {
      ...payload,
      username: socket.username,
      timestamp: new Date().toISOString(),
    };
  }

  // Validate HTTP POST
  async validateHttpPost(payload) {
    if (!payload.data.id) {
      return { error: "ID required", code: 422 };
    }
    return null;
  }

  // Process HTTP POST
  async onHttpPost(payload) {
    // Add metadata
    return {
      ...payload,
      processedBy: this.roomName,
    };
  }

  // Custom welcome message
  async getWelcomeMessage(socket) {
    return {
      type: "welcome",
      message: "Welcome to My Room!",
      room: this.roomName,
      customInfo: this.getCustomInfo(),
    };
  }

  // Room statistics
  async getRoomStats(clients) {
    return {
      clients: clients.size,
      customMetric: this.myData.size,
    };
  }

  // Periodic tasks (runs with heartbeat)
  async onHeartbeat() {
    this.cleanup();
  }
}
```

## 🎯 Return Values Guide

| Method                | Return          | Meaning              |
| --------------------- | --------------- | -------------------- |
| `onJoin()`            | `true`          | Accept connection    |
|                       | `false`         | Reject connection    |
|                       | `{data}`        | Accept + attach data |
| `validateMessage()`   | `null`          | Valid message        |
|                       | `{error}`       | Reject message       |
| `onMessage()`         | `null`          | Use default enriched |
|                       | `{...}`         | Use custom payload   |
|                       | `false`         | Suppress broadcast   |
| `validateHttpPost()`  | `null`          | Valid                |
|                       | `{error, code}` | Reject with code     |
| `onHttpPost()`        | `null`          | Use original         |
|                       | `{...}`         | Use custom payload   |
|                       | `false`         | Reject               |
| `getWelcomeMessage()` | `null`          | Use default          |
|                       | `{...}`         | Custom welcome       |

## 🔍 Testing Commands

```bash
# Start server
npm start

# Check health (shows rooms)
curl http://localhost:8080/health

# Connect to room
wscat -c ws://localhost:8080/myRoom

# POST to room
curl -X POST http://localhost:8080/postcontent/myRoom \
  -H 'Content-Type: application/json' \
  -d '{"type":"test","timestamp":"2025-10-14T00:00:00Z","data":{"msg":"hi"}}'
```

## 📂 File Locations

| Item              | Path                           |
| ----------------- | ------------------------------ |
| Your room handler | `src/rooms/myRoom/index.js`    |
| Base class        | `src/rooms/BaseRoomHandler.js` |
| Room registry     | `src/rooms/index.js`           |
| Main server       | `src/server.js`                |

## 📚 Documentation

| Document                       | Purpose          |
| ------------------------------ | ---------------- |
| `ROOM-HANDLER-GUIDE.md`        | Complete guide   |
| `ROOM-ARCHITECTURE-SUMMARY.md` | Overview         |
| `ARCHITECTURE-DIAGRAM.md`      | Visual diagrams  |
| `QUICKSTART-ROOMS.md`          | Basic room usage |

## 🔑 Key Concepts

**Rooms are isolated:**

- Messages only go to clients in same room
- Each room has its own handler instance
- Handlers can store room-specific state

**Handlers are discovered automatically:**

- Just create `src/rooms/yourRoom/index.js`
- Export a class extending `BaseRoomHandler`
- Server finds it on startup

**Override only what you need:**

- All methods have defaults
- Only override for custom behavior
- Common logic stays in base class

## 💡 Common Patterns

### Store user data on socket

```javascript
async onJoin(socket, req, clientAddress) {
  socket.userData = {
    username: 'anonymous',
    joinedAt: Date.now(),
  };
  return true;
}
```

### Track room state

```javascript
constructor() {
  super('myRoom');
  this.messages = [];
  this.users = new Map();
}
```

### Require authentication

```javascript
async onJoin(socket, req, clientAddress) {
  const token = new URL(req.url, 'http://host')
    .searchParams.get('token');

  if (!this.validateToken(token)) {
    return false; // Reject
  }

  socket.authToken = token;
  return true;
}
```

### Add username to messages

```javascript
async onMessage(payload, socket, clientAddress) {
  return {
    ...payload,
    username: socket.userData?.username || 'Anonymous',
    timestamp: new Date().toISOString(),
  };
}
```

### Validate message structure

```javascript
async validateMessage(payload, socket) {
  if (payload.type === 'chat') {
    if (!payload.text || payload.text.length > 500) {
      return { error: 'Invalid chat message' };
    }
  }
  return null;
}
```

## ⚡ Examples in Codebase

### RadioContent Handler

- Content history tracking
- Content validation
- Custom statistics
- **Location:** `src/rooms/radioContent/index.js`

### Chat Handler

- Username management
- Message filtering
- User list tracking
- Typing indicators
- **Location:** `src/rooms/chat/index.js`

## 🐛 Common Issues

**Handler not loading?**

- Check file is `index.js`
- Verify class is exported
- Ensure it extends `BaseRoomHandler`

**Clients rejected?**

- Check `onJoin()` returns `true`
- Look for exceptions in handler

**Messages not broadcasting?**

- Check `onMessage()` doesn't return `false`
- Verify `validateMessage()` returns `null`

## 📞 Need Help?

1. Read full guide: `ROOM-HANDLER-GUIDE.md`
2. Check examples: `src/rooms/radioContent/` and `src/rooms/chat/`
3. Review base class: `src/rooms/BaseRoomHandler.js`
