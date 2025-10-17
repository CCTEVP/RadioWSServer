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
ENV NODE_ENV=production \
    PORT=8080 \
    HEARTBEAT_INTERVAL_MS=30000 \
    POST_CONTENT_MAX_BYTES=262144 \
    DOCS_EMAIL=ben.matthew@absoluteradio.co.uk \
    DOCS_PASSWORD=absoluteradio123

# Note: The following MUST be set via Cloud Run environment variables:
# - PUBLIC_BASE_URL (e.g., https://radiowsserver-763503917257.europe-west1.run.app)
# - AUTH_SECRET (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
# - DOCS_EMAIL (your secure email for /docs login)
# - DOCS_PASSWORD (your secure password for /docs login)

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