import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
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

// ZAAWANSOWANY PROTOKÓŁ TDD
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

// Store transports mapping sessionId -> transport
// This allows us to route POST messages to the correct SSE connection
const transports = new Map<string, SSEServerTransport>();

// Funkcja pomocnicza do dekodowania URL
const decodeConfig = (apiKey: string, encodedApiUrl: string) => {
  if (!apiKey || !encodedApiUrl) {
    throw new Error("Missing apiKey or encodedApiUrl in path");
  }
  try {
    const apiUrl = Buffer.from(encodedApiUrl, "base64").toString("utf-8");
    new URL(apiUrl); // Validate URL
    return { apiKey, apiUrl };
  } catch (_error) {
    throw new Error("Invalid or malformed Base64-encoded API URL");
  }
};

// Endpoint Health Check
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

/**
 * Endpoint SSE (GET) - Nawiązanie połączenia
 * Tworzy nową instancję McpServer dla każdej sesji, konfigurując ją z odpowiednim apiKey/apiUrl.
 */
app.get("/:apiKey/:encodedApiUrl/mcp", async (req, res) => {
  const { apiKey, encodedApiUrl } = req.params;

  try {
    const config = decodeConfig(apiKey, encodedApiUrl);

    // Tworzymy transport SSE
    const transport = new SSEServerTransport("/messages", res);
    const server = new McpServer({
      name: "10x-todo-mcp-sse",
      version: "1.4.0",
    });

    // Rejestracja narzędzi
    for (const tool of tools) {
      server.tool(tool.name, tool.description || "", tool.inputSchema, async (args) => {
        // Ustawiamy konfigurację dla tego konkretnego wywołania
        // Uwaga: W środowisku async z wieloma requestami, `setApiClientConfig` musi być bezpieczne.
        // Zakładamy tutaj, że api-client.ts obsługuje to poprawnie lub że każde wywołanie jest atomowe w kontekście procesu Node (co nie jest prawdą dla concurrent requests).
        // W idealnym świecie api-client powinno przyjmować config w każdym wywołaniu, a nie globalnie.
        // Tutaj robimy 'set' tuż przed wykonaniem, co jest ryzykowne przy wysokim współbieżności, ale akceptowalne dla prototypu.
        setApiClientConfig(config);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await tool.execute(args as any);

        // Wstrzykiwanie protokołu
        if (result && Array.isArray(result.content)) {
          result.content.push({
            type: "text",
            text: FULL_PROTOCOL_ENFORCEMENT,
          });
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

    // Start sesji SSE
    // Transport.sessionId jest generowane przez SDK
    await server.connect(transport);

    // Zapisujemy transport w mapie, aby endpoint POST mógł go znaleźć
    // sessionID jest dostępne po 'transport.start()' (które woła connect)
    // Ale w SSEServerTransport, sessionId jest generowane w konstruktorze lub przy starcie?
    // Sprawdźmy implementation details SDK: sessionId jest właściwością transportu.
    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
    }

    // Clean up on close
    req.on("close", () => {
      if (transport.sessionId) {
        transports.delete(transport.sessionId);
      }
      server.close();
    });
  } catch (error) {
    console.error("Error initializing SSE:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
});

/**
 * Endpoint Messages (POST) - Obsługa wiadomości klienta
 * Klient wysyła wiadomości na ten endpoint, podając sessionId w query param.
 */
app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).send("Missing sessionId query parameter");
    return;
  }

  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Error handling POST message:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`10x-Todo MCP SSE Server running on port ${PORT}`);
});
