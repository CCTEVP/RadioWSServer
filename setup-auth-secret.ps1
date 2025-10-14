# Setup AUTH_SECRET for persistent tokens
# This ensures tokens don't change when server restarts

Write-Host "🔐 Setting up AUTH_SECRET for RadioWSServer" -ForegroundColor Cyan
Write-Host ""

# Generate a secure random secret (256-bit)
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)

Write-Host "Generated AUTH_SECRET:" -ForegroundColor Green
Write-Host $secret -ForegroundColor Yellow
Write-Host ""

# Ask user how to set it
Write-Host "How would you like to set AUTH_SECRET?" -ForegroundColor Cyan
Write-Host "1. User Environment Variable (recommended - persists for your user account)"
Write-Host "2. System Environment Variable (requires admin - persists for all users)"
Write-Host "3. Current Session Only (temporary - lost when you close PowerShell)"
Write-Host "4. Create .env file (manual - you'll need to load it yourself)"
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        [System.Environment]::SetEnvironmentVariable('AUTH_SECRET', $secret, 'User')
        Write-Host "✅ AUTH_SECRET set for user account!" -ForegroundColor Green
        Write-Host "This will persist across restarts." -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  You need to restart PowerShell/Terminal for it to take effect!" -ForegroundColor Yellow
    }
    "2" {
        try {
            [System.Environment]::SetEnvironmentVariable('AUTH_SECRET', $secret, 'Machine')
            Write-Host "✅ AUTH_SECRET set system-wide!" -ForegroundColor Green
            Write-Host "This will persist across restarts for all users." -ForegroundColor Green
            Write-Host ""
            Write-Host "⚠️  You need to restart PowerShell/Terminal for it to take effect!" -ForegroundColor Yellow
        } catch {
            Write-Host "❌ Failed to set system variable. Run PowerShell as Administrator." -ForegroundColor Red
        }
    }
    "3" {
        $env:AUTH_SECRET = $secret
        Write-Host "✅ AUTH_SECRET set for current session!" -ForegroundColor Green
        Write-Host "⚠️  This will be lost when you close PowerShell." -ForegroundColor Yellow
        Write-Host "You can start the server now in this same terminal." -ForegroundColor Cyan
    }
    "4" {
        $secret | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline
        "AUTH_SECRET=$secret" | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "✅ Created .env file with AUTH_SECRET" -ForegroundColor Green
        Write-Host "⚠️  You need to manually load this file or use a package like 'dotenv'" -ForegroundColor Yellow
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "📝 Save this secret somewhere safe!" -ForegroundColor Cyan
Write-Host "If you lose it, all existing tokens will become invalid." -ForegroundColor Yellow
Write-Host ""
Write-Host "AUTH_SECRET: $secret" -ForegroundColor Yellow
Write-Host ""
