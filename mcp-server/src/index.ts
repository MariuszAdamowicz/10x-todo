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

app.get("/", (c) => c.text("10x-Todo MCP Server is Online."));

// Map to store active transports
const activeSessions = new Map<string, SSEServerTransport>();

/**
 * Robust MCP SSE Endpoint using Path Parameters
 * Format: /mcp/:apiKey/:encodedApiUrl
 */
app.get("/mcp/:apiKey/:encodedApiUrl", async (c) => {
  const apiKey = c.req.param("apiKey");
  // Decode the URL (it might be base64 or just url-encoded)
  let apiUrl = "";
  try {
    const rawUrl = c.req.param("encodedApiUrl");
    // Simple Base64 decode for Cloudflare
    apiUrl = rawUrl.startsWith("http") ? rawUrl : atob(rawUrl);
  } catch {
    return c.text("Invalid encodedApiUrl. Use Base64.", 400);
  }

  const config = validateConfig({ TODO_API_KEY: apiKey, TODO_API_URL: apiUrl });
  const apiClient = new ApiClient(config);
  const server = new McpServer({ name: "10x-todo-mcp", version: "1.0.0" });

  getTools(apiClient).forEach((t) => server.tool(t.name, t.description, t.inputSchema.shape, t.execute));
  getResources(apiClient).forEach((r) => server.resource(r.name, r.uri, async () => ({ contents: await r.read() })));
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

  const transport = new SSEServerTransport(`${baseUrl}/post/${sessionId}`, responseBridge as unknown as Response);

  activeSessions.set(sessionId, transport);
  transport.onclose = () => activeSessions.delete(sessionId);

  await server.connect(transport);

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

/**
 * Message receiver endpoint
 */
app.post("/post/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const transport = activeSessions.get(sessionId);

  if (!transport) {
    return c.text("Session not found", 404);
  }

  try {
    const body = await c.req.json();
    // @ts-expect-error - bypass stateful node streams
    if (transport.onmessage) transport.onmessage(body);
    return c.text("OK");
  } catch (e) {
    return c.text(String(e), 500);
  }
});

export default app;
