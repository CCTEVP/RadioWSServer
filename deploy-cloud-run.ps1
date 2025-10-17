# Google Cloud Run Deployment Script for RadioWSServer (PowerShell)
# This script automates the deployment process with proper environment variables

param(
    [string]$ProjectId = $env:GOOGLE_CLOUD_PROJECT,
    [string]$Region = "europe-west1",
    [string]$ServiceName = "radiowsserver",
    [string]$ImageTag = "latest"
)

# ============================================================================
# Configuration
# ============================================================================

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrEmpty($ProjectId)) {
    $ProjectId = "your-project-id"
}

# ============================================================================
# Functions
# ============================================================================

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check gcloud
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-ErrorMsg "gcloud CLI not found. Please install Google Cloud SDK."
        exit 1
    }
    
    # Check docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-ErrorMsg "Docker not found. Please install Docker."
        exit 1
    }
    
    Write-Info "Prerequisites OK"
}

function New-AuthSecret {
    Write-Info "Generating AUTH_SECRET..."
    $bytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
    return [Convert]::ToBase64String($bytes)
}

function Get-UserCredentials {
    Write-Warning "Please provide secure credentials for documentation access:"
    
    $email = Read-Host "Documentation Email [admin@radiows.local]"
    if ([string]::IsNullOrEmpty($email)) {
        $email = "admin@radiows.local"
    }
    
    # Validate email
    if ($email -notmatch "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$") {
        Write-ErrorMsg "Invalid email format"
        exit 1
    }
    
    $password = Read-Host "Documentation Password" -AsSecureString
    $passwordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    )
    
    if ([string]::IsNullOrEmpty($passwordText)) {
        Write-ErrorMsg "Password cannot be empty"
        exit 1
    }
    
    if ($passwordText.Length -lt 8) {
        Write-ErrorMsg "Password must be at least 8 characters"
        exit 1
    }
    
    return @{
        Email = $email
        Password = $passwordText
    }
}

# ============================================================================
# Main Deployment Process
# ============================================================================

Write-Info "Starting RadioWSServer deployment to Google Cloud Run"
Write-Host ""

# Step 1: Check prerequisites
Test-Prerequisites

# Step 2: Confirm project settings
Write-Info "Project Settings:"
Write-Host "  Project ID: $ProjectId"
Write-Host "  Region: $Region"
Write-Host "  Service Name: $ServiceName"
Write-Host "  Image Tag: $ImageTag"
Write-Host ""

$continue = Read-Host "Continue with these settings? (y/n)"
if ($continue -ne "y") {
    Write-ErrorMsg "Deployment cancelled"
    exit 1
}

# Step 3: Generate or load credentials
$envFile = "cloud-run-env.yaml"
$useExisting = $false

if (Test-Path $envFile) {
    Write-Warning "Found existing cloud-run-env.yaml"
    $useExisting = (Read-Host "Use existing credentials? (y/n)") -eq "y"
}

if (-not $useExisting) {
    $creds = Get-UserCredentials
    $authSecret = New-AuthSecret
    
    # Create env file
    Write-Info "Creating cloud-run-env.yaml..."
    $envContent = @"
AUTH_SECRET: "$authSecret"
DOCS_EMAIL: "$($creds.Email)"
DOCS_PASSWORD: "$($creds.Password)"
PUBLIC_BASE_URL: "https://$ServiceName-placeholder.run.app"
NODE_ENV: "production"
PORT: "8080"
HEARTBEAT_INTERVAL_MS: "30000"
POST_CONTENT_MAX_BYTES: "262144"
"@
    
    Set-Content -Path $envFile -Value $envContent
    Write-Info "Credentials saved to $envFile"
    Write-Warning "Remember to add this file to .gitignore!"
} else {
    Write-Info "Using existing $envFile"
}

# Step 4: Build Docker image
Write-Info "Building Docker image..."
$imageName = "gcr.io/$ProjectId/${ServiceName}:$ImageTag"
docker build -t $imageName .

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Docker build failed"
    exit 1
}

# Step 5: Push to Google Container Registry
Write-Info "Pushing image to GCR..."
gcloud auth configure-docker -q
docker push $imageName

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Docker push failed"
    exit 1
}

# Step 6: Deploy to Cloud Run
Write-Info "Deploying to Cloud Run..."
gcloud run deploy $ServiceName `
    --image $imageName `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --port 8080 `
    --memory 512Mi `
    --cpu 1 `
    --max-instances 10 `
    --env-vars-file $envFile `
    --quiet

if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Cloud Run deployment failed"
    exit 1
}

# Step 7: Get service URL and update PUBLIC_BASE_URL
Write-Info "Getting service URL..."
$serviceUrl = gcloud run services describe $ServiceName `
    --region $Region `
    --format 'value(status.url)'

Write-Info "Service URL: $serviceUrl"

# Update PUBLIC_BASE_URL
Write-Info "Updating PUBLIC_BASE_URL environment variable..."
gcloud run services update $ServiceName `
    --region $Region `
    --update-env-vars "PUBLIC_BASE_URL=$serviceUrl" `
    --quiet

# Also update the env file
(Get-Content $envFile) -replace 'PUBLIC_BASE_URL:.*', "PUBLIC_BASE_URL: `"$serviceUrl`"" | Set-Content $envFile

# Step 8: Test deployment
Write-Info "Testing deployment..."

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "$serviceUrl/health" -UseBasicParsing
    if ($healthResponse.StatusCode -eq 200) {
        Write-Info "✓ Health check passed"
    }
} catch {
    Write-Warning "⚠ Health check failed: $_"
}

# Test docs redirect
try {
    $docsResponse = Invoke-WebRequest -Uri "$serviceUrl/docs" -UseBasicParsing -MaximumRedirection 0 -ErrorAction SilentlyContinue
    Write-Info "✓ Docs endpoint accessible"
} catch {
    if ($_.Exception.Response.StatusCode -eq 302) {
        Write-Info "✓ Docs endpoint redirects to login (expected)"
    }
}

# Step 9: Display summary
Write-Host ""
Write-Info "=========================================="
Write-Info "Deployment Complete!"
Write-Info "=========================================="
Write-Host ""
Write-Host "Service URL: $serviceUrl"
Write-Host "Documentation: $serviceUrl/docs"
Write-Host "Health Check: $serviceUrl/health"
Write-Host ""
Write-Host "Documentation Credentials:"
Write-Host "  Check cloud-run-env.yaml for email and password"
Write-Host ""
Write-Info "Next steps:"
Write-Host "1. Visit $serviceUrl/docs"
Write-Host "2. Login with your credentials"
Write-Host "3. Test API endpoints"
Write-Host "4. Monitor logs: gcloud run services logs tail $ServiceName --region $Region"
Write-Host ""
Write-Warning "Security Reminder:"
Write-Host "- Rotate DOCS_PASSWORD regularly"
Write-Host "- Never commit cloud-run-env.yaml to git"
Write-Host "- Consider using Secret Manager for production"
Write-Host ""
