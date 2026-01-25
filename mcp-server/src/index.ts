import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { validateConfig } from "./config.js";
import { ApiClient } from "./api-client.js";
import { getTools } from "./tools/index.js";
import { getResources } from "./resources/index.js";
import { prompts } from "./prompts/index.js";

interface Bindings {
  TODO_API_URL?: string;
  TODO_API_KEY?: string;
}

const app = new Hono<{ Bindings: Bindings }>();
app.use("*", cors());

// Health check
app.get("/", (c) => c.text("10x-Todo MCP Server is Online. Use /sse to connect."));

// In-memory store for active transports
const activeSessions = new Map<string, SSEServerTransport>();

app.get("/sse", async (c) => {
  // Extract configuration from query params (passed by client)
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

  // Register all tools and resources
  getTools(apiClient).forEach((tool) => server.tool(tool.name, tool.description, tool.inputSchema.shape, tool.execute));
  getResources(apiClient).forEach((res) =>
    server.resource(res.name, res.uri, async () => ({ contents: await res.read() }))
  );
  prompts.forEach((p) =>
    server.prompt(
      p.name,
      p.description,
      // @ts-expect-error - SDK version mismatch in types
      async () => ({ messages: p.messages })
    )
  );

  const sessionId = crypto.randomUUID();
  const baseUrl = new URL(c.req.url).origin;

  // Bridge Hono response to Web Stream
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const responseBridge = {
    writeHead: () => {
      /* noop */
    },
    write: (chunk: unknown) => {
      const text = typeof chunk === "string" ? chunk : JSON.stringify(chunk);
      writer.write(encoder.encode(text));
    },
    end: () => {
      try {
        writer.close();
      } catch {
        /* already closed */
      }
    },
    on: () => {
      /* noop */
    },
    once: () => {
      /* noop */
    },
    emit: () => true,
    removeListener: () => {
      /* noop */
    },
  };

  // We use an absolute URL for the message endpoint to help remote clients
  const transport = new SSEServerTransport(
    `${baseUrl}/message?sessionId=${sessionId}`,
    responseBridge as unknown as Response
  );

  activeSessions.set(sessionId, transport);
  transport.onclose = () => {
    activeSessions.delete(sessionId);
    responseBridge.end();
  };

  await server.connect(transport);

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

app.post("/message", async (c) => {
  const sessionId = c.req.query("sessionId");
  const transport = sessionId ? activeSessions.get(sessionId) : null;

  if (!transport) {
    return c.text(`Session ${sessionId} not found. Connection may have timed out.`, 404);
  }

  try {
    const body = await c.req.json();
    // Directly inject the message into the transport bypasssing Node stream emulation
    // @ts-expect-error - accessing internal handler for Cloudflare compatibility
    if (transport.onmessage) {
      // @ts-expect-error - internal SDK call
      transport.onmessage(body);
    }
    return c.text("Accepted");
  } catch (error) {
    return c.text(String(error), 500);
  }
});

export default app;
