/**
 * Generate SHA-256 hashes for documentation authentication credentials
 * Usage: node src/utils/generate-docs-hash.js email@example.com yourpassword
 */

import crypto from "crypto";

function hashEmail(email) {
  return crypto
    .createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password.trim()).digest("hex");
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node generate-docs-hash.js <email> <password>");
  console.error(
    "Example: node generate-docs-hash.js admin@example.com mypassword"
  );
  process.exit(1);
}

console.log("\n=== Documentation Authentication Hashes ===");
console.log(`\nEmail: ${email}`);
console.log(`Email Hash: ${hashEmail(email)}`);
console.log(`\nPassword: ${"*".repeat(password.length)}`);
console.log(`Password Hash: ${hashPassword(password)}`);
console.log("\n=== Environment Variables ===");
console.log(`DOCS_EMAIL_HASH=${hashEmail(email)}`);
console.log(`DOCS_PASSWORD_HASH=${hashPassword(password)}`);
console.log("\n");
