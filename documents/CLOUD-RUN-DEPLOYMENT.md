# Google Cloud Run Deployment Guide

## Overview

This guide covers deploying RadioWSServer to Google Cloud Run using **GitHub automatic deployment**. The service rebuilds and redeploys automatically whenever you push to the main branch.

## Prerequisites

1. ✅ **GitHub repository** connected to Google Cloud Run
2. ✅ **Automatic deployment** enabled (rebuilds on git push)
3. ✅ **Billing enabled** on your Google Cloud project
4. 🔐 **Environment variables** configured in Cloud Run console

## Environment Variables Required

### 🔴 CRITICAL - Must Set in Cloud Run Console

These variables **MUST** be configured in Google Cloud Run before your service will work correctly:

| Variable          | Description                  | Example                             | How to Generate                                                               |
| ----------------- | ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `AUTH_SECRET`     | Secret key for token signing | `MbBzT3i...m6o=`                    | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `PUBLIC_BASE_URL` | Your Cloud Run service URL   | `https://radiowsserver-xxx.run.app` | Get from Cloud Run dashboard after first deployment                           |
| `DOCS_EMAIL`      | Email for /docs login        | `admin@yourcompany.com`             | Your choice (must be valid email format)                                      |
| `DOCS_PASSWORD`   | Password for /docs login     | `SecureP@ss123!`                    | Strong password (min 12 chars, uppercase, lowercase, numbers, symbols)        |

### ⚙️ Optional - Has Defaults

| Variable                 | Default      | Description                       |
| ------------------------ | ------------ | --------------------------------- |
| `NODE_ENV`               | `production` | Environment mode                  |
| `PORT`                   | `8080`       | Server port (Cloud Run uses 8080) |
| `HEARTBEAT_INTERVAL_MS`  | `30000`      | WebSocket heartbeat interval      |
| `POST_CONTENT_MAX_BYTES` | `262144`     | Max POST body size (256KB)        |

## Deployment Process (GitHub Auto-Deploy)

### How It Works

1. You push code to GitHub repository
2. Google Cloud Run detects the push
3. Cloud Run automatically builds the Docker image
4. Cloud Run deploys the new image
5. Service is live with updated code

### Initial Setup (One-Time)

If you haven't connected GitHub yet, follow these steps:

1. **Go to Cloud Run Console:**

   ```
   https://console.cloud.google.com/run
   ```

2. **Create New Service:**

   - Click "CREATE SERVICE"
   - Select "Continuously deploy from a repository (source or function)"
   - Click "SET UP WITH CLOUD BUILD"

3. **Connect GitHub Repository:**

   - Select "GitHub" as source
   - Authenticate and select your repository
   - Select branch: `main`
   - Build Type: `Dockerfile`
   - Dockerfile location: `/Dockerfile`

4. **Configure Service:**

   - Service name: `radiowsserver`
   - Region: Choose closest to your users
   - Allow unauthenticated invocations: ✅ Yes

5. **Set Environment Variables** (see section below)

6. **Create Service** - First deployment will start automatically

## Configuring Environment Variables

### Step 1: Generate AUTH_SECRET

Generate a secure random secret:

```bash
# Run this command locally (any OS)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Example output:
# MbBzT3i6980NEVagisLMvWXFcBYq3dIQfq6ZKbGRm6o=
```

**Copy this value** - you'll need it in Step 3.

### Step 2: Choose Documentation Credentials

Decide on secure credentials for /docs access:

```bash
# Email (must be valid email format)
DOCS_EMAIL=admin@yourcompany.com

# Password (strong password recommended)
DOCS_PASSWORD=YourSecureP@ssw0rd!2025
```

**⚠️ Never use the default credentials (`admin@radiows.local` / `admin123`) in production!**

### Step 3: Set Environment Variables in Cloud Run Console

1. **Go to your Cloud Run service:**

   ```
   https://console.cloud.google.com/run
   ```

2. **Click on your service** (`radiowsserver`)

