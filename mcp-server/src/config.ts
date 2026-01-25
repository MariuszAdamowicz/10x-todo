/* eslint-disable no-console */
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  TODO_API_URL: z.string().url().default("http://localhost:3000"),
  TODO_API_KEY: z.string().min(1, "TODO_API_KEY is required"),
});

// Helper to validate config
function validateConfig() {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid configuration for 10x-todo-mcp:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }
  return result.data;
}

export const config = validateConfig();
