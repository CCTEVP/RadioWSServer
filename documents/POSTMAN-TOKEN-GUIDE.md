# Generate Tokens with Postman

## Quick Guide: Generate Infinite Token

### Step 1: Create New Request

1. Open Postman
2. Click **"New"** → **"HTTP Request"**
3. Or use existing collection

### Step 2: Configure Request

**Method:** `POST`

**URL:** `http://localhost:8080/auth/token`

**Headers:**

- Key: `Content-Type`
- Value: `application/json`

**Body:**

- Select **"raw"**
- Select **"JSON"** from dropdown

### Step 3: Request Body for Infinite Token

```json
{
  "clientId": "my-automation-bot",
  "room": "radio",
  "expiresIn": 3153600000000
}
```

**What is `3153600000000`?**

- This is 100 years in milliseconds
- 100 years × 365 days × 24 hours × 60 minutes × 60 seconds × 1000 milliseconds
- Effectively "infinite" for practical purposes
- Token expires: **October 2125** 🚀

### Step 4: Send Request

Click **"Send"** button

### Step 5: Response

You'll receive:

```json
{
  "token": "eyJjbGllbnRJZCI6Im15LWF1dG9tYXRpb24tYm90Iiwi...very-long-token",
  "clientId": "my-automation-bot",
  "room": "radio",
  "expiresAt": "2125-10-11T12:30:00.000Z"
}
```

**Save the `token` value!** This is your authentication token.

---

## Complete Postman Setup (Screenshots in Text)

### Request Configuration

```
┌─────────────────────────────────────────────────────────┐
│  POST  http://localhost:8080/auth/token          [Send] │
├─────────────────────────────────────────────────────────┤
│  Params  Authorization  Headers  Body  Pre-request  ... │
├─────────────────────────────────────────────────────────┤
│  Headers                                          [Bulk] │
│  ┌──────────────────────┬──────────────────────┬────┐  │
│  │ Key                  │ Value                │ ✓  │  │
│  ├──────────────────────┼──────────────────────┼────┤  │
│  │ Content-Type         │ application/json     │ ✓  │  │
│  └──────────────────────┴──────────────────────┴────┘  │
└─────────────────────────────────────────────────────────┘
```

### Body Configuration

```
┌─────────────────────────────────────────────────────────┐
│  Body                                                    │
├─────────────────────────────────────────────────────────┤
│  ⚪ none  ⚪ form-data  ⚪ x-www-form-urlencoded         │
│  🔘 raw   ⚪ binary    ⚪ GraphQL                        │
│                                                          │
│  Text ▼  [JSON]  ← Select this dropdown                 │
├─────────────────────────────────────────────────────────┤
│  {                                                       │
│    "clientId": "my-automation-bot",                      │
│    "room": "radio",                                      │
│    "expiresIn": 3153600000000                            │
│  }                                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Different Token Durations

### 1. Infinite Token (100 years)

```json
{
  "clientId": "automation-service",
  "room": "radio",
  "expiresIn": 3153600000000
}
```

**Use for:** Automation scripts, services, bots

### 2. Long-lived Token (1 year)

```json
{
  "clientId": "monitoring-tool",
  "room": "radio",
  "expiresIn": 31536000000
}
```

**Use for:** Long-running monitoring, scheduled tasks

### 3. Medium Token (30 days)

```json
{
  "clientId": "test-client",
  "room": "radio",
  "expiresIn": 2592000000
}
```

**Use for:** Development, testing

### 4. Short Token (1 hour)

```json
{
  "clientId": "web-user",
  "room": "radio",
  "expiresIn": 3600000
}
```

**Use for:** Web applications, temporary access

### 5. Very Short Token (5 minutes)

```json
{
  "clientId": "demo-user",
  "room": "radio",
  "expiresIn": 300000
}
```

**Use for:** Demos, testing, high-security scenarios

---

## Duration Reference Table

| Duration      | Milliseconds          | JSON Value          | Expires     |
| ------------- | --------------------- | ------------------- | ----------- |
| 5 minutes     | 300,000               | `300000`            | 5 min       |
| 1 hour        | 3,600,000             | `3600000`           | 1 hour      |
| 1 day         | 86,400,000            | `86400000`          | Tomorrow    |
| 1 week        | 604,800,000           | `604800000`         | Next week   |
| 30 days       | 2,592,000,000         | `2592000000`        | Next month  |
| 1 year        | 31,536,000,000        | `31536000000`       | Next year   |
| 10 years      | 315,360,000,000       | `315360000000`      | 2035        |
| **100 years** | **3,153,600,000,000** | **`3153600000000`** | **2125** ⭐ |

---

## Calculate Custom Duration

### Formula

```
milliseconds = days × 24 × 60 × 60 × 1000
```

### Examples

**7 days:**

```
7 × 24 × 60 × 60 × 1000 = 604,800,000
```

**90 days:**

```
90 × 24 × 60 × 60 × 1000 = 7,776,000,000
```

**5 years:**

```
5 × 365 × 24 × 60 × 60 × 1000 = 157,680,000,000
```

---

## Using Your Token

Once you have the token, use it in two ways:

### Method 1: WebSocket URL Parameter

```
ws://localhost:8080/radio?token=YOUR_TOKEN_HERE
```

### Method 2: HTTP Authorization Header

**For Postman:**

1. Create new POST request to: `http://localhost:8080/rooms/radio/post`
2. **Headers** tab:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`
3. **Body** (raw JSON):
   ```json
   {
     "type": "notification",
     "message": "Test from Postman"
   }
   ```

---

## Testing Your Token in Postman

### Test 1: Generate Token

**Request:**

```
POST http://localhost:8080/auth/token
Content-Type: application/json

