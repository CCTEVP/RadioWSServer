/**
 * BACKWARD COMPATIBILITY ENDPOINT
 *
 * This module provides the legacy /postcontent endpoint that acts as a bridge
 * to /rooms/radio/post using the hardcoded "advertiser" token.
 *
 * This exists for backward compatibility with old clients that don't send tokens.
 * Can be safely removed once all clients migrate to /rooms/radio/post
 */

import http from "http";

// Hardcoded advertiser token for backward compatibility
const ADVERTISER_TOKEN =
  "eyJjbGllbnRJZCI6ImFkdmVydGlzZXIiLCJyb29tIjoicmFkaW8iLCJleHBpcmVzQXQiOjQ5MTQxMjE1NjY0NjQsIm1ldGFkYXRhIjp7InJvbGUiOiJhZHZlcnRpc2VyIiwidmFsaWRpdHkiOiJObyBleHBpcmF0aW9uIn0sImlzc3VlZEF0IjoxNzYwNTIxNTY2NDY0fQ.K7jX9mNvL4pRnQwS8tYc1UhA6fBgE3qJsW2oZxI5kDv";

export function handlePostContentRequest(req, res) {
  let raw = "";
  let received = 0;
  const MAX_POST_BYTES = parseInt(
    process.env.POST_CONTENT_MAX_BYTES || "262144",
    10
  );

  req.on("data", (chunk) => {
    received += chunk.length;
    if (received > MAX_POST_BYTES) {
      res.writeHead(413, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Payload too large" }));
      req.destroy();
      return;
    }
    raw += chunk;
  });

  req.on("end", async () => {
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch (_) {
      res.writeHead(400, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    // Bridge to /rooms/radio/post with advertiser token
    const port = process.env.PORT || 8080;
    const options = {
      hostname: "localhost",
      port: port,
      path: "/rooms/radio/post",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADVERTISER_TOKEN}`,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      let responseData = "";

      proxyRes.on("data", (chunk) => {
        responseData += chunk;
      });

      proxyRes.on("end", () => {
        // Forward the response from /room/radio/post
        res.writeHead(proxyRes.statusCode, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(responseData);
      });
    });

    proxyReq.on("error", (error) => {
      console.error("❌ Bridge error:", error);
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(
        JSON.stringify({
          error: "Failed to forward request to /rooms/radio/post",
        })
      );
    });

    // Send the original body to the target endpoint
    proxyReq.write(JSON.stringify(body));
    proxyReq.end();
  });
}

export function handlePostContentOptions(req, res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end();
}
