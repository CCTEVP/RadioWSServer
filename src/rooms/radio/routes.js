/**
 * HTTP Routes for radio room
 *
 * This module defines HTTP endpoints specific to the radio room.
 * Each room can have its own routes organized in this pattern.
 */

/**
 * Handle POST /radio/post
 *
 * Broadcasts content to all clients in the radio room.
 * Requires authentication and validates content structure.
 */
export async function handlePost(
  req,
  res,
  authPayload,
  handler,
  broadcastToRoom
) {
  const MAX_POST_BYTES = parseInt(
    process.env.POST_CONTENT_MAX_BYTES || "262144",
    10
  ); // 256KB default

  let raw = "";
  let received = 0;

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
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid JSON" }));
      return;
    }

    // Mandatory fields validation: type, timestamp, data
    const errors = [];
    if (!body || typeof body !== "object")
      errors.push("Body must be a JSON object");
    if (!("type" in body)) errors.push("Missing field: type");
    if (!("timestamp" in body)) errors.push("Missing field: timestamp");
    if (!("data" in body)) errors.push("Missing field: data");

    if (body && typeof body.type !== "string")
      errors.push("Field type must be a string");
    if (body && typeof body.timestamp === "string") {
      if (isNaN(Date.parse(body.timestamp)))
        errors.push("timestamp must be an ISO-8601 date string");
    } else if (body) {
      errors.push("timestamp must be a string");
    }
    if (
      body &&
      (typeof body.data !== "object" ||
        body.data === null ||
        Array.isArray(body.data))
    ) {
      errors.push("data must be a non-null JSON object");
    }

    if (errors.length) {
      res.writeHead(422, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Validation failed", details: errors }));
      return;
    }

    // Let handler validate
    const validationError = await handler.validateHttpPost(body);
    if (validationError) {
      res.writeHead(validationError.code || 422, {
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ error: validationError.error }));
      return;
    }

    // Attach server receipt timestamp
    let broadcastPayload = {
      ...body,
      serverReceivedAt: new Date().toISOString(),
    };

    // Let handler process/modify the payload
    const handlerResult = await handler.onHttpPost(broadcastPayload);
    if (handlerResult === false) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Rejected by room handler" }));
      return;
    }

    // Use handler's modified payload if provided
    if (handlerResult !== null && handlerResult !== undefined) {
      broadcastPayload = handlerResult;
    }

    // Broadcast only to clients in the radio room
    const delivered = broadcastToRoom(handler.roomName, broadcastPayload);

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(
      JSON.stringify({
        status: "ok",
        room: handler.roomName,
        delivered,
        echo: broadcastPayload,
      })
    );
  });
}

/**
 * Route configuration for radio room
 * Each route specifies: method, path pattern, handler function
 */
export const routes = [
  {
    method: "POST",
    path: "/post",
    requiresAuth: true,
    handler: handlePost,
  },
  {
    method: "OPTIONS",
    path: "/post",
    requiresAuth: false,
    handler: async (req, res) => {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      res.end();
    },
  },
];