{
  "clientId": "postman-test",
  "room": "radio",
  "expiresIn": 3153600000000
}
```

**Expected Response:**

```json
{
  "token": "eyJjbGllbnRJZCI6InBvc3RtYW4tdGVzdCIsInJvb...",
  "clientId": "postman-test",
  "room": "radio",
  "expiresAt": "2125-10-11T..."
}
```

✅ **Copy the `token` value**

### Test 2: Use Token to Post Content

**Request:**

```
POST http://localhost:8080/radio/post
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "type": "announcement",
  "message": "Hello from Postman!",
  "data": {
    "priority": "high"
  }
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Content broadcasted to 0 client(s) in room: radio"
}
```

✅ **Success!**

---

## Save Token for Reuse

### Option 1: Postman Environment Variables

1. Click **"Environments"** (top right)
2. Create new environment (e.g., "RadioWS Dev")
3. Add variable:
   - Variable: `AUTH_TOKEN`
   - Initial Value: `your-token-here`
   - Current Value: `your-token-here`
4. Save

**Usage in requests:**

```
Authorization: Bearer {{AUTH_TOKEN}}
```

### Option 2: Postman Collection Variables

1. Right-click your collection → **"Edit"**
2. Go to **"Variables"** tab
3. Add variable:
   - Variable: `auth_token`
   - Initial Value: `your-token-here`
   - Current Value: `your-token-here`
4. Save

**Usage in requests:**

```
Authorization: Bearer {{auth_token}}
```

### Option 3: Save to File

1. Copy token from response
2. Save to `token.txt` in your project folder
3. Reference when needed

---

## Complete Postman Collection Example

### 1. Generate Infinite Token

```
POST http://localhost:8080/auth/token
Headers:
  Content-Type: application/json
Body:
{
  "clientId": "postman-user",
  "room": "radio",
  "expiresIn": 3153600000000
}
```

### 2. Post Content (Using Token)

```
POST http://localhost:8080/radio/post
Headers:
  Authorization: Bearer {{auth_token}}
  Content-Type: application/json
Body:
{
  "type": "message",
  "message": "Test broadcast"
}
```

### 3. Post with Metadata

```
POST http://localhost:8080/radio/post
Headers:
  Authorization: Bearer {{auth_token}}
  Content-Type: application/json
Body:
{
  "type": "song",
  "message": "Now Playing",
  "data": {
    "title": "Song Name",
    "artist": "Artist Name",
    "duration": 240
  }
}
```

---

## Troubleshooting

### Error: "Authentication required"

**Cause:** Missing or invalid token

**Fix:**

- Check `Authorization` header is present
- Format: `Bearer YOUR_TOKEN_HERE` (note the space after "Bearer")
- Verify token is not expired

### Error: "Invalid token"

**Cause:** Token signature invalid or corrupted

**Fix:**

- Generate a new token
- Don't modify the token string
- Copy entire token including all characters

### Error: "Token expired"

**Cause:** Token expiration time passed

**Fix:**

- Generate new token with longer `expiresIn`
- Use 100-year token for automation

### Error: "Invalid room"

**Cause:** Token room doesn't match endpoint room

**Fix:**

- Check token was generated for correct room: `"room": "radio"`
- Use token only with `/radio/*` endpoints

### Server not responding

**Cause:** Server not running

**Fix:**

```powershell
npm start
```

---

## Security Best Practices

### ✅ DO:

- Keep tokens private (don't commit to git)
- Use environment variables for production
- Generate separate tokens for different services
- Use shorter expiration for user tokens
- Use HTTPS in production

### ❌ DON'T:

- Share tokens publicly
- Store in client-side code (web browsers)
- Use same token for multiple unrelated services
- Commit tokens to version control
- Use infinite tokens for user-facing apps

---

## Quick Reference

**Infinite Token Request:**

```json
POST http://localhost:8080/auth/token
Content-Type: application/json

{
  "clientId": "my-bot",
  "room": "radio",
  "expiresIn": 3153600000000
}
```

**Use Token:**

```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Token expires:** 2125 (100 years from now) 🚀

---

## Related Documentation

- `TOKEN-STORAGE-EXPLAINED.md` - How tokens work internally
- `AUTOMATION-GUIDE.md` - Using tokens in automation scripts
- `src/auth/README.md` - Authentication module documentation
