/**
 * Generic HTTP Routes for all rooms
 *
 * This module defines HTTP endpoints that work for ANY room.
 * Room-specific logic is delegated to the room's handler.
 */

/**
 * Handle POST /room/:roomName/post
 *
 * Broadcasts content to all clients in the specified room.
 * Requires authentication and validates content structure.
 *
 * This is a generic handler that works for any room (radio, chat, etc.)
 * Room-specific validation and processing is done by the room's handler.
 */
export async function handlePost(
  req,
  res,
  authPayload,
  handler,
  broadcastToRoom,
  broadcastToControlRoom,
  enqueueRoomBroadcast
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

    // Let handler validate (room-specific validation)
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

    // Let handler process/modify the payload (room-specific processing)
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

    const broadcastContext = {
      type: "http",
      original: body,
      processed: broadcastPayload,
      authPayload,
      roomName: handler.roomName,
    };

    const broadcastDelay = await handler.getBroadcastDelay(broadcastContext);

    let delivered = 0;
    const broadcastPromise = enqueueRoomBroadcast(
      handler.roomName,
      broadcastDelay,
      async () => {
        delivered = broadcastToRoom(handler.roomName, broadcastPayload);

        if (typeof broadcastToControlRoom === "function") {
          const controlPayload = await handler.getControlPayload(
            broadcastContext
          );

          if (controlPayload) {
            broadcastToControlRoom(handler.roomName, controlPayload);
          }
        }
      }
    );

    await broadcastPromise;

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
 * Generic route configuration for all rooms
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
