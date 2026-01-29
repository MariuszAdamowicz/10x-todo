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

### 📋 TASK CLASSIFICATION
1. **CODE TASKS:** Follow the TDD Loop: RED -> GREEN -> REFACTOR.
2. **OPERATIONAL TASKS:** Git (commits/pushes), Setup (install/config), Cleanup.
   - These MUST be on the MCP list.
   - Execute action -> Mark task as 'done' -> CONTINUE.

### ⚙️ THE AUTONOMOUS LOOP
Continue until ALL delegated tasks are resolved. For every interaction:

#### STEP 1: LOAD & HYGIENE (The "Zero Waste" Rule)
- Call 'list_delegated_tasks' and 'get_task_hierarchy'.
- **CANCEL DUPLICATES:** If you find a task that is a duplicate of a completed or ongoing task, call 'update_subtask_status' with status 'cancelled' immediately.
- **IDENTIFY NEXT:** Pick the TOP-MOST active task based on priorities.

#### STEP 2: EXECUTE (The "One-Step-Ahead" Rule)
- **IF CODE TASK:** Perform exactly ONE TDD transition (INITIAL->RED, RED->GREEN, or GREEN->REFACTOR).
  - **REFACTOR IS MANDATORY:** You are NOT ALLOWED to skip the REFACTOR phase after GREEN.
- **IF OPERATIONAL TASK:** Perform the action (e.g. git commit) and mark as 'done'.

#### STEP 3: MCP UPDATE & STOP
- Update MCP state -> call 'reorder_tasks' -> FINISH TURN.

### 📊 PRIORITY RULES
1. REFACTOR (Highest) - Clean code is priority.
2. GREEN - Fix failing tests.
3. RED - New specs.
4. Operational/Initial (Lowest) - Git, Setup, new features.

### 📝 CRITICAL CONSTRAINTS
- **NO GHOST WORK:** Every file edit or Git command MUST have a corresponding MCP task.
- **NO BATCHING:** Do not combine RED and GREEN. Do not combine Code and Git in one turn.
- **SCAN FIRST:** Always look at existing tasks before creating new ones.
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
    const transport = new SSEServerTransport(`/${apiKey}/${encodedApiUrl}/messages`, res);

    const server = new McpServer({ name: "10x-todo-mcp", version: "1.5.0" });

    // Rejestracja narzędzi
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

    // Rejestracja zasobów
    for (const resource of resources) {
      server.resource(resource.name, resource.uri, async () => {
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

    // Rejestracja promptów
    for (const prompt of prompts as Prompt[]) {
      server.prompt(prompt.name, prompt.description || "", {}, async () => {
        return {
          messages: prompt.messages.map((m) => ({
            role: m.role,
            content: { type: "text", text: m.content.text },
          })),
        };
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
  } catch (_error) {
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

app.post("/:apiKey/:encodedApiUrl/mcp", express.json(), async (req, res) => {
  const { apiKey, encodedApiUrl } = req.params;
  const { method, params, id } = req.body;

  try {
    const config = decodeConfig(apiKey, encodedApiUrl);
    setApiClientConfig(config);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } else if (method === "resources/list") {
      result = {
        resources: resources.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      };
    } else if (method === "resources/read") {
      const resource = resources.find((r) => r.uri === params.uri);
      if (!resource) throw new Error("Resource not found");
      const contents = await resource.read();
      result = { contents };
    } else if (method === "prompts/list") {
      result = {
        prompts: (prompts as Prompt[]).map((p) => ({
          name: p.name,
          description: p.description,
        })),
      };
    } else if (method === "prompts/get") {
      const prompt = (prompts as Prompt[]).find((p) => p.name === params.name);
      if (!prompt) throw new Error("Prompt not found");
      result = {
        description: prompt.description,
        messages: prompt.messages,
      };
    } else if (method === "initialize") {
      result = {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "10x-todo-mcp-http", version: "1.5.0" },
      };
    } else {
      // Fallback dla innych metod - zwracamy puste tablice zamiast pustego obiektu
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
