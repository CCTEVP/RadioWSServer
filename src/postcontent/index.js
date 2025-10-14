/**
 * BACKWARD COMPATIBILITY ENDPOINT
 *
 * This module provides the legacy /postcontent endpoint that forwards
 * requests to the /radio/post endpoint without requiring authentication.
 *
 * This exists for backward compatibility with old clients.
 * Can be safely removed once all clients migrate to /radio/post
 */

export function handlePostContentRequest(
  req,
  res,
  roomRegistry,
  broadcastToRoom
) {
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

    // Validate required fields
    const errors = [];
    if (!body || typeof body !== "object")
      errors.push("Body must be a JSON object");
    if (!("type" in body)) errors.push("Missing field: type");
    if (!("timestamp" in body)) errors.push("Missing field: timestamp");
    if (!("data" in body)) errors.push("Missing field: data");

    if (errors.length) {
      res.writeHead(422, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: "Validation failed", details: errors }));
      return;
    }

    // Forward to radio room
    const handler = roomRegistry.getHandler("radio");
    if (!handler) {
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: "Radio room handler not found" }));
      return;
    }

    // Validate with radio handler
    const validationError = await handler.validateHttpPost(body);
    if (validationError) {
      res.writeHead(validationError.code || 422, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
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
      res.writeHead(403, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: "Rejected by room handler" }));
      return;
    }

    // Use handler's modified payload if provided
    if (handlerResult !== null && handlerResult !== undefined) {
      broadcastPayload = handlerResult;
    }

    // Broadcast to radio room
    const delivered = broadcastToRoom("radio", broadcastPayload);

    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(
      JSON.stringify({
        status: "ok",
        room: "radio",
        delivered,
        echo: broadcastPayload,
      })
    );
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
