# Automation Quick Start Guide

## Creating a Non-Expiring Token for Automated Connections

### Quick Command (PowerShell)

```powershell
# Generate a token that expires in 100 years
$hundredYears = 100 * 365 * 24 * 60 * 60 * 1000
$response = Invoke-WebRequest -Uri http://localhost:8080/auth/token `
  -Method POST `
  -Body "{`"clientId`":`"automation-bot`",`"room`":`"radio`",`"expiresIn`":$hundredYears}" `
  -ContentType 'application/json'

$tokenData = $response.Content | ConvertFrom-Json
$token = $tokenData.token

Write-Host "✅ Long-lived token created!"
Write-Host "Token: $token"
Write-Host "Expires: $($tokenData.expiresAt)"
Write-Host ""
Write-Host "Save this token securely:"
Write-Host "`$env:RADIO_BOT_TOKEN='$token'"
```

### Quick Command (curl/bash)

```bash
# Generate a token that expires in 100 years (3153600000000 ms)
curl -X POST http://localhost:8080/auth/token \
  -H 'Content-Type: application/json' \
  -d '{
    "clientId": "automation-bot",
    "room": "radio",
    "expiresIn": 3153600000000
  }' | jq -r '.token'

# Save to environment
export RADIO_BOT_TOKEN='your-token-here'
```

## Using the Token

### WebSocket Connection

```javascript
const WebSocket = require("ws");
const token = process.env.RADIO_BOT_TOKEN;

const ws = new WebSocket(`ws://localhost:8080/radio?token=${token}`);

ws.on("open", () => {
  console.log("✅ Connected to radio room");

  // Send a message
  ws.send(
    JSON.stringify({
      type: "automated-message",
      timestamp: new Date().toISOString(),
      data: { content: { id: "123", message: "Hello from bot!" } },
    })
  );
});

ws.on("message", (data) => {
  console.log("Received:", data.toString());
});

ws.on("error", (error) => {
  console.error("WebSocket error:", error);
});
```

### HTTP POST

```powershell
# PowerShell
$token = $env:RADIO_BOT_TOKEN

$body = @{
  type = 'automated-update'
  timestamp = (Get-Date).ToUniversalTime().ToString('o')
  data = @{
    content = @{
      id = (New-Guid).ToString()
      message = 'Automated content'
    }
  }
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:8080/radio/post `
  -Method POST `
  -Body $body `
  -ContentType 'application/json' `
  -Headers @{Authorization="Bearer $token"}
```

```bash
# curl
curl -X POST http://localhost:8080/radio/post \
  -H "Authorization: Bearer $RADIO_BOT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "automated-update",
    "timestamp": "2025-10-14T10:00:00Z",
    "data": {
      "content": {
        "id": "123",
        "message": "Automated content"
      }
    }
  }'
```

## Complete Automation Examples

### Example 1: Scheduled Task (PowerShell)

```powershell
# scheduled-post.ps1
# Run this with Windows Task Scheduler

param(
  [string]$Token = $env:RADIO_BOT_TOKEN,
  [string]$ServerUrl = "http://localhost:8080"
)