3. **Click "EDIT & DEPLOY NEW REVISION"** at the top

4. **Scroll down to "Variables & Secrets"** section

5. **Click "ADD VARIABLE"** for each required variable:

   | Name                     | Value                                          |
   | ------------------------ | ---------------------------------------------- |
   | `AUTH_SECRET`            | (paste the value from Step 1)                  |
   | `PUBLIC_BASE_URL`        | `https://radiowsserver-xxx.run.app` (your URL) |
   | `DOCS_EMAIL`             | `admin@yourcompany.com`                        |
   | `DOCS_PASSWORD`          | `YourSecureP@ssw0rd!2025`                      |
   | `NODE_ENV`               | `production`                                   |
   | `HEARTBEAT_INTERVAL_MS`  | `30000`                                        |
   | `POST_CONTENT_MAX_BYTES` | `262144`                                       |

6. **Click "DEPLOY"** at the bottom

7. **Wait for deployment** to complete (usually 1-2 minutes)

### Step 4: Get Your PUBLIC_BASE_URL

After first deployment:

1. Go to Cloud Run console
2. Find your service URL (e.g., `https://radiowsserver-763503917257.europe-west1.run.app`)
3. **Update the `PUBLIC_BASE_URL` environment variable** with this URL
4. Click "EDIT & DEPLOY NEW REVISION" again
5. Update `PUBLIC_BASE_URL` to your actual URL
6. Click "DEPLOY"

## Making Updates (Auto-Deploy)

Once GitHub is connected, deployments are automatic:

1. **Make changes to your code** locally
2. **Commit changes:**
   ```bash
   git add .
   git commit -m "Your change description"
   ```
3. **Push to GitHub:**
   ```bash
   git push origin main
   ```
4. **Cloud Run automatically:**
   - Detects the push
   - Builds new Docker image from Dockerfile
   - Deploys new revision
   - Switches traffic to new revision

**That's it!** Your changes are live in 2-3 minutes.

## Viewing Deployment Status

### In Cloud Run Console

1. Go to: https://console.cloud.google.com/run
2. Click on your service
3. View "REVISIONS" tab to see deployment history
4. Latest revision will show "100% traffic"

### In Cloud Build

1. Go to: https://console.cloud.google.com/cloud-build/builds
2. See build logs for each git push
3. Green checkmark = successful build
4. Red X = build failed (check logs)

## Updating Environment Variables

To change environment variables without code changes:

1. **Go to Cloud Run console**
2. **Click your service** → "EDIT & DEPLOY NEW REVISION"
3. **Scroll to "Variables & Secrets"**
4. **Update the values** you want to change
5. **Click "DEPLOY"**

This creates a new revision with updated environment variables.

### Quick Update via gcloud CLI

```bash
# Update a single variable
gcloud run services update radiowsserver \
  --region europe-west1 \
  --update-env-vars DOCS_PASSWORD=NewSecurePassword123!

# Update multiple variables
gcloud run services update radiowsserver \
  --region europe-west1 \
  --update-env-vars DOCS_EMAIL=newadmin@company.com,DOCS_PASSWORD=NewPassword123!

```

Save this value - you'll need it for deployment.

### Step 2: Choose Documentation Credentials

Decide on secure credentials for /docs access:

```bash
# Email (must be valid email format)
DOCS_EMAIL=admin@yourcompany.com

# Password (strong password recommended)
DOCS_PASSWORD=YourSecureP@ssw0rd!2025
```

**⚠️ Never use the default credentials (`admin@radiows.local` / `admin123`) in production!**

### Step 3: Build and Push Docker Image

```bash
# Set your project ID
export PROJECT_ID=your-project-id
export REGION=europe-west1
export SERVICE_NAME=radiowsserver

# Configure Docker for Google Cloud
gcloud auth configure-docker

# Build the image
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest
```

### Step 4: Deploy to Cloud Run

#### Option A: Using gcloud CLI (Recommended)

