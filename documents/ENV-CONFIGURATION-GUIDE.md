# Environment Configuration Guide

This project uses `.env` files to manage configuration for different environments.

## 📁 Files

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `.env` | **Development** configuration | ❌ NO - Contains secrets |
| `.env.production` | **Production** template | ✅ YES - Template only |
| `.env.example` | Example template | ✅ YES - For documentation |

## 🚀 Quick Start

### 1. Development Setup

The `.env` file is already configured! Just start the server:

```powershell
npm start
```

### 2. Check Your Configuration

```powershell
# View current environment
cat .env

# Or check specific variables
$env:NODE_ENV
$env:AUTH_SECRET
```

## ⚙️ Configuration Variables

### Environment

```bash
NODE_ENV=development  # or production
```

Controls logging, error handling, and security features.

### Server

```bash
PORT=8080
PUBLIC_BASE_URL=http://localhost:8080
```

### Authentication

```bash
# CRITICAL: Keep this secret!
AUTH_SECRET=your-secret-key-here

# Development tokens (100-year expiration)
TEST_TOKEN=your-test-token-here
ADMIN_TOKEN_RADIO=your-admin-token-here
```

### WebSocket

```bash
HEARTBEAT_INTERVAL_MS=30000    # Ping interval
IDLE_TIMEOUT_MS=0              # Connection timeout (0=disabled)
MAX_CONN_AGE_MS=0              # Max connection age (0=disabled)
```

### HTTP

```bash
POST_CONTENT_MAX_BYTES=262144  # 256KB max POST size
```

## 🔄 Switching Environments

### Development Mode

```powershell
# Use .env file (default)
npm start
```

### Production Mode

```powershell
# Option 1: Copy production config
Copy-Item .env.production .env

# Option 2: Set NODE_ENV
$env:NODE_ENV = "production"
npm start

# Option 3: Use different .env file
$env:DOTENV_CONFIG_PATH = ".env.production"
npm start
```

## 🔐 Security Best Practices

### ✅ DO:

1. **Keep `.env` private**
   - Never commit to git
   - Never share publicly
   - Different secrets per environment

2. **Use strong AUTH_SECRET**
   ```powershell
   # Generate secure secret
   .\setup-auth-secret.ps1
   ```

3. **Generate environment-specific tokens**
   ```powershell
   # Development tokens
   .\generate-universal-tokens.ps1
   
   # Production tokens (after setting production AUTH_SECRET)
   .\generate-universal-tokens.ps1
   ```

4. **Rotate secrets periodically**
   - Change AUTH_SECRET every 90 days
   - Regenerate all tokens after rotation

### ❌ DON'T:

1. ❌ Commit `.env` to version control
2. ❌ Share AUTH_SECRET or tokens publicly
3. ❌ Use development secrets in production
4. ❌ Hardcode secrets in source code
5. ❌ Use simple/guessable secrets

## 📝 Environment Variables Priority

The system loads variables in this order (later overrides earlier):

1. `.env` file (if exists)
2. System environment variables
3. PowerShell session variables
4. Default values in code

Example:
```powershell
# .env file has: PORT=8080
# But you can override:
$env:PORT = 3000
npm start  # Server starts on port 3000
```

## 🧪 Testing Configuration

### View Loaded Configuration

```powershell
# Start server and check logs
npm start

# Should show:
# - NODE_ENV: development
# - PORT: 8080
# - AUTH_SECRET: (set/not set)
```

### Test Token

```powershell
# Set test token and run test
$env:TEST_TOKEN = (Get-Content .env | Select-String "TEST_TOKEN").ToString().Split("=")[1]
node test-post-endpoint.js
```

## 🐳 Docker Configuration

### Dockerfile

```dockerfile
# Copy .env.production as .env in container
COPY .env.production .env

# Or use environment variables directly
ENV AUTH_SECRET=your-production-secret
ENV NODE_ENV=production
```

### Docker Compose

```yaml
services:
  radio-server:
    environment:
      - NODE_ENV=production
      - AUTH_SECRET=${AUTH_SECRET}
    env_file:
      - .env.production
```

## ☁️ Cloud Deployment

### Google Cloud Run

Set environment variables in Cloud Console or via CLI:

```bash
gcloud run deploy radiowsserver \
  --set-env-vars NODE_ENV=production \
  --set-env-vars AUTH_SECRET=your-secret \
  --set-env-vars PORT=8080
```

### Other Cloud Providers

Most cloud providers support environment variables:

- **Heroku**: Settings → Config Vars
- **AWS**: Environment Variables in Console
- **Azure**: Application Settings
- **Vercel/Netlify**: Environment Variables in Dashboard

## 🔧 Troubleshooting

### "AUTH_SECRET not set" warning

**Cause:** .env file not loaded or AUTH_SECRET missing

**Fix:**
```powershell
# Check if .env exists
Test-Path .env

# Check AUTH_SECRET value
Get-Content .env | Select-String "AUTH_SECRET"

# Regenerate if needed
.\setup-auth-secret.ps1
```

### Environment variables not loading

**Cause:** dotenv not installed or not imported

**Fix:**
```powershell
# Install dotenv
npm install dotenv

# Check server.js imports it
Get-Content src/server.js | Select-String "dotenv"
```

### Tokens invalid after restart

**Cause:** AUTH_SECRET changed between restarts

**Fix:**
- Ensure AUTH_SECRET is in .env file
- Use the same AUTH_SECRET across restarts
- Regenerate tokens if secret changed

## 📋 Example Configurations

### Local Development

```bash
NODE_ENV=development
PORT=8080
AUTH_SECRET=dev-secret-key-do-not-use-in-production
TEST_TOKEN=eyJjbGllbnRJZCI6InRlc3Q...
HEARTBEAT_INTERVAL_MS=30000
DEBUG=true
LOG_LEVEL=debug
```

### Production

```bash
NODE_ENV=production
PORT=8080
PUBLIC_BASE_URL=https://your-domain.com
AUTH_SECRET=super-secure-random-production-secret
HEARTBEAT_INTERVAL_MS=30000
IDLE_TIMEOUT_MS=300000
DEBUG=false
LOG_LEVEL=warn
```

## 📚 Related Documentation

- `PERSISTENT-TOKENS-GUIDE.md` - Token management
- `TOKEN-STORAGE-EXPLAINED.md` - How tokens work
- `setup-auth-secret.ps1` - Generate AUTH_SECRET
- `generate-universal-tokens.ps1` - Generate tokens
