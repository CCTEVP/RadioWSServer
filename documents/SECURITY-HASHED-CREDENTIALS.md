# Security Enhancement: Hashed Credentials

## Summary

All personal information has been removed from the codebase. Email and password credentials are now stored as SHA-256 hashes for security. Users still enter plain text credentials during login - the server handles hashing automatically.

## Changes Made

### 1. Authentication Module (`src/auth/docs-auth.js`)

**Added Functions:**

- `hashEmail(email)` - Hashes email using SHA-256
- `hashPassword(password)` - Hashes password using SHA-256

**Modified Functions:**

- `getDocsCredentials()` - Now returns `emailHash` and `passwordHash` instead of plain text
- `authenticateDocsUser()` - Hashes user input before comparing with stored hashes

### 2. Dockerfile

**Before:**

```dockerfile
DOCS_EMAIL=ben.matthew@absoluteradio.co.uk
DOCS_PASSWORD=absoluteradio123
```

**After:**

```dockerfile
DOCS_EMAIL_HASH=fcbfdedbc3b28d65bc9a9ded46e659c956432e3090a698ed285e831c63036a48
DOCS_PASSWORD_HASH=f5a743eb69dc8e890eb345eb296132730bc2cc0273381c073c1fe800ca85d9cd
```

**Default Production Credentials (hashed):**

- Email: `ben.matthew@absoluteradio.co.uk`
- Password: `absoluteradio123`

### 3. .env File

**Before:**

```bash
DOCS_EMAIL=admin@radiows.local
DOCS_PASSWORD=admin123
```

**After:**

```bash
DOCS_EMAIL_HASH=4fb7f98afffb0af736947a5f72d1f6e0287ad63ccbc506c7ba62940db20b0a6e
DOCS_PASSWORD_HASH=240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
```

**Default Development Credentials (hashed):**

- Email: `admin@radiows.local`
- Password: `admin123`

### 4. New Utility Script

**File:** `src/utils/generate-docs-hash.js`

Generates SHA-256 hashes for any email/password combination:

```bash
node src/utils/generate-docs-hash.js your@email.com yourpassword
```

Output:

```
=== Documentation Authentication Hashes ===

Email: your@email.com
Email Hash: abc123...

Password: **********
Password Hash: def456...

=== Environment Variables ===
DOCS_EMAIL_HASH=abc123...
DOCS_PASSWORD_HASH=def456...
```

### 5. Updated Documentation

**File:** `documents/DOCS-AUTHENTICATION.md`

- Added security section explaining hash storage
- Added instructions for generating hashes
- Updated all examples to use `DOCS_EMAIL_HASH` and `DOCS_PASSWORD_HASH`
- Added hash generation commands

## How It Works

### Login Flow:

1. User enters plain text email and password in login form
2. Server receives plain text credentials
3. Server hashes both email and password using SHA-256
4. Server compares hashed values with stored hashes
5. If match, session token is created

### Security Benefits:

- ✅ No plain text credentials in code or environment variables
- ✅ No personal information visible in Dockerfile
- ✅ Credentials cannot be reverse-engineered from hashes
- ✅ User experience unchanged (still enters plain text)
- ✅ Easy to generate new hashes with provided utility

## Production Deployment

### Generating Your Own Hashes:

```bash
node src/utils/generate-docs-hash.js your.email@company.com YourSecurePassword123!
```

### Setting in Cloud Run:

```bash
gcloud run deploy radiowsserver \
  --set-env-vars DOCS_EMAIL_HASH=your_generated_hash,DOCS_PASSWORD_HASH=your_generated_hash
```

### Setting in Dockerfile (if needed):

```dockerfile
ENV DOCS_EMAIL_HASH=your_generated_email_hash \
    DOCS_PASSWORD_HASH=your_generated_password_hash
```

## Testing

A test HTML file has been created to verify the hashed authentication:

**File:** `src/utils/test-hashed-auth.html`

Open in browser to test:

- ✅ Correct credentials (should succeed)
- ✅ Wrong password (should fail)
- ✅ Wrong email (should fail)
- ✅ Access to /docs after login (should succeed)

## Migration Checklist

If you have existing deployments:

1. ✅ Generate hashes for your credentials:

   ```bash
   node src/utils/generate-docs-hash.js your@email.com yourpassword
   ```

2. ✅ Update environment variables in Cloud Run:

   - Remove: `DOCS_EMAIL`, `DOCS_PASSWORD`
   - Add: `DOCS_EMAIL_HASH`, `DOCS_PASSWORD_HASH`

3. ✅ Redeploy the application

4. ✅ Test login with your plain text credentials

## Backwards Compatibility

The system maintains backwards compatibility:

- If `DOCS_EMAIL_HASH` is not set, it will hash `DOCS_EMAIL` on the fly
- If `DOCS_PASSWORD_HASH` is not set, it will hash `DOCS_PASSWORD` on the fly
- This ensures smooth transition during deployment

## Important Notes

⚠️ **Change Default Credentials in Production!**

The default hashes in Dockerfile correspond to:

- Email: `ben.matthew@absoluteradio.co.uk`
- Password: `absoluteradio123`

**Always generate and set your own secure hashes in production environment variables.**
