import express from "express";
import { zodToJsonSchema } from "zod-to-json-schema";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { tools } from "./tools/index.js";
import { resources } from "./resources/index.js";
import { setApiClientConfig } from "./api-client.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8081;

// Wczytywanie promptów z JSON
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const promptsPath = join(__dirname, "prompts", "prompts.json");
const prompts = JSON.parse(readFileSync(promptsPath, "utf-8"));

// ZAAWANSOWANY PROTOKÓŁ TDD - Wersja 2.4 (Hybrydowy: TDD + Operational)
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

// Typy JSON-RPC
interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
}

interface Prompt {
  name: string;
  description?: string;
  messages: {
    role: string;
    content: { type: string; text: string };
  }[];
}

// Endpoint do sprawdzania stanu serwera (health check)
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// Główny endpoint MCP - obsługa JSON-RPC
app.post("/:apiKey/:encodedApiUrl/mcp", async (req, res) => {
  const { apiKey, encodedApiUrl } = req.params;
  const requestBody = req.body as JsonRpcRequest;
  const requestId = requestBody.id ?? null;

  try {
    if (!apiKey || !encodedApiUrl) {
      throw new Error("Missing apiKey or encodedApiUrl in path");
    }

    let apiUrl;
    try {
      apiUrl = Buffer.from(encodedApiUrl, "base64").toString("utf-8");
      new URL(apiUrl);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new Error("Invalid or malformed Base64-encoded API URL");
    }

    // Ustawienie konfiguracji klienta API
    setApiClientConfig({ apiKey, apiUrl });

    let result: unknown;

    switch (requestBody.method) {
      case "tools/list":
        result = {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            // Konwersja Zod Schema na JSON Schema wymagany przez MCP
            inputSchema: zodToJsonSchema(t.inputSchema),
          })),
        };
        break;

      case "tools/call": {
        const name = requestBody.params?.name as string;
        const args = requestBody.params?.arguments as Record<string, unknown>;

        if (!name) {
          throw new Error("Missing tool name in params");
        }

        const tool = tools.find((t) => t.name === name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }

        // Wykonanie narzędzia
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolResult = await tool.execute(args as any);

        // Wstrzykiwanie PEŁNEGO protokołu do każdej odpowiedzi tekstowej narzędzia
        if (toolResult && Array.isArray(toolResult.content)) {
          toolResult.content.push({
            type: "text",
            text: FULL_PROTOCOL_ENFORCEMENT,
          });
        }

        result = toolResult;
        break;
      }

      case "resources/list":
        result = {
          resources: resources.map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          })),
        };
        break;

      case "resources/read": {
        const uri = requestBody.params?.uri as string;
        if (!uri) {
          throw new Error("Missing resource uri in params");
        }
        const resource = resources.find((r) => r.uri === uri);
        if (!resource) {
          throw new Error(`Resource not found: ${uri}`);
        }
        const contents = await resource.read();
        result = { contents };
        break;
      }

      case "prompts/list":
        result = {
          prompts: prompts.map((p: Prompt) => ({
            name: p.name,
            description: p.description,
          })),
        };
        break;

      case "prompts/get": {
        const name = requestBody.params?.name as string;
        if (!name) {
          throw new Error("Missing prompt name in params");
        }
        const prompt = prompts.find((p: Prompt) => p.name === name);
        if (!prompt) {
          throw new Error(`Prompt not found: ${name}`);
        }
        result = {
          description: prompt.description,
          messages: prompt.messages,
        };
        break;
      }

      // Obsługa inicjalizacji (handshake)
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: "10x-todo-mcp-http",
            version: "1.3.4",
          },
        };
        break;

      case "notifications/initialized":
        result = {};
        break;

      case "ping":
        result = {};
        break;

      default:
        throw new Error(`Method not supported: ${requestBody.method}`);
    }

    res.status(200).json({
      jsonrpc: "2.0",
      id: requestId,
      result,
    });
  } catch (error: unknown) {
    console.error("Error processing MCP request:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(200).json({
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32603,
        message: errorMessage,
      },
    });
  }
});

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`10x-Todo MCP HTTP Server running on port ${PORT}`);
});
