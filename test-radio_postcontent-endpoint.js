/**
 * Test script to verify /postcontent endpoint (LEGACY ENDPOINT)
 * Run this to test the backward compatibility endpoint
 *
 * NOTE: This endpoint does NOT require authentication
 * It's meant for legacy clients that haven't migrated to /room/radio/post
 *
 * SETUP REQUIRED:
 * 1. Start the server (npm start)
 * 2. Run this test: node test-postcontent-endpoint.js
 *
 * When all clients migrate to /room/radio/post, you can:
 * - Delete the /src/postcontent/ folder
 * - Delete this test file
 */

import http from "http";

// ============================================================================
// CONFIGURATION
// ============================================================================

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

async function testPostContent() {
  console.log("🧪 Testing /postcontent endpoint (LEGACY)...\n");
  console.log("⚠️  This endpoint is for backward compatibility only");
  console.log(
    "⚠️  New clients should use /room/radio/post with authentication\n"
  );

  console.log("📤 SENDING:");
  console.log(JSON.stringify(testData, null, 2));
  console.log("\nAdvertiser ID sent:", testData.data.advertiser.id);
  console.log("Type:", typeof testData.data.advertiser.id);

  const postData = JSON.stringify(testData);

  const options = {
    hostname: "localhost",
    port: 8080,
    path: "/postcontent",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
      // NOTE: No Authorization header - this endpoint doesn't require it!
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
              console.log("Server is correctly forwarding to radio room.");
              console.log("Legacy /postcontent endpoint is working!");
            } else {
              console.log("\n❌ MISMATCH!");
              console.log("   Expected:", testData.data.advertiser.id);
              console.log("   Got:", result.echo.data.advertiser.id);
              console.log("\n⚠️  Data was modified somewhere in the chain!");
            }
          } else if (result.error) {
            console.log("\n❌ ERROR:", result.error);
            if (result.details) {
              console.log("Details:", result.details);
            }
          } else {
            console.log("\n❌ ERROR: Unexpected response structure");
          }

          // Check that it was delivered to the radio room
          if (result.room === "radio") {
            console.log("\n✅ Confirmed: Message delivered to radio room");
          }

          if (result.delivered !== undefined) {
            console.log(
              `✅ Confirmed: Broadcast to ${result.delivered} client(s)`
            );
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

testPostContent().catch((error) => {
  console.error("Test failed:", error.message);
  process.exit(1);
});
