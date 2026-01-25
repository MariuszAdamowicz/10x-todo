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

// Health check and diagnostic
app.get("/", (c) => {
  return c.text(
    `10x-Todo MCP Server is Online.\n\nUsage:\n- GET /sse: Connect via SSE\n- POST /message/:sessionId: Send messages`
  );
});

// In-memory store for active transports
// NOTE: On Cloudflare Workers, this depends on isolate reuse.
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
        /* ignore */
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

  // We use a PATH PARAMETER for the session ID instead of a query parameter.
  // Some clients might strip query params from the endpoint.
  const transport = new SSEServerTransport(`${baseUrl}/message/${sessionId}`, responseBridge as unknown as Response);

  activeSessions.set(sessionId, transport);

  transport.onclose = () => {
    activeSessions.delete(sessionId);
    try {
      writer.close();
    } catch {
      /* already closed */
    }
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

// Changed to path parameter for robustness
app.post("/message/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const transport = activeSessions.get(sessionId);

  if (!transport) {
    return c.text(`Session ${sessionId} not found. Connection may have timed out or isolate recycled.`, 404);
  }

  try {
    const body = await c.req.json();
    // Directly inject message
    // @ts-expect-error - accessing internal property
    if (transport.onmessage) {
      // @ts-expect-error - internal call
      transport.onmessage(body);
    }
    return c.text("Accepted");
  } catch (error) {
    return c.text(String(error), 500);
  }
});

export default app;