```bash
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production,PORT=8080,HEARTBEAT_INTERVAL_MS=30000,POST_CONTENT_MAX_BYTES=262144" \
  --set-env-vars "AUTH_SECRET=MbBzT3i6980NEVagisLMvWXFcBYq3dIQfq6ZKbGRm6o=" \
  --set-env-vars "DOCS_EMAIL=admin@yourcompany.com" \
  --set-env-vars "DOCS_PASSWORD=YourSecureP@ssw0rd!2025" \
  --set-env-vars "PUBLIC_BASE_URL=https://radiowsserver-763503917257.europe-west1.run.app"
```

**Note:** After first deployment, update `PUBLIC_BASE_URL` with your actual Cloud Run URL.

#### Option B: Using Environment File

Create `cloud-run-env.yaml`:

```yaml
AUTH_SECRET: "MbBzT3i6980NEVagisLMvWXFcBYq3dIQfq6ZKbGRm6o="
DOCS_EMAIL: "admin@yourcompany.com"
DOCS_PASSWORD: "YourSecureP@ssw0rd!2025"
PUBLIC_BASE_URL: "https://radiowsserver-763503917257.europe-west1.run.app"
NODE_ENV: "production"
PORT: "8080"
HEARTBEAT_INTERVAL_MS: "30000"
POST_CONTENT_MAX_BYTES: "262144"
```

Deploy with env file:

```bash
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --env-vars-file cloud-run-env.yaml
```

**⚠️ Security:** Add `cloud-run-env.yaml` to `.gitignore` to avoid committing secrets!

### Step 5: Update PUBLIC_BASE_URL

After deployment, Cloud Run gives you a URL like:

```
https://radiowsserver-763503917257.europe-west1.run.app
```

Update the environment variable:

```bash
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars "PUBLIC_BASE_URL=https://radiowsserver-763503917257.europe-west1.run.app"
```

### Step 6: Verify Deployment

```bash
# Get service URL
export SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

# Test health endpoint
curl $SERVICE_URL/health

# Test docs redirect (should redirect to login)
curl -I $SERVICE_URL/docs
```

## Testing Documentation Login

### Browser Test

1. Open: `https://your-service-url.run.app/docs`
2. Should redirect to login page
3. Login with your configured credentials:
   - Email: `admin@yourcompany.com`
   - Password: `YourSecureP@ssw0rd!2025`
4. After successful login, you'll see Swagger documentation

### Programmatic Test

```bash
# Test login endpoint
curl -X POST https://your-service-url.run.app/auth/docs-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "YourSecureP@ssw0rd!2025"
  }'

# Response should include:
# {"success":true,"message":"Login successful","token":"..."}
```

## Environment Variable Management

### View Current Variables

```bash
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format 'value(spec.template.spec.containers[0].env)'
```

### Update Single Variable

```bash
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars "DOCS_PASSWORD=NewSecurePassword123!"
```

### Update Multiple Variables

```bash
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars "DOCS_EMAIL=new-admin@company.com,DOCS_PASSWORD=NewPassword123!"
```

### Remove Variable

```bash
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --remove-env-vars "VARIABLE_NAME"
```

## Security Best Practices

### 1. Use Google Secret Manager (Recommended)

Instead of plain environment variables, use Secret Manager for sensitive data:

```bash
# Create secret
echo -n "YourSecurePassword" | gcloud secrets create docs-password \
  --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding docs-password \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Deploy with secret
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --update-secrets="DOCS_PASSWORD=docs-password:latest"
```

### 2. Rotate Credentials Regularly

```bash
# Update password every 90 days
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --update-env-vars "DOCS_PASSWORD=NewRotatedPassword$(date +%Y%m)"
```

### 3. Use Strong Passwords

Requirements:

