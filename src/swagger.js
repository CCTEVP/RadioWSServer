/**
 * Swagger API Documentation Configuration
 *
 * This file defines the OpenAPI/Swagger specification for the RadioWSServer API.
 * It documents all available HTTP endpoints and WebSocket connections.
 */

import swaggerJsdoc from "swagger-jsdoc";

// Function to generate swagger specs with dynamic server URL
export function generateSwaggerSpecs(baseUrl) {
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Echo API",
        version: "0.1.0",
        description:
          "Real-time broadcast system with WebSocket support and HTTP API endpoints for content delivery and authentication",
      },
      servers: [
        {
          url: baseUrl,
          description: "Current server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description:
              "Authentication token required for protected endpoints",
          },
        },
        schemas: {
          AuthTokenRequest: {
            type: "object",
            required: ["clientId", "room"],
            properties: {
              clientId: {
                type: "string",
                description: "Unique identifier for the client",
                example: "user123",
              },
              room: {
                type: "string",
                description: "Room name the client wants to access",
                example: "radio",
              },
              metadata: {
                type: "object",
                description: "Additional metadata for the token",
                example: { userRole: "admin" },
              },
            },
          },
          AuthTokenResponse: {
            type: "object",
            properties: {
              token: {
                type: "string",
                description: "Authentication token",
                example: "eyJjbGllbnRJZCI6InVzZXIxMjMiLCJyb29tIjoicmFkaW8i...",
              },
              clientId: {
                type: "string",
                example: "user123",
              },
              room: {
                type: "string",
                example: "radio",
              },
              expiresAt: {
                type: "string",
                format: "date-time",
                description: "Token expiration timestamp",
                example: "2025-10-17T12:00:00.000Z",
              },
            },
          },
          RadioPostContent: {
            type: "object",
            required: ["type", "timestamp", "data"],
            properties: {
              type: {
                type: "string",
                description: "Message type identifier",
                example: "post",
              },
              timestamp: {
                type: "string",
                format: "date-time",
                description: "ISO 8601 timestamp",
                example: "2025-10-02T00:00:00Z",
              },
              data: {
                type: "object",
                description: "Content data payload",
                properties: {
                  content: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description: "Content identifier",
                        example: "6564",
                      },
                      name: {
                        type: "string",
                        description: "Content name",
                        example: "Marvel Thunderbolts",
                      },
                    },
                  },
                  advertiser: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                        description: "Advertiser identifier",
                        example: "3",
                      },
                      name: {
                        type: "string",
                        description: "Advertiser name",
                        example: "Total Radio",
                      },
                    },
                  },
                },
                example: {
                  content: { id: "6564", name: "Marvel Thunderbolts" },
                  advertiser: { id: "3", name: "Total Radio" },
                },
              },
            },
          },
          HealthResponse: {
            type: "object",
            properties: {
              status: {
                type: "string",
                example: "ok",
              },
              uptime: {
                type: "number",
                description: "Server uptime in seconds",
                example: 3600,
              },
              clients: {
                type: "number",
                description:
                  "Total number of connected WebSocket clients across all rooms",
                example: 10,
              },
              rooms: {
                type: "object",
                description: "Detailed statistics for each room",
                additionalProperties: {
                  type: "object",
                  properties: {
                    clients: {
                      type: "object",
                      description: "Detailed client information",
                      properties: {
                        total: {
                          type: "number",
                          description: "Total number of clients in this room",
                          example: 10,
                        },
                        details: {
                          type: "array",
                          description: "Array of connected client details",
                          items: {
                            type: "object",
                            properties: {
                              id: {
                                type: "string",
                                description:
                                  "Client identifier from authentication token",
                                example: "screen",
                              },
                              connected: {
                                type: "string",
                                description:
                                  "Human-readable duration of connection",
                                example: "2m 45s",
                              },
                              joinedAt: {
                                type: "string",
                                format: "date-time",
                                description:
                                  "ISO timestamp when client connected",
                                example: "2025-10-17T08:00:00.000Z",
                              },
                              lastActivity: {
                                type: "string",
                                format: "date-time",
                                description:
                                  "ISO timestamp of last client activity",
                                example: "2025-10-17T08:02:30.000Z",
                              },
                              messageCount: {
                                type: "number",
                                description:
                                  "Number of messages sent by this client",
                                example: 5,
                              },
                              clientAddress: {
                                type: "string",
                                description: "Client IP address and port",
                                example: "192.168.1.100:54321",
                              },
                              userAgent: {
                                type: "string",
                                description: "Client user agent string",
                                example: "Mozilla/5.0...",
                              },
                            },
                          },
                        },
                      },
                    },
                    contentHistorySize: {
                      type: "number",
                      description:
                        "Number of recent content items stored (radio room only)",
                      example: 10,
                    },
                    lastContent: {
                      type: "string",
                      format: "date-time",
                      description:
                        "Timestamp of last content broadcast (radio room only)",
                      example: "2025-10-17T08:02:36.157Z",
                    },
                    hasCustomHandler: {
                      type: "boolean",
                      description: "Whether the room has a custom handler",
                      example: true,
                    },
                  },
                },
              },
              registeredHandlers: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "List of registered room handlers",
                example: ["radio", "chat"],
              },
            },
          },
          Error: {
            type: "object",
            properties: {
              error: {
                type: "string",
                description: "Error message",
                example: "Invalid request",
              },
            },
          },
        },
      },
      tags: [
        {
          name: "Health",
          description: "Server health and status endpoints",
        },
        {
          name: "Authentication",
          description: "Token generation and validation",
        },
        {
          name: "Radio Content",
          description: "Radio room content broadcasting",
        },
        {
          name: "Legacy",
          description: "Backward compatibility endpoints (deprecated)",
        },
        {
          name: "WebSocket",
          description: "WebSocket connection information",
        },
      ],
      paths: {
        "/": {
          get: {
            tags: ["Documentation"],
            summary: "Root endpoint - Redirects to documentation",
            description:
              "Automatically redirects to /docs endpoint. Authentication will be triggered if not already logged in.",
            responses: {
              302: {
                description: "Redirect to /docs",
                headers: {
                  Location: {
                    schema: {
                      type: "string",
                      example: "/docs",
                    },
                    description: "Redirect location",
                  },
                },
              },
            },
          },
        },
        "/health": {
          get: {
            tags: ["Health"],
            summary: "Get server health status",
            description:
              "Returns server status, uptime, connected clients, and room statistics. Use ?detailed=true for comprehensive client information.",
            parameters: [
              {
                name: "detailed",
                in: "query",
                required: false,
                schema: {
                  type: "string",
                  enum: ["true", "false"],
                  default: "false",
                },
                description:
                  "Enable detailed client information (accepted values: true, 1, yes). Omit or use any other value for minimal response.",
                example: "true",
              },
            ],
            responses: {
              200: {
                description: "Server health information",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/HealthResponse",
                    },
                  },
                },
              },
            },
          },
        },
        "/auth/token": {
          post: {
            tags: ["Authentication"],
            summary: "Generate authentication token",
            description:
              "Creates a new authentication token for accessing protected endpoints and WebSocket rooms. Tokens expire automatically after 1 hour. For permanent access, trusted clients should use the hardcoded always-valid token.",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/AuthTokenRequest",
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Token generated successfully",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/AuthTokenResponse",
                    },
                  },
                },
              },
              400: {
                description: "Invalid request parameters",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Error",
                    },
                  },
                },
              },
            },
          },
          options: {
            tags: ["Authentication"],
            summary: "CORS preflight for token endpoint",
            description:
              "Handles CORS preflight requests for the token endpoint",
            responses: {
              204: {
                description: "CORS preflight successful",
              },
            },
          },
        },
        "/rooms/radio/post": {
          post: {
            tags: ["Radio Content"],
            summary: "Broadcast content to radio room",
            description:
              "Sends content to all connected clients in the radio room. Requires authentication.",
            security: [
              {
                bearerAuth: [],
              },
            ],
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/RadioPostContent",
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Content broadcast successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: {
                          type: "boolean",
                          example: true,
                        },
                        message: {
                          type: "string",
                          example: "Content broadcast to radio room",
                        },
                        broadcastCount: {
                          type: "number",
                          description:
                            "Number of clients that received the message",
                          example: 5,
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "Invalid content format",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Error",
                    },
                  },
                },
              },
              401: {
                description: "Authentication required",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Error",
                    },
                  },
                },
              },
              413: {
                description: "Payload too large",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Error",
                    },
                  },
                },
              },
            },
          },
          options: {
            tags: ["Radio Content"],
            summary: "CORS preflight for radio post endpoint",
            description:
              "Handles CORS preflight requests for the radio content posting endpoint",
            responses: {
              204: {
                description: "CORS preflight successful",
              },
            },
          },
        },
        "/postcontent": {
          post: {
            tags: ["Legacy"],
            summary: "Legacy content posting endpoint",
            description:
              "DEPRECATED: Legacy endpoint that forwards to /rooms/radio/post without authentication. Use /rooms/radio/post instead.",
            deprecated: true,
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/RadioPostContent",
                  },
                },
              },
            },
            responses: {
              200: {
                description: "Content forwarded successfully",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        success: {
                          type: "boolean",
                          example: true,
                        },
                        message: {
                          type: "string",
                          example: "Content broadcast via legacy endpoint",
                        },
                      },
                    },
                  },
                },
              },
              400: {
                description: "Invalid content format",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Error",
                    },
                  },
                },
              },
              413: {
                description: "Payload too large",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Error",
                    },
                  },
                },
              },
            },
          },
          options: {
            tags: ["Legacy"],
            summary: "CORS preflight for legacy endpoint",
            description:
              "Handles CORS preflight requests for the legacy postcontent endpoint",
            deprecated: true,
            responses: {
              204: {
                description: "CORS preflight successful",
              },
            },
          },
        },
      },
    },
    apis: [], // We're defining everything inline above
  };

  // Add WebSocket documentation
  options.definition.paths["/ws"] = {
    get: {
      tags: ["WebSocket"],
      summary: "WebSocket connection endpoint",
      description:
        "Establishes a WebSocket connection for real-time communication. Requires authentication token.",
      parameters: [
        {
          name: "token",
          in: "query",
          required: true,
          schema: {
            type: "string",
          },
          description:
            "Authentication token (can also be provided via Authorization header)",
          example: "eyJjbGllbnRJZCI6InVzZXIxMjMiLCJyb29tIjoicmFkaW8i...",
        },
        {
          name: "room",
          in: "query",
          required: false,
          schema: {
            type: "string",
          },
          description:
            "Room name to join (extracted from token if not provided)",
          example: "radio",
        },
      ],
      responses: {
        101: {
          description: "WebSocket connection established successfully",
        },
        401: {
          description: "Authentication failed - invalid or expired token",
        },
        403: {
          description: "Access denied - token not valid for requested room",
        },
      },
    },
  };

  const specs = swaggerJsdoc(options);
  return specs;
}

// Default export for backward compatibility (uses localhost)
export default generateSwaggerSpecs("http://localhost:8080");
