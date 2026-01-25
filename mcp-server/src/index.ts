import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { tools } from "./tools/index.js";
import { resources } from "./resources/index.js";
import { prompts } from "./prompts/index.js";

const app = new Hono();
app.use("*", cors());

const server = new McpServer({
  name: "10x-todo-mcp",
  version: "1.0.0",
});

// Register MCP elements
tools.forEach((tool) => server.tool(tool.name, tool.description, tool.inputSchema.shape, tool.execute));
resources.forEach((res) => server.resource(res.name, res.uri, async () => ({ contents: await res.read() })));
prompts.forEach((p) => server.prompt(p.name, p.description, async () => ({ messages: p.messages })));

let transport: SSEServerTransport | null = null;

app.get("/sse", async (c) => {
  // @ts-expect-error - Hono response type mismatch with MCP SDK expectation
  transport = new SSEServerTransport("/message", c.res);
  await server.connect(transport);
  return c.res;
});

app.post("/message", async (c) => {
  if (!transport) return c.text("No active session", 400);
  // @ts-expect-error - Hono request type mismatch with MCP SDK expectation
  await transport.handlePostMessage(c.req.raw, c.res);
  return c.text("OK");
});

export default app;
