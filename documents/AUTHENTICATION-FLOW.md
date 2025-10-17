# Authentication Flow - Quick Reference

## Overview

The RadioWSServer implements a seamless authentication flow for documentation access with automatic redirects and session management.

## Flow Diagram

```
User visits any URL
        ↓
    Is it "/"?  ────Yes───→  Redirect to /docs
        ↓
       No
        ↓
    Is it "/docs"?  ────Yes───→  Check authentication
        ↓                               ↓
       No                          Authenticated?
        ↓                          ↓          ↓
  Normal routing              Yes            No
                              ↓              ↓
                        Show Swagger UI   Redirect to login
                                            ↓
                                    /auth/docs-login-page
                                            ↓
                                    User enters credentials
                                            ↓
                                    POST /auth/docs-login
                                            ↓
                                    Valid credentials?
                                    ↓              ↓
                                  Yes             No
                                    ↓              ↓
                            Create session     Show error
                            Set cookie         Stay on login
                                    ↓
                            Redirect to /docs
                                    ↓
                            Show Swagger UI
```

## Key Endpoints

### Public Endpoints

- `GET /` - Redirects to `/docs`
- `GET /auth/docs-login-page` - Login interface
- `POST /auth/docs-login` - Authentication handler
- `GET /health` - Health check (no auth required)

### Protected Endpoints

- `GET /docs` - Swagger UI documentation (requires authentication)
- `GET /docs/swagger.json` - OpenAPI specification (requires authentication)
- `POST /auth/docs-logout` - Logout handler

## Authentication Methods

### 1. Cookie-Based (Primary)

Session token stored in HttpOnly cookie:

```
docs_auth_token=<session-token>
```

**Properties:**

- HttpOnly: Prevents JavaScript access (XSS protection)
- SameSite=Strict: CSRF protection
- Max-Age: 24 hours
- Path: / (available to all endpoints)

### 2. Authorization Header (Fallback)

```
Authorization: Bearer <session-token>
```

Used for:

- API clients
- Testing
- Programmatic access

## Session Management

### Session Creation

```javascript
POST /auth/docs-login
Content-Type: application/json

{
  "email": "admin@radiows.local",
  "password": "admin123"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "<session-token>"
}
```

**Response (Failure):**

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Session Validation

Automatic on every protected endpoint request:

1. Extract token from cookie or Authorization header
2. Check if session exists in memory
3. Verify session hasn't expired (24h TTL)
4. Update last activity timestamp
5. Grant or deny access

### Session Destruction

```javascript
POST / auth / docs - logout;
```

Actions:

- Removes session from server memory
- Clears cookie (Max-Age=0)
- Returns success response

## Security Features

### Credential Hashing

✅ SHA-256 hash for email storage  
✅ SHA-256 hash for password storage  
✅ User enters plain text (UX unchanged)  
✅ Server compares hashed values

### Session Security

✅ Random 32-byte session tokens  
✅ HttpOnly cookies (XSS prevention)  
✅ SameSite=Strict (CSRF prevention)  
✅ 24-hour expiration  
✅ Automatic cleanup of expired sessions

### Transport Security

✅ HTTPS enforced in production (Cloud Run)  
✅ Secure cookie flags in production  
✅ No credentials in URLs

## User Experience Flow

### First Visit (Not Authenticated)

```
1. User visits: https://your-server.com/
2. Server redirects: → /docs
3. Server detects: No session
4. Server redirects: → /auth/docs-login-page
5. User sees: Login form
6. User enters: Email + Password
7. User clicks: Login button
8. Browser sends: POST /auth/docs-login
9. Server validates: Credentials
10. Server creates: Session + Cookie
11. Server redirects: → /docs
12. User sees: Swagger UI documentation
```

### Subsequent Visits (Authenticated)

```
1. User visits: https://your-server.com/
2. Server redirects: → /docs
3. Server detects: Valid session cookie
4. User sees: Swagger UI documentation (immediate)
```

### Session Expiry

```
After 24 hours:
1. User visits: /docs
2. Server detects: Expired session
3. Server deletes: Expired session
4. Server redirects: → /auth/docs-login-page
5. User must: Login again
```

## Configuration

### Environment Variables

**Development (.env):**

```bash
DOCS_EMAIL_HASH=4fb7f98afffb0af736947a5f72d1f6e0287ad63ccbc506c7ba62940db20b0a6e
DOCS_PASSWORD_HASH=240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
```

**Production (Cloud Run):**

```bash
DOCS_EMAIL_HASH=<your-generated-hash>
DOCS_PASSWORD_HASH=<your-generated-hash>
```

### Generate Hashes

```bash
node src/utils/generate-docs-hash.js your@email.com yourpassword
```

## Testing

### Manual Testing

1. Open browser: `http://localhost:8080/`
2. Should redirect to login page
3. Enter credentials
4. Should see Swagger UI
5. Close browser (or clear cookies)
6. Repeat - should require login again

### Automated Testing

Open test file in browser:

```
src/utils/test-hashed-auth.html
```

Tests:

- ✅ Correct credentials (should pass)
- ❌ Wrong password (should fail)
- ❌ Wrong email (should fail)
- ✅ Access /docs after login (should pass)

## Troubleshooting

### Problem: Redirect loop

**Cause:** Session validation failing  
**Solution:** Check environment variables are set correctly

### Problem: Login fails with correct credentials

**Cause:** Hash mismatch  
**Solution:** Regenerate hashes with utility script

### Problem: Session expires too quickly

**Cause:** Server restarts (in-memory sessions cleared)  
**Solution:** Normal behavior for development. Consider Redis for production.

### Problem: Can't logout

**Cause:** Cookie not being cleared  
**Solution:** Check SameSite and Path settings in browser dev tools

## Production Checklist

- [ ] Generate secure credential hashes
- [ ] Set `DOCS_EMAIL_HASH` in Cloud Run
- [ ] Set `DOCS_PASSWORD_HASH` in Cloud Run
- [ ] Test login flow on production URL
- [ ] Verify HTTPS is working
- [ ] Test session persistence
- [ ] Test logout functionality
- [ ] Document credentials securely (password manager)

## Best Practices

1. **Never commit credentials** - Use environment variables
2. **Use strong passwords** - Minimum 12 characters
3. **Rotate credentials** - Change every 90 days
4. **Monitor access** - Check server logs for failed attempts
5. **Use HTTPS** - Always in production
6. **Test regularly** - Verify authentication works after deployments
7. **Document properly** - Keep credentials in password manager

## Related Documentation

- [DOCS-AUTHENTICATION.md](./DOCS-AUTHENTICATION.md) - Complete authentication guide
- [SECURITY-HASHED-CREDENTIALS.md](./SECURITY-HASHED-CREDENTIALS.md) - Security implementation details
- [CLOUD-RUN-DEPLOYMENT.md](./CLOUD-RUN-DEPLOYMENT.md) - Deployment instructions
