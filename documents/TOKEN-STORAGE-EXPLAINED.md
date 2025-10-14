# Token Storage Architecture

## TL;DR - Tokens Are NOT Stored on the Server! 🎯

**The server does NOT store tokens anywhere.** This is a **stateless, cryptographic authentication system** using HMAC-SHA256 signatures.

## How It Works

### Token Generation (Stateless)

When you request a token from `POST /auth/token`:

1. **Server creates a JSON payload** containing:

   ```json
   {
     "clientId": "user123",
     "room": "radio",
     "expiresAt": 1729000000000,
     "issuedAt": 1728900000000,
     "metadata": {}
   }
   ```

2. **Encodes payload to base64url**:

   ```
   eyJjbGllbnRJZCI6InVzZXIxMjMiLCJyb29tIjoicmFkaW8i...
   ```

3. **Signs with HMAC-SHA256** using `AUTH_SECRET`:

   ```
   HMAC-SHA256(payload, AUTH_SECRET) = signature
   ```

4. **Returns token** as `payload.signature`:

   ```
   eyJjbGllbnRJZCI6InVzZXIxMjMi...abc123
   ```

5. **Server forgets about it immediately** ✅

### Token Verification (Stateless)

When a client connects with a token:

1. **Server splits token** into `payload` and `signature`
2. **Recalculates signature** using same `AUTH_SECRET`
3. **Compares signatures**:
   - Match? ✅ Token is valid
   - No match? ❌ Token is invalid or tampered
4. **Checks expiration** from the payload
5. **Server still has no database/storage** ✅

## What IS Stored?

### Only One Thing: AUTH_SECRET

**Location:** Environment variable or generated at startup

```javascript
// src/auth/index.js
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  "CHANGE_THIS_IN_PRODUCTION_" + crypto.randomBytes(32).toString("hex");
```

**This is the ONLY "storage" for authentication:**

- If `AUTH_SECRET` is set: Same secret persists across restarts
- If not set: Random secret generated each restart (tokens invalidated)

## Why This Design?

### ✅ Advantages

1. **No Database Needed**

   - Zero storage overhead
   - No queries, no indexes
   - Scales infinitely

2. **Stateless & Scalable**

   - Any server instance can verify any token
   - Perfect for load balancing
   - No session synchronization needed

3. **Fast Verification**

   - Just cryptographic signature check
   - No database lookup
   - Millisecond verification time

4. **Simple Architecture**

   - No persistence layer
   - No cleanup jobs
   - No "revocation list" management

5. **Self-Contained**
   - All info in the token itself
   - Client stores token
   - Server just validates signature

### ⚠️ Tradeoffs

1. **Cannot Revoke Individual Tokens**

   - No token "blacklist"
   - Must change `AUTH_SECRET` to invalidate ALL tokens
   - For selective revocation, would need database

2. **Token Size**

   - Contains all the data (clientId, room, metadata)
   - Larger than a simple session ID
   - But still small (~200-300 bytes)

3. **Cannot See Active Tokens**
   - No "list all tokens" endpoint
   - No "who's connected" based on tokens alone
   - Would need separate tracking

## Token Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT SIDE                                            │
├─────────────────────────────────────────────────────────┤
│  1. Request token from /auth/token                      │
│  2. Store token (localStorage, env var, config file)    │
│  3. Include in requests (WS URL or Auth header)         │
│  4. Keep until expiration                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  SERVER SIDE                                            │
├─────────────────────────────────────────────────────────┤
│  1. Generate token (encode + sign)                      │
│  2. Return to client                                    │
│  3. FORGET IT (no storage)                              │
│  4. Later: Verify signature when presented              │
│  5. Check expiration from payload                       │
│  6. FORGET IT AGAIN (no storage)                        │
└─────────────────────────────────────────────────────────┘
```

## What About AUTH_SECRET?

### Storage Location

**Not stored in any file by default.** You set it as environment variable:

**PowerShell (Session):**

```powershell
$env:AUTH_SECRET = 'your-secret-key-here'
node src/server.js
```

**PowerShell (Permanent - User):**

```powershell
[System.Environment]::SetEnvironmentVariable('AUTH_SECRET', 'your-secret-key-here', 'User')
```

**PowerShell (Permanent - System):**

```powershell
[System.Environment]::SetEnvironmentVariable('AUTH_SECRET', 'your-secret-key-here', 'Machine')
```

**Linux/Mac:**

```bash
export AUTH_SECRET='your-secret-key-here'

