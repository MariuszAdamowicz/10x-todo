import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { tools } from "./tools/index.js";
import { resources } from "./resources/index.js";
import { setApiClientConfig } from "./api-client.js";

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware do parsowania JSON (musi być przed endpointami)
app.use(express.json());

// Wczytywanie promptów z JSON
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const promptsPath = join(__dirname, "prompts", "prompts.json");
const promptsData = JSON.parse(readFileSync(promptsPath, "utf-8"));

interface Prompt {
  name: string;
  description?: string;
  messages: {
    role: "user" | "assistant";
    content: { type: "text"; text: string };
  }[];
}

const FULL_PROTOCOL_ENFORCEMENT = `
============== 🛑 STRICT WORKFLOW ENFORCEMENT 🛑 ==============
YOU ARE AN AUTONOMOUS AGENT. ALL YOUR ACTIONS MUST BE TRACKED IN MCP.
... (protocol content) ...
===============================================================
`;

const transports = new Map<string, SSEServerTransport>();

const decodeConfig = (apiKey: string, encodedApiUrl: string) => {
  const apiUrl = Buffer.from(encodedApiUrl, "base64").toString("utf-8");
  return { apiKey, apiUrl };
};

// --- SSE HANDLERY ---
app.get("/:apiKey/:encodedApiUrl/mcp", async (req, res) => {
  const { apiKey, encodedApiUrl } = req.params;
  try {
    const config = decodeConfig(apiKey, encodedApiUrl);
    const transport = new SSEServerTransport(`/${apiKey}/${encodedApiUrl}/messages`, res);
    const server = new McpServer({ name: "10x-todo-mcp", version: "1.5.1" });

    for (const tool of tools) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.tool(tool.name, tool.description || "", (tool.inputSchema as z.AnyZodObject).shape, async (args: any) => {
        setApiClientConfig(config);
        const result = await tool.execute(args);
        if (result && Array.isArray(result.content)) {
          result.content.push({ type: "text", text: FULL_PROTOCOL_ENFORCEMENT });
        }
        return result;
      });
    }

    for (const resource of resources) {
      server.resource(resource.name, resource.uri, { mimeType: resource.mimeType }, async () => {
        setApiClientConfig(config);
        const contents = await resource.read();
        return {
          contents: contents.map((c) => ({
            uri: c.uri,
            text: c.text,
            mimeType: c.mimeType,
          })),
        };
      });
    }

    for (const prompt of promptsData as Prompt[]) {
      server.prompt(prompt.name, prompt.description || "", {}, async () => ({
        messages: prompt.messages.map((m) => ({
          role: m.role,
          content: { type: "text", text: m.content.text },
        })),
      }));
    }

    await server.connect(transport);
    if (transport.sessionId) transports.set(transport.sessionId, transport);
    req.on("close", () => {
      if (transport.sessionId) transports.delete(transport.sessionId);
      server.close();
    });
  } catch (_error) {
    res.status(500).send("SSE Init Error");
  }
});

app.post("/:apiKey/:encodedApiUrl/messages", async (req, res) => {
  const transport = transports.get(req.query.sessionId as string);
  if (transport) await transport.handlePostMessage(req, res);
  else res.status(404).send("Session not found");
});

// --- STATELESS POST HANDLER ---
app.post("/:apiKey/:encodedApiUrl/mcp", async (req, res) => {
  const { apiKey, encodedApiUrl } = req.params;
  const { method, params, id } = req.body;

  // eslint-disable-next-line no-console
  console.log(`[MCP] Method: ${method} (POST)`);

  try {
    const config = decodeConfig(apiKey, encodedApiUrl);
    setApiClientConfig(config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {}, resources: { listChanged: true }, prompts: {} },
          serverInfo: { name: "10x-todo-mcp-http", version: "1.5.1" },
        };
        break;

      case "tools/list":
      case "listTools":
        result = {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: zodToJsonSchema(t.inputSchema),
          })),
        };
        break;

      case "resources/list":
      case "listResources":
        result = {
          resources: resources.map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          })),
        };
        break;

      case "prompts/list":
      case "listPrompts":
        result = {
          prompts: (promptsData as Prompt[]).map((p) => ({
            name: p.name,
            description: p.description,
          })),
        };
        break;

      case "tools/call":
      case "callTool": {
        const tool = tools.find((t) => t.name === (params.name || params.toolName));
        if (!tool) throw new Error("Tool not found");
        const toolResult = await tool.execute(params.arguments || params.args);
        if (toolResult && Array.isArray(toolResult.content)) {
          toolResult.content.push({ type: "text", text: FULL_PROTOCOL_ENFORCEMENT });
        }
        result = toolResult;
        break;
      }

      case "resources/read":
      case "readResource": {
        const resource = resources.find((r) => r.uri === params.uri);
        if (!resource) throw new Error("Resource not found");
        const contents = await resource.read();
        result = { contents };
        break;
      }

      case "prompts/get":
      case "getPrompt": {
        const prompt = (promptsData as Prompt[]).find((p) => p.name === params.name);
        if (!prompt) throw new Error("Prompt not found");
        result = { description: prompt.description, messages: prompt.messages };
        break;
      }

      default:
        result = { tools: [], resources: [], prompts: [] };
    }

    res.json({ jsonrpc: "2.0", id: id ?? null, result });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    res.status(200).json({
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32603, message: error.message },
    });
  }
});

app.get("/health", (_req, res) => res.send("OK"));
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`MCP Server running on port ${PORT}`);
});
