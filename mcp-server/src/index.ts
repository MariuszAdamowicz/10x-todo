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

// Map to store active transports by session ID
const activeSessions = new Map<string, SSEServerTransport>();

app.get("/sse", async (c) => {
  // Extract config from query params OR Cloudflare env

  const configSource = {
    TODO_API_URL:
      c.req.query("TODO_API_URL") ||
      c.req.query("apiUrl") ||
      (c.env as Record<string, string | undefined>)?.TODO_API_URL,

    TODO_API_KEY:
      c.req.query("TODO_API_KEY") ||
      c.req.query("apiKey") ||
      (c.env as Record<string, string | undefined>)?.TODO_API_KEY,
  };

  const config = validateConfig(configSource);

  const apiClient = new ApiClient(config);

  const server = new McpServer({
    name: "10x-todo-mcp",

    version: "1.0.0",
  });

  // Register tools/resources with the specific apiClient for this session

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

  const sessionId = crypto.randomUUID();

  // Using a custom endpoint for messages that includes the session ID

  const transport = new SSEServerTransport("/message?sessionId=${sessionId}", c.res as unknown as Response);

  activeSessions.set(sessionId, transport);
  transport.onclose = () => activeSessions.delete(sessionId);

  await server.connect(transport);
  return c.res;
});

app.post("/message", async (c) => {
  const sessionId = c.req.query("sessionId");
  const transport = sessionId ? activeSessions.get(sessionId) : null;

  if (!transport) return c.text("Session not found", 404);

  // @ts-expect-error - Hono request type mismatch
  await transport.handlePostMessage(c.req.raw, c.res);
  return c.text("OK");
});

export default app;
