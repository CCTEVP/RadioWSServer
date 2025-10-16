# Generate long-lived tokens for testing
# These tokens will work forever (100 years) and across all server restarts
# IF you have AUTH_SECRET set as an environment variable

Write-Host "🎫 RadioWSServer - Universal Token Generator" -ForegroundColor Cyan
Write-Host ""

# Check if AUTH_SECRET is set
if (-not $env:AUTH_SECRET) {
    Write-Host "❌ ERROR: AUTH_SECRET not set!" -ForegroundColor Red
    Write-Host "Run setup-auth-secret.ps1 first to set AUTH_SECRET" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick fix for current session:" -ForegroundColor Cyan
    Write-Host '$env:AUTH_SECRET = "your-secret-here"' -ForegroundColor White
    exit
}

Write-Host "✅ AUTH_SECRET is set" -ForegroundColor Green
Write-Host ""

# Configuration
$tokens = @(
    @{
        clientId = "universal-admin"
        room = "radio"
        description = "Admin token for radio room (100 years)"
    },
    @{
        clientId = "universal-admin"
        room = "chat"
        description = "Admin token for chat room (100 years)"
    },
    @{
        clientId = "test-client"
        room = "radio"
        description = "Test token for radio room (100 years)"
    },
    @{
        clientId = "automation-bot"
        room = "radio"
        description = "Automation token for radio room (100 years)"
    }
)

Write-Host "Generating tokens..." -ForegroundColor Cyan
Write-Host ""

# 100 years in milliseconds
$hundredYears = 100 * 365 * 24 * 60 * 60 * 1000

foreach ($tokenConfig in $tokens) {
    try {
        $body = @{
            clientId = $tokenConfig.clientId
            room = $tokenConfig.room
            expiresIn = $hundredYears
        } | ConvertTo-Json

        $response = Invoke-RestMethod `
            -Uri "http://localhost:8080/auth/token" `
            -Method POST `
            -Body $body `
            -ContentType "application/json"

        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host "Description: $($tokenConfig.description)" -ForegroundColor Cyan
        Write-Host "Client ID:   $($response.clientId)" -ForegroundColor White
        Write-Host "Room:        $($response.room)" -ForegroundColor White
        Write-Host "Expires:     $($response.expiresAt)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Token:" -ForegroundColor Yellow
        Write-Host $response.token -ForegroundColor White
        Write-Host ""
    } catch {
        Write-Host "❌ Failed to generate token for $($tokenConfig.clientId)/$($tokenConfig.room)" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 Usage Examples:" -ForegroundColor Cyan
Write-Host ""
Write-Host "WebSocket Connection:" -ForegroundColor White
Write-Host 'ws://localhost:8080/radio?token=YOUR_TOKEN' -ForegroundColor Gray
Write-Host ""
Write-Host "HTTP POST with Authorization header:" -ForegroundColor White
Write-Host 'Authorization: Bearer YOUR_TOKEN' -ForegroundColor Gray
Write-Host ""
Write-Host "📝 Save these tokens! They will work until 2125!" -ForegroundColor Yellow
Write-Host ""
