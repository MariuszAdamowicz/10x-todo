import express from "express";
import { McpServer, McpRequest, McpResponse } from "@modelcontextprotocol/sdk/server/mcp.js";
import { tools } from "./tools/index.js";
import { resources } from "./resources/index.js";
import { prompts } from "./prompts/index.js";
import { setApiClientConfig } from "./api-client.js";

const app = express();
// Używamy wbudowanego parsera JSON w Express
app.use(express.json());

const PORT = process.env.PORT || 8081;

// Endpoint do sprawdzania stanu serwera (health check)
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

// Główny endpoint MCP
app.post("/:apiKey/:encodedApiUrl/mcp", async (req, res) => {
  try {
    const { apiKey, encodedApiUrl } = req.params;
    const mcpRequest = req.body as McpRequest;

    if (!apiKey || !encodedApiUrl) {
      return res.status(400).json({ error: "Missing apiKey or encodedApiUrl in path" });
    }

    let apiUrl;
    try {
      apiUrl = Buffer.from(encodedApiUrl, "base64").toString("utf-8");
      // Prosta walidacja czy URL jest poprawny
      new URL(apiUrl);
    } catch () {
      return res.status(400).json({ error: "Invalid or malformed Base64-encoded API URL" });
    }

    // Ustawienie konfiguracji klienta API dla tego konkretnego zapytania
    setApiClientConfig({ apiKey, apiUrl });

    // Inicjalizacja serwera MCP dla każdego zapytania, aby zapewnić izolację
    const server = new McpServer({
      name: "10x-todo-mcp-http",
      version: "1.1.0",
    });

    // Rejestracja narzędzi, zasobów i promptów
    tools.forEach((tool) => server.tool(tool.name, tool.description, tool.inputSchema.shape, tool.execute));
    resources.forEach((resource) =>
      server.resource(resource.name, resource.uri, async () => ({ contents: await resource.read() }))
    );
    prompts.forEach((prompt) =>
      server.prompt(prompt.name, prompt.description, async () => ({ messages: prompt.messages }))
    );

    // Ręczne przetwarzanie żądania MCP.
    // W architekturze HTTP nie ma stałego połączenia, więc symulujemy je,
    // bezpośrednio wywołując logikę serwera.
    const mcpResponse: McpResponse = await server.process(mcpRequest);

    res.status(200).json(mcpResponse);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    console.error("Error processing MCP request:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({ error: "Internal Server Error", details: errorMessage });
  }
});

// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`10x-Todo MCP HTTP Server running on port ${PORT}`);
});
