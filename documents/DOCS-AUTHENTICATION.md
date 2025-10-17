# Documentation Authentication Guide

## Overview

The `/docs` API documentation endpoint is protected with email/password authentication to prevent unauthorized access. Credentials are stored as SHA-256 hashes for security.

## Default Credentials (Development)

**⚠️ FOR DEVELOPMENT ONLY**

- **Email:** `admin@radiows.local`
- **Password:** `admin123`

## Security

Credentials are stored as SHA-256 hashes, not plain text:

- Email and password are hashed before storage
- Users still enter plain text credentials during login
- Server compares hashed values for authentication

## Generating Credential Hashes

Use the provided utility script to generate hashes:

```bash
node src/utils/generate-docs-hash.js your.email@company.com YourSecurePassword123!
```

This will output:

```
=== Documentation Authentication Hashes ===

Email: your.email@company.com
Email Hash: abc123...

Password: *********************
Password Hash: def456...

=== Environment Variables ===
DOCS_EMAIL_HASH=abc123...
DOCS_PASSWORD_HASH=def456...
```

## Production Setup

Set these environment variables before starting the server:

```bash
DOCS_EMAIL_HASH=your_email_hash_here
DOCS_PASSWORD_HASH=your_password_hash_here
```

### Setting via .env file:

```bash
# .env file
# Generate hashes with: node src/utils/generate-docs-hash.js your@email.com yourpassword
DOCS_EMAIL_HASH=4fb7f98afffb0af736947a5f72d1f6e0287ad63ccbc506c7ba62940db20b0a6e
DOCS_PASSWORD_HASH=240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
```

### Setting via Docker:

```bash
docker run -p 8080:8080 \
  -e DOCS_EMAIL_HASH=your_email_hash \
  -e DOCS_PASSWORD_HASH=your_password_hash \
  radiowsserver
```

### Setting via Cloud Run:

```bash
gcloud run deploy radiowsserver \
  --set-env-vars DOCS_EMAIL_HASH=your_email_hash,DOCS_PASSWORD_HASH=your_password_hash
```

## Accessing Documentation

### Step 1: Navigate to /docs

Open your browser and go to:

```
http://localhost:8080/docs
```

You'll be automatically redirected to the login page.

### Step 2: Login

Fill in the login form:

- **Email Address:** Your configured email (default: `admin@radiows.local`)
- **Password:** Your configured password (default: `admin123`)

### Step 3: View Documentation

After successful login, you'll be redirected to the Swagger UI documentation.

## Login Page Features

✅ **Email Validation:** Real-time email format validation  
✅ **Password Required:** Password field must not be empty  
✅ **Visual Feedback:** Success/error messages displayed inline  
✅ **Secure Sessions:** 24-hour session tokens with HttpOnly cookies  
✅ **Auto-Redirect:** Successful login redirects to `/docs`

## Session Management

### Session Duration

- **Default:** 24 hours
- Sessions are automatically cleaned up after expiration
- Session activity is tracked

### Logout

Currently sessions expire automatically after 24 hours. To logout immediately:

```javascript
// POST request to logout endpoint
fetch("/auth/docs-logout", {
  method: "POST",
  credentials: "include",
}).then(() => {
  window.location.href = "/auth/docs-login-page";
});
```

## API Endpoints

### Login Page

```
GET /auth/docs-login-page
```

Returns the HTML login form.

### Login Handler

```
POST /auth/docs-login
Content-Type: application/json

{
  "email": "admin@radiows.local",
  "password": "admin123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "abc123...def456"
}
```

**Error Response (401):**

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Logout

```
POST /auth/docs-logout
```

**Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Protected Endpoints

These endpoints require authentication (valid session):

- `GET /docs` - Swagger UI documentation
- `GET /docs/swagger.json` - OpenAPI specification

If not authenticated, you'll be redirected to `/auth/docs-login-page`.

## Security Best Practices

### 1. Change Default Credentials

```bash
# Never use default credentials in production!
DOCS_EMAIL=your-secure-email@company.com
DOCS_PASSWORD=ComplexP@ssw0rd!With#Symbols123
```

### 2. Use Strong Passwords

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Avoid dictionary words
- Don't reuse passwords

### 3. Use HTTPS in Production

```bash
# Production URL should always use HTTPS
PUBLIC_BASE_URL=https://your-server.com
```

### 4. Limit Access

- Only share credentials with authorized developers
- Rotate passwords periodically
- Use different credentials for different environments

### 5. Monitor Sessions

Check active sessions via server logs:

```
✅ Session created for admin@radiows.local, expires at 2025-10-18T08:00:00.000Z
```

## Troubleshooting

### "Invalid email format" error

- Ensure email follows standard format: `user@domain.com`
- Check for typos or extra spaces

### "Invalid credentials" error

- Verify email and password are correct
- Check environment variables are set correctly
- Restart server after changing `.env` file

### Redirected to login page repeatedly

- Clear browser cookies
- Check browser console for errors
- Verify session cookie is being set

### Login page not loading

- Check server is running
- Verify `src/auth/login.html` file exists
- Check server logs for errors

## Future Enhancements

Planned features:

- [ ] Multiple user accounts
- [ ] Role-based access control
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] OAuth/SSO integration
- [ ] Session timeout warnings

## Related Documentation

- [API Documentation (Swagger)](http://localhost:8080/docs) - Requires login
- [PERMANENT-TOKENS.md](./PERMANENT-TOKENS.md) - WebSocket authentication tokens
- [AUTHENTICATION-GUIDE.md](./AUTHENTICATION-GUIDE.md) - General authentication guide

---

**Last Updated:** 2025-10-17  
**Version:** 1.0