# Or add to ~/.bashrc or ~/.zshrc for persistence
echo 'export AUTH_SECRET="your-secret-key-here"' >> ~/.bashrc
```

**Docker:**

```dockerfile
ENV AUTH_SECRET=your-secret-key-here
```

**Docker Compose:**

```yaml
environment:
  - AUTH_SECRET=your-secret-key-here
```

### Generating a Secure AUTH_SECRET

```powershell
# PowerShell - Generate 256-bit random key
$secret = [Convert]::ToBase64String([byte[]]@((1..32 | ForEach-Object { Get-Random -Maximum 256 })))
Write-Host "Your AUTH_SECRET: $secret"

# Set it
$env:AUTH_SECRET = $secret
```

```bash
# Linux/Mac - Generate 256-bit random key
openssl rand -base64 32
```

## Token Revocation Strategies

Since tokens aren't stored, you have limited revocation options:

### Option 1: Change AUTH_SECRET (Nuclear Option)

**Effect:** Invalidates ALL tokens immediately

```powershell
# Generate new secret
$newSecret = [Convert]::ToBase64String([byte[]]@((1..32 | ForEach-Object { Get-Random -Maximum 256 })))
$env:AUTH_SECRET = $newSecret

# Restart server
# All old tokens now invalid
```

**Use when:**

- Security breach suspected
- Periodic key rotation (good practice)
- Need to revoke all access

### Option 2: Short Expiration + Refresh

**Not currently implemented**, but you could add:

- Short-lived access tokens (1 hour)
- Long-lived refresh tokens
- Refresh endpoint to get new access token

### Option 3: Token Blacklist (Requires Database)

**Not currently implemented**, but you could add:

- Store revoked token IDs in database
- Check blacklist on verification
- Expires entries after token expiration

Example implementation:

```javascript
// Would need to add
const revokedTokens = new Set(); // or database

export function revokeToken(token) {
  revokedTokens.add(token);
}

export function verifyAuthToken(token, expectedRoom = null) {
  // Check revocation list
  if (revokedTokens.has(token)) {
    return null;
  }

  // ... rest of verification
}
```

## Comparison with Other Auth Systems

### JWT (JSON Web Tokens)

- **Same concept!** This IS essentially a JWT-like system
- Standard JWT uses RS256 (RSA) or HS256 (HMAC)
- This system uses HS256 (HMAC-SHA256)
- Same stateless, self-contained approach

### Session-Based Auth

- **Different!** Sessions store data server-side
- Session ID in cookie, data in database/memory
- Requires storage and cleanup
- Can revoke individual sessions easily

### OAuth/OAuth2

- **Different!** Complex authorization flows
- Multiple servers (auth server, resource server)
- Access tokens + refresh tokens
- This is simpler, single-server

## Security Implications

### ✅ What's Secure

1. **Tokens can't be forged** (without AUTH_SECRET)
2. **Tampering detected** (signature verification fails)
3. **Expiration enforced** (checked every time)
4. **Room-specific** (can't use token for different room)

### ⚠️ What to Watch

1. **Keep AUTH_SECRET secret!**

   - Don't commit to git
   - Don't expose in logs
   - Use strong random value

2. **Use HTTPS/WSS in production**

   - Tokens transmitted in headers/URLs
   - Plain HTTP = tokens visible to network

3. **Set appropriate expiration**

   - Shorter = more secure (but less convenient)
   - Longer = more convenient (but riskier if leaked)
   - 100-year tokens = permanent access (use wisely!)

4. **Monitor for unusual activity**
   - Log connection attempts
   - Alert on failed auth
   - Track which clientIds are active

## Summary

**Q: Where are tokens stored on the server?**  
**A: Nowhere! The server doesn't store tokens.**

**Q: How does the server know if a token is valid?**  
**A: Cryptographic signature verification using AUTH_SECRET.**

**Q: What happens if I restart the server?**  
**A: If AUTH_SECRET is set, all tokens still work. If not set, new random secret = all tokens invalid.**

**Q: Can I revoke a specific token?**  
**A: Not with current implementation. Only nuclear option: change AUTH_SECRET.**

**Q: Is this secure?**  
**A: Yes, if you protect AUTH_SECRET and use HTTPS/WSS.**

**Q: How is this different from JWT?**  
**A: It's not! This is basically a custom JWT-like implementation.**

## Related Documentation

- `src/auth/README.md` - Full auth module documentation
- `AUTOMATION-GUIDE.md` - Using long-lived tokens
- `AUTHENTICATION-GUIDE.md` - General auth guide
