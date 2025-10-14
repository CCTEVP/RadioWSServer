# Persistent Tokens Setup Guide

## Problem

Every time you restart the server without `AUTH_SECRET` set, a new random secret is generated, invalidating all existing tokens.

## Solution

Set `AUTH_SECRET` as a permanent environment variable so it never changes.

---

## Step 1: Setup AUTH_SECRET (One-time setup)

Run this PowerShell script:

```powershell
.\setup-auth-secret.ps1
```

This will:

1. Generate a secure random secret
2. Give you options to set it permanently
3. Save it for future reference

**Recommended:** Choose option 1 (User Environment Variable)

---

## Step 2: Restart PowerShell

After setting AUTH_SECRET, **close and reopen PowerShell/Terminal** for the environment variable to take effect.

Verify it's set:

```powershell
$env:AUTH_SECRET
# Should show your secret, not empty
```

---

## Step 3: Start Server

```powershell
npm start
```

You should see:

```
✅ No warning about AUTH_SECRET
✅ Server starts normally
```

---

## Step 4: Generate Universal Tokens

Run this script to generate long-lived tokens:

```powershell
.\generate-universal-tokens.ps1
```

This will create tokens that:

- ✅ Work for 100 years (until 2125)
- ✅ Persist across server restarts
- ✅ Work for different rooms (radio, chat)
- ✅ Work for different client IDs

**Save these tokens!** You can reuse them forever.

---

## Quick Start (All-in-One)

If you just want to get started quickly:

```powershell
# 1. Set AUTH_SECRET for current session only
$env:AUTH_SECRET = "CHANGE_ME_TO_A_RANDOM_STRING_AT_LEAST_32_CHARS_LONG"

# 2. Start server (in same terminal)
npm start

# 3. In another terminal, generate tokens
.\generate-universal-tokens.ps1
```

⚠️ **Warning:** Session-only AUTH_SECRET will be lost when you close PowerShell!

---

## Usage Examples

### WebSocket Connection

```javascript
const token = "YOUR_UNIVERSAL_TOKEN_HERE";
const ws = new WebSocket(`ws://localhost:8080/radio?token=${token}`);
```

### HTTP POST Request (Postman)

```
POST http://localhost:8080/radio/post
Authorization: Bearer YOUR_UNIVERSAL_TOKEN_HERE
Content-Type: application/json

{
  "type": "post",
  "timestamp": "2025-10-14T12:00:00Z",
  "data": {
    "content": {"id": "123", "name": "Test"},
    "advertiser": {"id": "456", "name": "Advertiser"}
  }
}
```

### PowerShell Request

```powershell
$token = "YOUR_UNIVERSAL_TOKEN_HERE"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "http://localhost:8080/radio/post" `
    -Method POST -Headers $headers -Body $jsonBody
```

---

## Token Storage

**Where tokens are stored:**

- ❌ **NOT on server** - Tokens are stateless, server doesn't store them
- ✅ **In your code** - Save tokens in your client applications
- ✅ **In environment variables** - For automation scripts
- ✅ **In Postman** - As environment/collection variables
- ✅ **In secure files** - token.txt, config files (don't commit to git!)

**What the server stores:**

- ✅ Only `AUTH_SECRET` - Used to verify token signatures
- ❌ No token database
- ❌ No token list

---

## Troubleshooting

### "Invalid token" after server restart

**Cause:** AUTH_SECRET not set, server generated new random secret

**Fix:**

1. Set AUTH_SECRET permanently (run setup-auth-secret.ps1)
2. Restart terminal
3. Regenerate tokens (run generate-universal-tokens.ps1)

### "AUTH_SECRET not set" warning on server start

**Cause:** Environment variable not loaded

**Fix:**

```powershell
# Check if it's set
$env:AUTH_SECRET

# If empty, set it:
$env:AUTH_SECRET = "your-saved-secret-here"

# Or restart terminal if you set it permanently
```

### Tokens work on one machine but not another

**Cause:** Different AUTH_SECRET on each machine

**Fix:**

- Use the **same AUTH_SECRET** on all servers
- Copy the secret from the first machine
- Set it on other machines using the same value

---

## Security Best Practices

### ✅ DO:

- Set AUTH_SECRET as environment variable
- Use strong random secret (32+ characters)
- Keep AUTH_SECRET private (don't commit to git)
- Use different tokens for different purposes
- Rotate AUTH_SECRET periodically (invalidates all tokens)

### ❌ DON'T:

- Hardcode AUTH_SECRET in source code
- Share AUTH_SECRET publicly
- Use simple/guessable secrets like "secret123"
- Commit tokens to version control
- Use production tokens in development

---

## Example: Production Setup

### Docker

```dockerfile
ENV AUTH_SECRET=your_production_secret_here
```

### Docker Compose

```yaml
environment:
  - AUTH_SECRET=your_production_secret_here
```

### Cloud Run / Cloud Services

Set as environment variable in cloud console:

```
AUTH_SECRET=your_production_secret_here
```

### Linux Server

```bash
# Add to ~/.bashrc or /etc/environment
export AUTH_SECRET="your_production_secret_here"
```

---

## Need Help?

- See `TOKEN-STORAGE-EXPLAINED.md` for how tokens work
- See `POSTMAN-TOKEN-GUIDE.md` for Postman usage
- See `AUTOMATION-GUIDE.md` for automation examples
