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

// Wczytywanie promptów z JSON
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const promptsPath = join(__dirname, "prompts", "prompts.json");
const prompts = JSON.parse(readFileSync(promptsPath, "utf-8"));

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
... (reszta protokołu) ...
===============================================================
`;

// Mapa do przechowywania aktywnych transportów SSE
const transports = new Map<string, SSEServerTransport>();

// Pomocnik do dekodowania parametrów
const decodeConfig = (apiKey: string, encodedApiUrl: string) => {
  const apiUrl = Buffer.from(encodedApiUrl, "base64").toString("utf-8");
  return { apiKey, apiUrl };
};

// --- HANDLERY DLA SSE ---

app.get("/:apiKey/:encodedApiUrl/mcp", async (req, res) => {
  const { apiKey, encodedApiUrl } = req.params;
  try {
    const config = decodeConfig(apiKey, encodedApiUrl);
    // Ważne: ścieżka do komunikatów musi zawierać parametry sesji, by trafić do właściwego kontenera
    const transport = new SSEServerTransport(`/${apiKey}/${encodedApiUrl}/messages`, res);
    
    const server = new McpServer({ name: "10x-todo-mcp", version: "1.5.0" });
    
    // Rejestracja narzędzi w instancji serwera
    for (const tool of tools) {
      server.tool(tool.name, tool.description || "", (tool.inputSchema as z.AnyZodObject).shape, async (args: any) => {
        setApiClientConfig(config);
        const result = await tool.execute(args);
        if (result && Array.isArray(result.content)) {
          result.content.push({ type: "text", text: FULL_PROTOCOL_ENFORCEMENT });
        }
        return result;
      });
    }

    await server.connect(transport);
    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }

    req.on("close", () => {
      if (transport.sessionId) transports.delete(transport.sessionId);
      server.close();
    });
  } catch (error) {
    res.status(500).send("SSE Init Error");
  }
});

app.post("/:apiKey/:encodedApiUrl/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(404).send("Session not found");
  }
});

// --- HANDLER DLA TRADYCYJNEGO POST (Stateless) ---
// To obsłuży klientów, którzy nie wspierają SSE lub robią prosty fallback.

app.post("/:apiKey/:encodedApiUrl/mcp", express.json(), async (req, res) => {
  const { apiKey, encodedApiUrl } = req.params;
  const { method, params, id } = req.body;

  try {
    const config = decodeConfig(apiKey, encodedApiUrl);
    setApiClientConfig(config);

    let result: any;

    if (method === "tools/list") {
      result = {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: zodToJsonSchema(t.inputSchema),
        })),
      };
    } else if (method === "tools/call") {
      const tool = tools.find((t) => t.name === params.name);
      if (!tool) throw new Error("Tool not found");
      const toolResult = await tool.execute(params.arguments);
      if (toolResult && Array.isArray(toolResult.content)) {
        toolResult.content.push({ type: "text", text: FULL_PROTOCOL_ENFORCEMENT });
      }
      result = toolResult;
    } else if (method === "initialize") {
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "10x-todo-mcp-http", version: "1.5.0" },
      };
    } else {
      // Fallback dla innych metod
      result = {};
    }

    res.json({ jsonrpc: "2.0", id: id ?? null, result });
  } catch (error: any) {
    res.status(200).json({
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32603, message: error.message },
    });
  }
});

app.get("/health", (_req, res) => res.send("OK"));

app.listen(PORT, () => console.log(`MCP Server running on port ${PORT}`));