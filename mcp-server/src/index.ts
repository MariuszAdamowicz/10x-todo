import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { validateConfig } from "./config.js";
import { ApiClient } from "./api-client.js";
import { getTools } from "./tools/index.js";
import { getResources } from "./resources/index.js";
import { prompts } from "./prompts/index.js";

const app = new Hono();
app.use("*", cors());

// Helper to create and configure an MCP server instance

function createMcpServer(env: Record<string, string | undefined>) {
  const config = validateConfig(env);

  const apiClient = new ApiClient(config);

  const server = new McpServer({
    name: "10x-todo-mcp",

    version: "1.0.0",
  });

  // Register MCP elements with the request-specific ApiClient

  getTools(apiClient).forEach((tool) => server.tool(tool.name, tool.description, tool.inputSchema.shape, tool.execute));

  getResources(apiClient).forEach((res) =>
    server.resource(res.name, res.uri, async () => ({ contents: await res.read() }))
  );

  prompts.forEach((p) =>
    server.prompt(
      p.name,

      p.description,

      // @ts-expect-error - SDK mismatch

      async () => ({ messages: p.messages })
    )
  );

  return server;
}

// In-memory store for active transports

// NOTE: This is ephemeral and limited by isolate lifetime.

const activeSessions = new Map<string, { server: McpServer; transport: SSEServerTransport }>();

app.get("/sse", async (c) => {
  const sessionId = crypto.randomUUID();

  const server = createMcpServer(c.env as Record<string, string | undefined>);

  const transport = new SSEServerTransport("/message", c.res as unknown as Response);

  activeSessions.set(sessionId, { server, transport });

  transport.onclose = () => {
    activeSessions.delete(sessionId);
  };

  await server.connect(transport);

  // Return the SSE stream
  return c.res;
});

app.post("/message", async (c) => {
  // Since we only support one global transport in this simplified bridging,
  // we'll just use the last active one or implement session IDs in headers/query.
  // For standard MCP SSE, the message post URL is provided by the server in the SSE stream.
  const transport = Array.from(activeSessions.values())[0]?.transport;

  if (!transport) {
    return c.text("No active MCP session found", 400);
  }

  // @ts-expect-error - Hono request type mismatch with MCP SDK expectation
  await transport.handlePostMessage(c.req.raw as unknown as Request, c.res as unknown as Response);
  return c.text("OK");
});

export default app;
