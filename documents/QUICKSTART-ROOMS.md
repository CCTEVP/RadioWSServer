# Room-Based WebSocket Server - Quick Start Guide

## What Changed?

Your WebSocket server now supports **room-based routing**! This means:

✅ Multiple applications can use the same server
✅ Messages are only shared within the same room
✅ Clients in different rooms never see each other's messages
✅ Backward compatible - existing clients automatically join "radioContent"

## How to Connect to Rooms

### WebSocket Connections

**Option 1: Via URL path** (recommended)

```javascript
const ws = new WebSocket("ws://localhost:8080/myRoom");
```

**Option 2: Via query parameter**

```javascript
const ws = new WebSocket("ws://localhost:8080?room=myRoom");
```

**Option 3: Default room (radioContent)**

```javascript
const ws = new WebSocket("ws://localhost:8080");
// Automatically joins "radioContent"
```

### HTTP POST Endpoint

**Post to specific room:**

```bash
curl -X POST http://localhost:8080/postcontent/myRoom \
  -H 'Content-Type: application/json' \
  -d '{"type":"update","timestamp":"2025-10-14T00:00:00Z","data":{"status":"active"}}'
```

**Post to default room (radioContent):**

```bash
curl -X POST http://localhost:8080/postcontent \
  -H 'Content-Type: application/json' \
  -d '{"type":"ping","timestamp":"2025-10-14T00:00:00Z","data":{"msg":"hello"}}'
```

## Testing the Server

### Method 1: Using the Test Client (Recommended)

1. Open `test-client.html` in your web browser (double-click it or serve it)
2. Enter server URL: `ws://localhost:8080`
3. Enter room name (e.g., `radioContent`, `myRoom`, `chat`)
4. Click "Connect"
5. Open multiple browser windows/tabs with different rooms to see isolation

### Method 2: Using wscat (Command Line)

**Install wscat:**

```bash
npm install -g wscat
```

**Connect to different rooms:**

```bash
# Terminal 1 - radioContent room
wscat -c ws://localhost:8080/radioContent

# Terminal 2 - radioContent room (will see Terminal 1's messages)
wscat -c ws://localhost:8080/radioContent

# Terminal 3 - myRoom (isolated, won't see radioContent messages)
wscat -c ws://localhost:8080/myRoom
```

### Method 3: Check Health Endpoint

```bash
curl http://localhost:8080/health
```

Response shows all active rooms:

```json
{
  "status": "ok",
  "uptime": 45.2,
  "clients": 5,
  "rooms": {
    "radioContent": 2,
    "myRoom": 2,
    "chat": 1
  }
}
```

## Example Use Cases

### Scenario 1: Radio Content (Existing)

- **Room:** `radioContent` (default)
- **Clients:** Your radio player apps
- **Messages:** Content updates, ad campaigns
- **No changes needed:** Existing clients automatically join this room

### Scenario 2: Chat Application

- **Room:** `chat`
- **Clients:** Chat app users
- **Messages:** User messages, typing indicators
- **Connection:** `ws://localhost:8080/chat`

### Scenario 3: Dashboard

- **Room:** `dashboard`
- **Clients:** Dashboard viewers
- **Messages:** Real-time metrics, alerts
- **Connection:** `ws://localhost:8080/dashboard`

### Scenario 4: Game Lobby

- **Room:** `game-lobby`
- **Clients:** Game players
- **Messages:** Player status, game invites
- **Connection:** `ws://localhost:8080/game-lobby`

## Key Features

✨ **Automatic Room Management**

- Rooms are created when first client joins
- Empty rooms are cleaned up automatically

✨ **Backward Compatible**

- Existing clients work without changes
- Default room is "radioContent"

✨ **Isolated Broadcasting**

- Messages only go to clients in the same room
- No cross-room message leakage

✨ **Room Statistics**

- Health endpoint shows all active rooms
- Client count per room

## Migration Notes

### For Existing Applications

**Good news!** Your existing applications will continue to work without any changes:

```javascript
// This still works - automatically joins "radioContent"
const ws = new WebSocket("ws://your-server.com");
```

### For New Applications

Specify the room you want to use:

```javascript
// New application with explicit room
const ws = new WebSocket("ws://your-server.com/myNewApp");
```

## Testing Checklist

- [ ] Start server: `npm start`
- [ ] Open test-client.html in browser
- [ ] Connect to "radioContent" room
- [ ] Open another browser window, connect to "radioContent"
- [ ] Send message, verify both receive it
- [ ] Open third browser window, connect to "myRoom"
- [ ] Verify "myRoom" doesn't see "radioContent" messages
- [ ] Check health endpoint shows room statistics

## Next Steps

1. **Test locally** with the provided test-client.html
2. **Update your existing clients** (optional - they work as-is)
3. **Create new applications** using different room names
4. **Deploy** to your production environment

---

**Questions or issues?** Check the updated README.md for full documentation.
