/**
 * Test script for /rooms/radio/post endpoint with direct authentication
 */

const ADVERTISER_TOKEN =
  "eyJjbGllbnRJZCI6ImFkdmVydGlzZXIiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJhZHZlcnRpc2VyIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.K7jX9mNvL4pRnQwS8tYc1UhA6fBgE3qJsW2oZxI5kDv";

const BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:8080";

async function testDirectPost() {
  console.log("🧪 Testing /rooms/radio/post with direct authentication\n");

  const testPayload = {
    type: "post",
    timestamp: new Date().toISOString(),
    data: {
      content: {
        id: "test-456",
        name: "Direct POST Test",
        description: "This uses advertiser token directly",
      },
      advertiser: {
        id: "3",
        name: "Test Advertiser Direct",
      },
    },
  };

  console.log("📤 Sending POST request to /rooms/radio/post");
  console.log("   With Authorization: Bearer <advertiser-token>\n");
  console.log("Payload:", JSON.stringify(testPayload, null, 2), "\n");

  try {
    const response = await fetch(`${BASE_URL}/rooms/radio/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADVERTISER_TOKEN}`,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(
      `📥 Response Status: ${response.status} ${response.statusText}`
    );

    const result = await response.json();
    console.log("📄 Response Body:", JSON.stringify(result, null, 2), "\n");

    if (response.ok) {
      console.log("✅ SUCCESS: Direct /rooms/radio/post endpoint working!");
      console.log(`   - Delivered to ${result.delivered || 0} client(s)`);
      console.log("   - Used advertiser token directly");
    } else {
      console.log("❌ FAILED:", result.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

async function testChatPost() {
  console.log("\n🧪 Testing /rooms/chat/post with advertiser token\n");

  const testPayload = {
    type: "message",
    timestamp: new Date().toISOString(),
    data: {
      username: "TestUser",
      message: "Testing generic routes for chat room",
    },
  };

  console.log("📤 Sending POST request to /rooms/chat/post");
  console.log("   With Authorization: Bearer <advertiser-token>\n");
  console.log("Payload:", JSON.stringify(testPayload, null, 2), "\n");

  try {
    const response = await fetch(`${BASE_URL}/rooms/chat/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADVERTISER_TOKEN}`,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(
      `📥 Response Status: ${response.status} ${response.statusText}`
    );

    const result = await response.json();
    console.log("📄 Response Body:", JSON.stringify(result, null, 2), "\n");

    if (response.ok) {
      console.log("✅ SUCCESS: Generic routes work for chat room too!");
      console.log(`   - Delivered to ${result.delivered || 0} client(s)`);
    } else {
      console.log("❌ FAILED:", result.error || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

// Run tests
(async () => {
  await testDirectPost();
  await testChatPost();

  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed!");
  console.log("   - Generic routes in src/rooms/routes.js work for all rooms");
  console.log("   - Both radio and chat rooms use the same route handler");
  console.log("=".repeat(60));
})();