- Minimum 16 characters
- Mix of uppercase, lowercase, numbers, symbols
- No dictionary words
- Unique (don't reuse)

Generate secure password:

```bash
# On Linux/Mac
openssl rand -base64 24

# On Windows PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
```

### 4. Limit CORS Origins

Update `src/server.js` to restrict CORS in production:

```javascript
const allowedOrigins =
  process.env.NODE_ENV === "production" ? ["https://your-frontend.com"] : ["*"];
```

## Monitoring and Logs

### View Logs

```bash
# Real-time logs
gcloud run services logs tail $SERVICE_NAME --region $REGION

# Recent logs
gcloud run services logs read $SERVICE_NAME --region $REGION --limit 50

# Filter for auth events
gcloud run services logs read $SERVICE_NAME --region $REGION \
  --filter="Session created OR Failed login"
```

### Monitor Failed Login Attempts

```bash
gcloud run services logs read $SERVICE_NAME --region $REGION \
  --filter="Failed login attempt" \
  --format="table(timestamp,textPayload)"
```

## Troubleshooting

### Issue: "Authentication required" loop

**Solution:** Clear browser cookies and try again

```bash
# Chrome DevTools: Application → Cookies → Delete all
```

### Issue: Environment variables not updating

**Solution:** Variables update on next request, but redeploy forces immediate update:

```bash
gcloud run services update $SERVICE_NAME --region $REGION --no-traffic
gcloud run services update-traffic $SERVICE_NAME --region $REGION --to-latest
```

### Issue: 500 error on /docs

**Solution:** Check logs for AUTH_SECRET or missing variables:

```bash
gcloud run services logs read $SERVICE_NAME --region $REGION --limit 20
```

### Issue: Can't access /docs at all

**Solution:** Verify service is deployed and PUBLIC_BASE_URL is correct:

```bash
gcloud run services describe $SERVICE_NAME --region $REGION
```

## Production Checklist

Before going live:

- [ ] ✅ `AUTH_SECRET` is unique and securely generated
- [ ] ✅ `DOCS_EMAIL` is a valid corporate email
- [ ] ✅ `DOCS_PASSWORD` is strong (16+ chars, mixed case, symbols)
- [ ] ✅ `PUBLIC_BASE_URL` matches your Cloud Run URL
- [ ] ✅ All default credentials removed from code
- [ ] ✅ `.env` file NOT committed to git
- [ ] ✅ `cloud-run-env.yaml` in `.gitignore`
- [ ] ✅ Secret Manager configured (recommended)
- [ ] ✅ HTTPS enforced (automatic with Cloud Run)
- [ ] ✅ Health check endpoint working
- [ ] ✅ Documentation login tested
- [ ] ✅ Logs monitored for errors

## Quick Reference Commands

```bash
# Deploy with all variables
gcloud run deploy radiowsserver \
  --image gcr.io/your-project/radiowsserver:latest \
  --region europe-west1 \
  --set-env-vars "AUTH_SECRET=YOUR_SECRET,DOCS_EMAIL=admin@company.com,DOCS_PASSWORD=SecurePass123!,PUBLIC_BASE_URL=https://your-url.run.app"

# Update docs credentials
gcloud run services update radiowsserver \
  --region europe-west1 \
  --update-env-vars "DOCS_EMAIL=new@company.com,DOCS_PASSWORD=NewPass123!"

# View service URL
gcloud run services describe radiowsserver --region europe-west1 --format 'value(status.url)'

# Check deployment status
gcloud run services describe radiowsserver --region europe-west1
```

## Related Documentation

- [DOCS-AUTHENTICATION.md](./DOCS-AUTHENTICATION.md) - Documentation login details
- [PRODUCTION-DEPLOYMENT-GUIDE.md](./PRODUCTION-DEPLOYMENT-GUIDE.md) - General deployment guide
- [ENV-CONFIGURATION-GUIDE.md](./ENV-CONFIGURATION-GUIDE.md) - Environment variables reference

---

**Last Updated:** 2025-10-17  
**Cloud Run Region:** europe-west1  
**Service Name:** radiowsserver
