/**
 * Generate a test token for testing purposes
 * This will generate a 100-year token for the "test-client" in "radio" room
 */

import http from "http";

const hundredYears = 100 * 365 * 24 * 60 * 60 * 1000;

const tokenRequest = {
  clientId: "test-client",
  room: "radio",
  expiresIn: hundredYears,
};

async function generateToken() {
  console.log("🎫 Generating universal test token...\n");

  const postData = JSON.stringify(tokenRequest);

  const options = {
    hostname: "localhost",
    port: 8080,
    path: "/auth/token",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
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

          if (result.token) {
            console.log("✅ Token generated successfully!\n");
            console.log("Client ID:", result.clientId);
            console.log("Room:", result.room);
            console.log("Expires:", result.expiresAt);
            console.log("\n" + "=".repeat(60));
            console.log("TOKEN:");
            console.log("=".repeat(60));
            console.log(result.token);
            console.log("=".repeat(60));
            console.log("\n💡 To use this token in test-post-endpoint.js:");
            console.log("1. Copy the token above");
            console.log("2. Paste it as UNIVERSAL_TOKEN value");
            console.log("\n💡 Or run the test directly with:");
            console.log(
              `$env:TEST_TOKEN = "${result.token}"; node test-post-endpoint.js`
            );
            resolve(result.token);
          } else if (result.error) {
            console.error("❌ Error:", result.error);
            reject(new Error(result.error));
          } else {
            console.error("❌ Unexpected response:", result);
            reject(new Error("Unexpected response format"));
          }
        } catch (error) {
          console.error("❌ Error parsing response:", error.message);
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ Request error:", error.message);
      if (error.code === "ECONNREFUSED") {
        console.log("\n💡 Server not running? Start it with: npm start");
      }
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

generateToken().catch((error) => {
  console.error("Failed to generate token:", error.message);
  process.exit(1);
});
