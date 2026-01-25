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

// Health check and diagnostic route
app.get("/", (c) => {
  return c.json({
    status: "online",
    service: "10x-todo-mcp",
    message: "MCP Server is running. Use /sse to connect.",
  });
});

// Map to store active transports by session ID
// NOTE: On Cloudflare Workers, this relies on isolate reuse.
const activeSessions = new Map<string, SSEServerTransport>();

app.get("/sse", async (c) => {
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
  const baseUrl = new URL(c.req.url).origin;

  // Create a bridge between Web Streams and Node-like response expected by the SDK
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const responseBridge = {
    writeHead: () => {
      /* noop */
    },
    write: (chunk: unknown) => writer.write(encoder.encode(typeof chunk === "string" ? chunk : JSON.stringify(chunk))),
    end: () => writer.close(),
    on: () => {
      /* noop */
    },
    once: () => {
      /* noop */
    },
    removeListener: () => {
      /* noop */
    },
    emit: () => true,
  };

  // We use an ABSOLUTE path that the client will POST to.
  // This is safer for remote clients like Cursor.
  const transport = new SSEServerTransport(`${baseUrl}/message`, responseBridge as unknown as Response);

  // Override the endpoint to include the sessionId in the absolute URL
  // @ts-expect-error - overriding internal property to include session ID and make it absolute
  transport._endpoint = `${baseUrl}/message?sessionId=${sessionId}`;

  activeSessions.set(sessionId, transport);
  transport.onclose = () => {
    activeSessions.delete(sessionId);
    writer.close();
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
    return c.text(`Session ${sessionId} not found. Connection might have timed out or isolate recycled.`, 404);
  }

  try {
    const body = await c.req.json();
    // @ts-expect-error - Hono request type mismatch
    await transport.handlePostMessage(body, c.res as unknown as Response);
    return c.text("OK");
  } catch (error) {
    return c.text(String(error), 500);
  }
});

export default app;
