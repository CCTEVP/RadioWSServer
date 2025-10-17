# Cloud Run Deployment Checklist

Use this checklist when deploying to Google Cloud Run with GitHub auto-deploy.

## ☑️ Pre-Deployment Checklist

### 1. GitHub Repository Setup

- [ ] Code pushed to GitHub repository
- [ ] Repository connected to Google Cloud Run
- [ ] Auto-deploy enabled for `main` branch
- [ ] Dockerfile present in repository root

### 2. Environment Variables Ready

- [ ] Generated `AUTH_SECRET` (run: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- [ ] Chosen `DOCS_EMAIL` (valid email format)
- [ ] Chosen `DOCS_PASSWORD` (strong password, min 12 chars)
- [ ] Know your `PUBLIC_BASE_URL` (or will update after first deploy)

### 3. Google Cloud Run Configuration

- [ ] Service created in Cloud Run console
- [ ] Region selected (e.g., `europe-west1`)
- [ ] Unauthenticated access enabled
- [ ] Memory: 512Mi or higher
- [ ] CPU: 1 or higher

## ☑️ Deployment Steps

### Set Environment Variables in Cloud Run

Go to: **Cloud Run Console → Your Service → EDIT & DEPLOY NEW REVISION → Variables & Secrets**

#### Required Variables

- [ ] `AUTH_SECRET` = `<your-generated-secret>`
- [ ] `PUBLIC_BASE_URL` = `https://radiowsserver-xxx.run.app`
- [ ] `DOCS_EMAIL` = `admin@yourcompany.com`
- [ ] `DOCS_PASSWORD` = `YourSecurePassword!`

#### Optional Variables (have defaults)

- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `8080`
- [ ] `HEARTBEAT_INTERVAL_MS` = `30000`
- [ ] `POST_CONTENT_MAX_BYTES` = `262144`

### Deploy

- [ ] Click "DEPLOY" button
- [ ] Wait for deployment to complete (1-3 minutes)
- [ ] Check deployment logs for errors

## ☑️ Post-Deployment Verification

### 1. Service Health

- [ ] Visit: `https://your-service.run.app/health`
- [ ] Should return: `{"status":"healthy","uptime":...}`

### 2. Documentation Access

- [ ] Visit: `https://your-service.run.app/docs`
- [ ] Should redirect to login page
- [ ] Login with your `DOCS_EMAIL` and `DOCS_PASSWORD`
- [ ] Should show Swagger UI documentation

### 3. WebSocket Test

- [ ] Generate test token: `POST https://your-service.run.app/auth/token`
- [ ] Connect WebSocket: `wss://your-service.run.app/rooms/radio?token=xxx`
- [ ] Should connect successfully

### 4. Update PUBLIC_BASE_URL (if needed)

- [ ] Copy your actual Cloud Run URL
- [ ] Update `PUBLIC_BASE_URL` environment variable
- [ ] Redeploy (EDIT & DEPLOY NEW REVISION)

## ☑️ Security Checklist

- [ ] `AUTH_SECRET` is NOT the default value
- [ ] `DOCS_EMAIL` is NOT `admin@radiows.local`
- [ ] `DOCS_PASSWORD` is NOT `admin123`
- [ ] Password is strong (12+ chars, mixed case, numbers, symbols)
- [ ] `.env` file is NOT committed to git
- [ ] Environment variables stored securely in Cloud Run only

## ☑️ Monitoring

- [ ] Check Cloud Run logs: https://console.cloud.google.com/logs
- [ ] Check Cloud Build history: https://console.cloud.google.com/cloud-build/builds
- [ ] Set up uptime monitoring (optional)
- [ ] Set up error alerting (optional)

## 🔄 Making Updates

Every time you push to GitHub:

1. Commit and push code
2. Cloud Run automatically builds and deploys
3. Check deployment status in Cloud Build console
4. Verify service is working

## 🚨 Troubleshooting

### Build Fails

- [ ] Check Cloud Build logs
- [ ] Verify Dockerfile syntax
- [ ] Check package.json dependencies

### Service Not Starting

- [ ] Check Cloud Run logs
- [ ] Verify environment variables are set
- [ ] Check `AUTH_SECRET` is valid base64

### Can't Access /docs

- [ ] Verify `DOCS_EMAIL` and `DOCS_PASSWORD` are set
- [ ] Check login credentials match environment variables
- [ ] Clear browser cookies and try again

### WebSocket Connection Fails

- [ ] Cloud Run supports WebSockets (no special config needed)
- [ ] Check token is valid
- [ ] Verify using `wss://` (not `ws://`)

## 📚 Related Documentation

- [CLOUD-RUN-DEPLOYMENT.md](./CLOUD-RUN-DEPLOYMENT.md) - Full deployment guide
- [DOCS-AUTHENTICATION.md](./DOCS-AUTHENTICATION.md) - Documentation authentication
- [PERMANENT-TOKENS.md](./PERMANENT-TOKENS.md) - Hardcoded tokens
- [ENV-CONFIGURATION-GUIDE.md](./ENV-CONFIGURATION-GUIDE.md) - Environment variables

---

**Last Updated:** 2025-10-17
