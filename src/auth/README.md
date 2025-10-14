# Authentication Module

This folder contains the authentication system for the RadioWSServer.

## Structure

- `index.js` - Main authentication module with token generation and verification

## Key Functions

### `generateAuthToken(payload)`

Generates a secure HMAC-SHA256 signed token for client authentication.

**Parameters:**

```javascript
{
  clientId: "user123",      // Required: Unique client identifier
  room: "radioContent",     // Required: Room the client wants to access
  expiresAt: 1234567890,    // Optional: Expiration timestamp (default: 24 hours)
  metadata: {}              // Optional: Additional data
}
```

**Returns:** String token in format `<base64url(payload)>.<base64url(signature)>`

### `verifyAuthToken(token, expectedRoom)`

Verifies a token's signature and validity.

**Parameters:**

- `token` - The token string to verify
- `expectedRoom` - The room name to validate against

**Returns:** Decoded payload object or null if invalid

### `extractToken(req)`

Extracts token from WebSocket upgrade request (query param or header).

### `validateHttpPostAuth(req, expectedRoom)`

Validates authentication for HTTP POST requests.

## Environment Variables

- `AUTH_SECRET` - **Required in production!** Secret key for HMAC signing
  - If not set, a random key is generated (tokens won't persist across restarts)
  - Set via: `$env:AUTH_SECRET='your-secret-key'` (PowerShell)

## Usage Examples

### Generating Tokens (Postman/curl)

```bash
# PowerShell
Invoke-WebRequest -Uri http://localhost:8080/auth/token `
  -Method POST `
  -Body '{"clientId":"user123","room":"radioContent","expiresIn":86400000}' `
  -ContentType 'application/json'

# curl
curl -X POST http://localhost:8080/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"clientId":"user123","room":"radioContent","expiresIn":86400000}'
```

### Using Tokens

**WebSocket:**

```
ws://localhost:8080/roomName?token=YOUR_TOKEN
```

**HTTP POST:**

```bash
curl -X POST http://localhost:8080/radioContent/postcontent \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"type":"test","timestamp":"2025-10-14T00:00:00Z","data":{"message":"hello"}}'
```

## Non-Expiring Tokens (For Automation)

For automated connections (services, bots, monitoring tools), you can create tokens that never expire or expire far in the future.

### Method 1: Very Long Expiration (Recommended)

Set expiration to a date far in the future (e.g., 100 years):

**PowerShell:**

```powershell
# Calculate 100 years in milliseconds
$hundredYears = 100 * 365 * 24 * 60 * 60 * 1000

Invoke-WebRequest -Uri http://localhost:8080/auth/token `
  -Method POST `
  -Body "{`"clientId`":`"automation-bot`",`"room`":`"radio`",`"expiresIn`":$hundredYears}" `
  -ContentType 'application/json'
```

**curl:**

```bash
# 100 years in milliseconds: 3153600000000
curl -X POST http://localhost:8080/auth/token \
  -H 'Content-Type: application/json' \
  -d '{
    "clientId": "automation-bot",
    "room": "radio",
    "expiresIn": 3153600000000
  }'
```

### Method 2: Specific Far-Future Date

Set expiration to a specific far-future timestamp:

**PowerShell:**

```powershell
# Set expiration to January 1, 2100
$futureDate = [DateTimeOffset]::Parse("2100-01-01T00:00:00Z").ToUnixTimeMilliseconds()

$body = @{
  clientId = "automation-service"
  room = "radio"
  expiresIn = $futureDate - [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:8080/auth/token `
  -Method POST `
  -Body $body `
  -ContentType 'application/json'
```

### Method 3: Programmatic Token Generation

For complete control, generate tokens programmatically:

```javascript
import { generateAuthToken } from "./src/auth/index.js";

// Token that expires in 100 years
const token = generateAuthToken({
  clientId: "automation-bot",
  room: "radio",
  expiresAt: Date.now() + 100 * 365 * 24 * 60 * 60 * 1000, // 100 years
  metadata: {
    purpose: "automated-posting",
    service: "content-scheduler",
  },
});

console.log("Long-lived token:", token);
```

### Storing Long-Lived Tokens

**Environment Variable (Recommended):**

```powershell
# PowerShell
$env:RADIO_BOT_TOKEN='eyJjbGllbnRJZCI6ImF1dG9tYXRpb24tYm90...'

# Use in scripts
$token = $env:RADIO_BOT_TOKEN
```

**Configuration File:**

```json
{
  "automation": {
    "radio": {
      "token": "eyJjbGllbnRJZCI6ImF1dG9tYXRpb24tYm90...",
      "clientId": "automation-bot"
    }
  }
}
```

### Usage Example - Automated Posting

**PowerShell Script:**

```powershell
# automation-post.ps1
$token = $env:RADIO_BOT_TOKEN

$body = @{
  type = 'automated-update'
  timestamp = (Get-Date).ToUniversalTime().ToString('o')
  data = @{
    content = @{
      id = (New-Guid).ToString()
      message = 'Automated content post'
    }
  }
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8080/radio/post `
  -Method POST `
  -Body $body `
  -ContentType 'application/json' `
  -Headers @{Authorization="Bearer $token"}
```

**Node.js Script:**

```javascript
// automation-bot.js
const token = process.env.RADIO_BOT_TOKEN;

async function postToRadio(content) {
  const response = await fetch("http://localhost:8080/radio/post", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "automated-update",
      timestamp: new Date().toISOString(),
      data: { content },
    }),
  });

  return response.json();
}

// Use it
postToRadio({ id: "123", message: "Auto post" })
  .then((result) => console.log("Posted:", result))
  .catch((err) => console.error("Error:", err));
```

### Security Best Practices for Long-Lived Tokens

1. **Secure Storage**

   - Store in environment variables or secure vaults
   - Never commit to version control
   - Use file permissions to restrict access

2. **Unique Client IDs**

   - Use descriptive IDs: `automation-bot`, `scheduler-service`
   - Makes it easy to identify and revoke specific tokens

3. **Metadata Tracking**

   - Include purpose, service name, creation date in metadata
   - Helps with auditing and management

4. **Token Rotation**

   - Even long-lived tokens should be rotated periodically
   - Set calendar reminders (e.g., annually)

5. **Monitor Usage**

   - Log automated connections separately
   - Set up alerts for unusual activity

6. **Revocation Strategy**
   - To revoke: Change `AUTH_SECRET` (all tokens invalidated)
   - For selective revocation: Track tokens in database (future enhancement)

## Security Notes

1. **Always set AUTH_SECRET in production**
2. Tokens are room-specific (can't be used for other rooms)
3. Tokens expire after specified time (default: 24 hours, can be extended)
4. Use HTTPS/WSS in production to protect tokens in transit
5. Never commit AUTH_SECRET or tokens to version control
6. Long-lived tokens require extra security measures (see above)

## Token Format

```
eyJjbGllbnRJZCI6InVzZXIxMjMi...<payload>.abc123...<signature>
```

Payload contains:

```json
{
  "clientId": "user123",
  "room": "radioContent",
  "expiresAt": 1729000000000,
  "issuedAt": 1728900000000,
  "metadata": {}
}
```