function Post-RadioContent {
  param([string]$Message)

  $body = @{
    type = 'scheduled-content'
    timestamp = (Get-Date).ToUniversalTime().ToString('o')
    data = @{
      content = @{
        id = (New-Guid).ToString()
        message = $Message
        source = 'automation'
      }
    }
  } | ConvertTo-Json -Depth 10

  try {
    $response = Invoke-WebRequest `
      -Uri "$ServerUrl/radio/post" `
      -Method POST `
      -Body $body `
      -ContentType 'application/json' `
      -Headers @{Authorization="Bearer $Token"}

    Write-Host "✅ Posted successfully: $Message"
    return $true
  }
  catch {
    Write-Error "❌ Failed to post: $_"
    return $false
  }
}

# Main execution
Write-Host "Starting automated radio post..."
Post-RadioContent -Message "Scheduled update at $(Get-Date)"
```

### Example 2: Monitoring Service (Node.js)

```javascript
// radio-monitor.js
const WebSocket = require("ws");

const config = {
  token: process.env.RADIO_BOT_TOKEN,
  server: "ws://localhost:8080",
  room: "radio",
  reconnectDelay: 5000,
};

class RadioMonitor {
  constructor() {
    this.ws = null;
    this.reconnectTimeout = null;
  }

  connect() {
    const url = `${config.server}/${config.room}?token=${config.token}`;

    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      console.log("✅ Connected to radio room");
      this.onConnect();
    });

    this.ws.on("message", (data) => {
      this.handleMessage(JSON.parse(data.toString()));
    });

    this.ws.on("close", () => {
      console.log("⚠️  Disconnected. Reconnecting...");
      this.scheduleReconnect();
    });

    this.ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error.message);
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, config.reconnectDelay);
  }

  onConnect() {
    // Send heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "heartbeat",
            timestamp: new Date().toISOString(),
            data: { clientId: "monitor-service" },
          })
        );
      }
    }, 30000);
  }

  handleMessage(message) {
    console.log("📩 Received:", message.type);

    // Your monitoring logic here
    if (message.type === "error") {
      console.error("⚠️  Error message:", message);
      // Send alert, log to monitoring system, etc.
    }
  }

  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Start the monitor
const monitor = new RadioMonitor();
monitor.connect();

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down...");
  monitor.disconnect();
  process.exit(0);
});
```

### Example 3: Cron Job (Linux/Mac)

```bash
#!/bin/bash
# /usr/local/bin/radio-post.sh

TOKEN="${RADIO_BOT_TOKEN}"
SERVER="http://localhost:8080"

# Generate content
MESSAGE="Automated update at $(date -Iseconds)"
ID=$(uuidgen)

# Post to radio
curl -X POST "$SERVER/radio/post" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"type\": \"cron-job\",
    \"timestamp\": \"$(date -Iseconds)\",
    \"data\": {
      \"content\": {
        \"id\": \"$ID\",
        \"message\": \"$MESSAGE\"
      }
    }
  }"

echo "Posted to radio room"
```

Add to crontab:

```bash
# Edit crontab
crontab -e

# Run every hour
0 * * * * /usr/local/bin/radio-post.sh >> /var/log/radio-post.log 2>&1

# Run every 15 minutes
*/15 * * * * /usr/local/bin/radio-post.sh >> /var/log/radio-post.log 2>&1
```

## Testing Your Token

Quick test to verify your token works:

```powershell
# PowerShell
$token = $env:RADIO_BOT_TOKEN

# Test HTTP POST
$testBody = @{
  type = 'test'
  timestamp = (Get-Date).ToUniversalTime().ToString('o')
  data = @{ content = @{ id = 'test-123'; message = 'Token test' } }
} | ConvertTo-Json -Depth 10

$response = Invoke-WebRequest `
  -Uri http://localhost:8080/radio/post `
  -Method POST `
  -Body $testBody `
  -ContentType 'application/json' `
  -Headers @{Authorization="Bearer $token"}

if ($response.StatusCode -eq 200) {
  Write-Host "✅ Token is valid and working!"
  $response.Content | ConvertFrom-Json | ConvertTo-Json
} else {
  Write-Host "❌ Token test failed"
}
```

## Troubleshooting

### "Authentication required" error

- Verify token is not expired: check `expiresAt` field
- Ensure `Authorization: Bearer TOKEN` header is included
- Check that AUTH_SECRET hasn't changed on server

### "Token not valid for this room" error

- Token was generated for a different room
- Generate new token with correct room name

### Connection drops after some time

- Implement reconnection logic (see monitoring example)
- Send periodic heartbeat/ping messages
- Check network stability

## Security Checklist

- [ ] Token stored in environment variable (not hardcoded)
- [ ] Token not committed to git
- [ ] Using HTTPS/WSS in production
- [ ] Unique clientId for each automation service
- [ ] Logging enabled for audit trail
- [ ] Token rotation plan in place
- [ ] Error handling and alerting configured

## Next Steps

1. Generate your long-lived token
2. Store it securely in environment variable
3. Test the connection
4. Implement your automation logic
5. Set up monitoring and error handling
6. Schedule token rotation (annually recommended)
