# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies (including swagger packages)
RUN npm ci --only=production

# Copy the application source code
COPY src/ ./src/

# Copy .env file if it exists (optional - prefer env vars in production)
COPY .env* ./

# Environment variable defaults (can be overridden at runtime)
# These are fallbacks - always override in production via Cloud Run environment variables
# Email and password are stored as SHA-256 hashes for security
ENV NODE_ENV=production \
    PORT=8080 \
    HEARTBEAT_INTERVAL_MS=30000 \
    POST_CONTENT_MAX_BYTES=262144 \
    DOCS_EMAIL_HASH=fcbfdedbc3b28d65bc9a9ded46e659c956432e3090a698ed285e831c63036a48 \
    DOCS_PASSWORD_HASH=f5a743eb69dc8e890eb345eb296132730bc2cc0273381c073c1fe800ca85d9cd

# Note: The following MUST be set via Cloud Run environment variables:
# - PUBLIC_BASE_URL (e.g., https://radiowsserver-763503917257.europe-west1.run.app)
# - AUTH_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
# - DOCS_EMAIL_HASH (SHA-256 hash of your email for /docs login)
#   Generate with: node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('your.email@domain.com'.toLowerCase().trim()).digest('hex'));"
# - DOCS_PASSWORD_HASH (SHA-256 hash of your password for /docs login)
#   Generate with: node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('yourpassword'.trim()).digest('hex'));"

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of the app directory to the non-root user
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose the port the app runs on
EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Define the command to run the application
CMD ["npm", "start"]