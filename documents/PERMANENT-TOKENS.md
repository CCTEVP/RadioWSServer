# Permanent Authentication Tokens

This document lists the hardcoded permanent tokens for trusted clients. These tokens never expire and bypass all authentication checks.

## 🔑 Available Tokens

### 1. Screen Token

**Role:** Display screens / Receivers  
**Client ID:** `screen`  
**Purpose:** For radio screens that display content  
**Token:**

```
eyJjbGllbnRJZCI6InNjcmVlbiIsInJvb20iOiJyYWRpbyIsImV4cGlyZXNBdCI6NDkxNDEyMTU2NjQ2NCwibWV0YWRhdGEiOnsicm9sZSI6InNjcmVlbiIsInZhbGlkaXR5IjoiTm8gZXhwaXJhdGlvbiJ9LCJpc3N1ZWRBdCI6MTc2MDUyMTU2NjQ2NH0.zQyP4dYvPxMxGN_L5r8QJ4bZhE8aF7wKj2XnRiC9hgM
```

**Usage:**

```bash
# WebSocket connection
ws://localhost:8080/rooms/radio?token=eyJjbGllbnRJZCI6InNjcmVlbiIsInJvb20iOiJyYWRpbyIsImV4cGlyZXNBdCI6NDkxNDEyMTU2NjQ2NCwibWV0YWRhdGEiOnsicm9sZSI6InNjcmVlbiIsInZhbGlkaXR5IjoiTm8gZXhwaXJhdGlvbiJ9LCJpc3N1ZWRBdCI6MTc2MDUyMTU2NjQ2NH0.zQyP4dYvPxMxGN_L5r8QJ4bZhE8aF7wKj2XnRiC9hgM

# HTTP POST
curl -X POST http://localhost:8080/rooms/radio/post \
  -H "Authorization: Bearer eyJjbGllbnRJZCI6InNjcmVlbiIsInJvb20iOiJyYWRpbyIsImV4cGlyZXNBdCI6NDkxNDEyMTU2NjQ2NCwibWV0YWRhdGEiOnsicm9sZSI6InNjcmVlbiIsInZhbGlkaXR5IjoiTm8gZXhwaXJhdGlvbiJ9LCJpc3N1ZWRBdCI6MTc2MDUyMTU2NjQ2NH0.zQyP4dYvPxMxGN_L5r8QJ4bZhE8aF7wKj2XnRiC9hgM" \
  -H "Content-Type: application/json" \
  -d '{"type":"post","timestamp":"2025-10-17T00:00:00Z","data":{"content":{"id":"123","name":"Test"}}}'
```

---

### 2. Advertiser Token

**Role:** Content publishers / Advertisers  
**Client ID:** `advertiser`  
**Purpose:** For posting advertising content to radio screens  
**Token:**

```
eyJjbGllbnRJZCI6ImFkdmVydGlzZXIiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJhZHZlcnRpc2VyIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.K7jX9mNvL4pRnQwS8tYc1UhA6fBgE3qJsW2oZxI5kDv
```

**Usage:**

```bash
# WebSocket connection
ws://localhost:8080/rooms/radio?token=eyJjbGllbnRJZCI6ImFkdmVydGlzZXIiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJhZHZlcnRpc2VyIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.K7jX9mNvL4pRnQwS8tYc1UhA6fBgE3qJsW2oZxI5kDv

# HTTP POST
curl -X POST http://localhost:8080/rooms/radio/post \
  -H "Authorization: Bearer eyJjbGllbnRJZCI6ImFkdmVydGlzZXIiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJhZHZlcnRpc2VyIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.K7jX9mNvL4pRnQwS8tYc1UhA6fBgE3qJsW2oZxI5kDv" \
  -H "Content-Type: application/json" \
  -d '{"type":"post","timestamp":"2025-10-17T00:00:00Z","data":{"content":{"id":"456","name":"Ad Content"},"advertiser":{"id":"3","name":"Total Radio"}}}'
```

---

### 3. Control Token

**Role:** Administrative control / Management  
**Client ID:** `control`  
**Purpose:** For administrative tasks and system control  
**Token:**

```
eyJjbGllbnRJZCI6ImNvbnRyb2wiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJjb250cm9sIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.P3mH8nRwT6jKbVxZ9sLq2YdF5aGtC4wJoX1yNiE7uMp
```

**Usage:**

```bash
# WebSocket connection
ws://localhost:8080/rooms/radio?token=eyJjbGllbnRJZCI6ImNvbnRyb2wiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJjb250cm9sIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.P3mH8nRwT6jKbVxZ9sLq2YdF5aGtC4wJoX1yNiE7uMp

# HTTP POST
curl -X POST http://localhost:8080/rooms/radio/post \
  -H "Authorization: Bearer eyJjbGllbnRJZCI6ImNvbnRyb2wiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJjb250cm9sIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.P3mH8nRwT6jKbVxZ9sLq2YdF5aGtC4wJoX1yNiE7uMp" \
  -H "Content-Type: application/json" \
  -d '{"type":"control","timestamp":"2025-10-17T00:00:00Z","data":{"command":"refresh"}}'
```

---

## 🔒 Token Payload Structure

All permanent tokens share the same structure:

```json
{
  "clientId": "screen|advertiser|control",
  "room": "radio",
  "expiresAt": 4914121566464,
  "metadata": {
    "role": "screen|advertiser|control",
    "validity": "No expiration"
  },
  "issuedAt": 1760521566464
}
```

- **expiresAt**: Far-future timestamp (year 2125)
- **issuedAt**: Original token generation timestamp
- **metadata.role**: Identifies the token's purpose
- **metadata.validity**: Indicates permanent validity

---

## ⚠️ Security Notes

1. **These tokens are hardcoded** in `src/auth/index.js`
2. **They never expire** and bypass all authentication checks
3. **Keep them secure** - treat them like production passwords
4. **Different roles** help identify clients in monitoring
5. **Use regular tokens** for temporary access

---

## 📊 Health Endpoint

When using these tokens, each will appear with its unique client ID:

```bash
curl http://localhost:8080/health?detailed=true
```

Response will show:

```json
{
  "rooms": {
    "radio": {
      "clients": {
        "total": 3,
        "details": [
          {"id": "screen", "connected": "5m 30s", ...},
          {"id": "advertiser", "connected": "3m 15s", ...},
          {"id": "control", "connected": "1m 45s", ...}
        ]
      }
    }
  }
}
```

---

## 🔄 Token Generation (For Reference)

These tokens were generated using the server's token generation logic but with far-future expiration.

**Note:** The actual signature doesn't matter since they're hardcoded and bypass verification. The important part is the payload structure that gets returned.

---

## 📝 Best Practices

1. **Screen tokens** → Use for display devices that only receive content
2. **Advertiser tokens** → Use for systems that post advertising content
3. **Control tokens** → Use for admin panels and management systems
4. **Regular tokens** → Use `/auth/token` endpoint for temporary access (1-hour expiration)

---

## 🚀 Quick Reference

| Role           | Client ID    | Primary Use     | Can Post | Can Receive |
| -------------- | ------------ | --------------- | -------- | ----------- |
| **screen**     | `screen`     | Display screens | ✅       | ✅          |
| **advertiser** | `advertiser` | Content posting | ✅       | ✅          |
| **control**    | `control`    | Admin control   | ✅       | ✅          |

All three tokens have full access to the radio room. Role differentiation is primarily for identification and monitoring purposes.
