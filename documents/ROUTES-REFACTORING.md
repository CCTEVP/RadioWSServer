# Routes Refactoring Summary

## Changes Made

### 1. Moved Generic Routes to Upper Level

- **Old location:** `src/rooms/radio/routes.js` (radio-specific)
- **New location:** `src/rooms/routes.js` (generic for all rooms)

### 2. Updated BaseRoomHandler

- Added default `getRoutes()` implementation that loads generic routes
- All room handlers now inherit generic `/post` endpoint by default
- Room handlers can still override `getRoutes()` for custom routes

### 3. Benefits

✅ **Code Reusability:**

- Single route handler for `/post` endpoint works for ALL rooms
- No need to duplicate route logic in each room

✅ **Consistency:**

- All rooms (radio, chat, future rooms) get the same HTTP POST interface
- Standardized validation and error handling

✅ **Room-Specific Logic:**

- Generic handler delegates to room-specific methods:
  - `handler.validateHttpPost(body)` - Room validates the payload
  - `handler.onHttpPost(broadcastPayload)` - Room processes/modifies payload
  - `broadcastToRoom(handler.roomName, ...)` - Broadcasts to specific room

## File Structure

```
src/rooms/
├── routes.js                    # Generic routes for ALL rooms ⭐ NEW
├── BaseRoomHandler.js          # Base class with default getRoutes()
├── radio/
│   ├── index.js                # RadioHandler (uses generic routes)
│   └── routes.js               # ❌ Can be deleted (old location)
└── chat/
    └── index.js                # ChatHandler (uses generic routes)
```

## How It Works

### For Radio Room:

1. Client sends: `POST /rooms/radio/post` with advertiser token
2. Server loads routes via `RadioHandler.getRoutes()` → inherits from BaseRoomHandler
3. BaseRoomHandler loads `src/rooms/routes.js` (generic routes)
4. Generic route handler calls:
   - `RadioHandler.validateHttpPost()` - Radio-specific validation
   - `RadioHandler.onHttpPost()` - Radio-specific processing
   - `broadcastToRoom("radio", payload)` - Broadcasts to radio room

### For Chat Room (or any future room):

- Same flow as above
- If `ChatHandler` implements `validateHttpPost()` and `onHttpPost()`, it works automatically
- If not implemented, requests return 404 (room doesn't support HTTP posts)

## Testing Results

✅ **POST /postcontent** (backward compatibility bridge):

- Uses advertiser token internally
- Forwards to `/rooms/radio/post`
- **Status:** Working perfectly

✅ **POST /rooms/radio/post** (direct):

- Accepts advertiser token
- Validates and broadcasts content
- **Status:** Working perfectly

⚠️ **POST /rooms/chat/post**:

- Returns 404 (ChatHandler doesn't implement HTTP post methods)
- **Status:** Expected - chat is WebSocket-only example

## Migration Steps for Room Handlers

If a room wants to support HTTP POST:

1. **Implement `validateHttpPost(body)`:**

   ```javascript
   async validateHttpPost(body) {
     // Validate body structure
     // Return { error: "...", code: 422 } if invalid
     // Return null if valid
   }
   ```

2. **Implement `onHttpPost(broadcastPayload)`:**

   ```javascript
   async onHttpPost(broadcastPayload) {
     // Process/modify payload
     // Return modified payload, or null to use original
     // Return false to reject
   }
   ```

3. **That's it!** Generic routes handle everything else.

## Cleanup

The old `src/rooms/radio/routes.js` file can be deleted since:

- RadioHandler now uses generic routes from `src/rooms/routes.js`
- No custom radio-specific routes needed
- All functionality preserved

## Future Enhancements

- New rooms automatically get `/post` endpoint support
- Can add more generic routes (GET, PUT, DELETE) to `src/rooms/routes.js`
- Room handlers can still override `getRoutes()` for completely custom routing
