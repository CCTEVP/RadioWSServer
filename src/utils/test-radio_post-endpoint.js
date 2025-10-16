/**
 * Test script to verify /room/radio/post endpoint
 * Run this to test if the server is modifying advertiser.id
 *
 * SETUP REQUIRED:
 * 1. Make sure AUTH_SECRET is set (run setup-auth-secret.ps1)
 * 2. Restart PowerShell/Terminal after setting AUTH_SECRET
 * 3. Start the server (npm start)
 * 4. Run: .\generate-universal-tokens.ps1
 * 5. Copy the "test-client" token and paste it below
 *
 * Or run this to generate and get the token:
 * node generate-test-token.js
 */

import http from "http";

// ============================================================================
// CONFIGURATION
// ============================================================================

// TODO: Replace this with your universal token from generate-universal-tokens.ps1
// This token will be valid forever (100 years) as long as AUTH_SECRET doesn't change
const UNIVERSAL_TOKEN =
  process.env.TEST_TOKEN ||
  "eyJjbGllbnRJZCI6InRlc3QtY2xpZW50Iiwicm9vbSI6InJhZGlvIiwiZXhwaXJlc0F0Ijo0OTE0MDUzNDM1NjAwLCJtZXRhZGF0YSI6e30sImlzc3VlZEF0IjoxNzYwNDUzNDM1NjAwfQ.xiGw5MKTrsQhonWc8NFVJv6WiYXNUtBF52fBSmDF8J8";

const testData = {
  type: "post",
  timestamp: new Date().toISOString(),
  data: {
    content: { id: "6564", name: "Warhammer 40K" },
    advertiser: { id: "8", name: "Unlimited Radio" },
  },
};

// ============================================================================
// TEST FUNCTION
// ============================================================================

async function testPost() {
  console.log("🧪 Testing /room/radio/post endpoint...\n");

  // Check if token is set
  if (UNIVERSAL_TOKEN === "PASTE_YOUR_UNIVERSAL_TOKEN_HERE") {
    console.log("❌ ERROR: No token configured!");
    console.log("");
    console.log("To fix this:");
    console.log("1. Run: .\\generate-universal-tokens.ps1");
    console.log("2. Copy the 'test-client' token");
    console.log("3. Paste it in this file as UNIVERSAL_TOKEN");
    console.log("");
    console.log("Or run with environment variable:");
    console.log(
      '$env:TEST_TOKEN = "your-token-here"; node test-post-endpoint.js'
    );
    return;
  }

  console.log("📤 SENDING:");
  console.log(JSON.stringify(testData, null, 2));
  console.log("\nAdvertiser ID sent:", testData.data.advertiser.id);
  console.log("Type:", typeof testData.data.advertiser.id);

  const postData = JSON.stringify(testData);

  const options = {
    hostname: "localhost",
    port: 8080,
    path: "/room/radio/post",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      Authorization: `Bearer ${UNIVERSAL_TOKEN}`,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const result = JSON.parse(data);

          console.log("\n📥 RECEIVED:");
          console.log(JSON.stringify(result, null, 2));

          if (result.echo && result.echo.data && result.echo.data.advertiser) {
            console.log(
              "\n✅ Advertiser ID in response:",
              result.echo.data.advertiser.id
            );
            console.log("Type:", typeof result.echo.data.advertiser.id);

            if (
              result.echo.data.advertiser.id === testData.data.advertiser.id
            ) {
              console.log("\n🎉 SUCCESS: Advertiser ID matches!");
              console.log("Server is NOT modifying the data.");
            } else {
              console.log("\n❌ MISMATCH!");
              console.log("   Expected:", testData.data.advertiser.id);
              console.log("   Got:", result.echo.data.advertiser.id);
              console.log(
                "\n⚠️  This means the problem is in your client (Postman)!"
              );
            }
          } else if (result.error) {
            console.log("\n❌ ERROR:", result.error);
            if (result.error.includes("Authentication")) {
              console.log("\n💡 Token might be invalid. Generate a new one:");
              console.log("   .\\generate-universal-tokens.ps1");
            }
          } else {
            console.log("\n❌ ERROR: Unexpected response structure");
          }

          resolve();
        } catch (error) {
          console.error("\n❌ ERROR parsing response:", error.message);
          console.error("Raw response:", data);
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("\n❌ REQUEST ERROR:", error.message);
      if (error.code === "ECONNREFUSED") {
        console.log("\n💡 Server not running? Start it with: npm start");
      }
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// ============================================================================
// RUN TEST
// ============================================================================

testPost().catch((error) => {
  console.error("Test failed:", error.message);
  process.exit(1);
});
