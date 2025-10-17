/**
 * Test script for /postcontent backward compatibility endpoint
 *
 * This tests that /postcontent acts as a bridge to /room/radio/post
 * using the hardcoded advertiser token internally.
 */

const BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:8080";

async function testPostContent() {
  console.log("🧪 Testing /postcontent bridge endpoint\n");

  const testPayload = {
    type: "post",
    timestamp: new Date().toISOString(),
    data: {
      content: {
        id: "test-123",
        name: "Test Content via /postcontent",
        description: "This should be forwarded using advertiser token",
      },
      advertiser: {
        id: "3",
        name: "Test Advertiser",
      },
    },
  };

  console.log("📤 Sending POST request to /postcontent");
  console.log(
    "   (No Authorization header - should use internal advertiser token)\n"
  );
  console.log("Payload:", JSON.stringify(testPayload, null, 2), "\n");

  try {
    const response = await fetch(`${BASE_URL}/postcontent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    console.log(
      `📥 Response Status: ${response.status} ${response.statusText}`
    );

    const result = await response.json();
    console.log("📄 Response Body:", JSON.stringify(result, null, 2), "\n");

    if (response.ok) {
      console.log("✅ SUCCESS: /postcontent bridge is working!");
      console.log(`   - Delivered to ${result.delivered || 0} client(s)`);
      console.log("   - Used advertiser token internally");
    } else {
      console.log("❌ FAILED:", result.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

async function checkHealth() {
  console.log("\n📊 Checking health endpoint for advertiser client...\n");

  try {
    const response = await fetch(`${BASE_URL}/health?detailed=true`);
    const health = await response.json();

    if (health.rooms?.radio?.clients?.details) {
      const advertiserClient = health.rooms.radio.clients.details.find(
        (c) => c.id === "advertiser"
      );

      if (advertiserClient) {
        console.log("✅ Advertiser client found in health data:");
        console.log(`   - Client ID: ${advertiserClient.id}`);
        console.log(`   - Connected: ${advertiserClient.connected}`);
        console.log(
          `   - Message Count: ${advertiserClient.messageCount || 0}`
        );
      } else {
        console.log(
          "ℹ️  No advertiser client currently connected via WebSocket"
        );
        console.log("   (This is normal - /postcontent uses HTTP bridge)");
      }
    }
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
  }
}

// Run tests
(async () => {
  await testPostContent();
  await checkHealth();
})();
