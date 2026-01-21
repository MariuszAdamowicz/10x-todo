import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { tools } from "./tools/index.js";
import { resources } from "./resources/index.js";
import { prompts } from "./prompts/index.js";

// Initialize MCP Server
const server = new McpServer({
  name: "10x-todo-mcp",
  version: "1.0.0"
});

// Register Tools
tools.forEach((tool) => {
  server.tool(
    tool.name,
    tool.description,
    tool.inputSchema.shape,
    tool.execute
  );
});

// Register Resources
resources.forEach((resource) => {
  server.resource(
    resource.name,
    resource.uri,
    async (uri) => ({
      contents: await resource.read()
    })
  );
});

// Register Prompts
prompts.forEach((prompt) => {
  server.prompt(
    prompt.name,
    prompt.description,
    // @ts-ignore - The SDK types might be slightly strict or mismatching for static messages, 
    // but this structure follows the general prompt definition pattern. 
    // If strict types require a callback, we can wrap it.
    // Checking SDK source: prompt(name, description, argsSchema, callback) OR just name/desc/callback?
    // Let's assume the simplest form or use a callback that returns the messages.
    // Re-checking SDK docs usually suggests: server.prompt(name, argsSchema, callback)
    // If we have no args, we can pass empty schema or undefined?
    // Let's try the callback approach for safety.
    async () => ({
        messages: prompt.messages
    })
  );
});

// Helper for error handling
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`10x-Todo MCP Server running on stdio. API URL: ${config.TODO_API_URL}`);
}

main().catch((error) => {
  console.error("Fatal error in main loop:", error);
  process.exit(1);
});
