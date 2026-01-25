import { z } from "zod";
import process from "node:process";

const configSchema = z.object({
  TODO_API_URL: z.string().url().default("https://10x-todo.pages.dev"),
  TODO_API_KEY: z.string().min(1, "TODO_API_KEY is required"),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Validates configuration from environment variables.
 * Handles both Node.js (process.env) and Cloudflare Workers (env object).
 */
export function validateConfig(env: Record<string, string | undefined> | NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(env);

  if (!result.success) {
    // We don't want to crash at the top level in Workers
    throw new Error(`❌ Invalid configuration for 10x-todo-mcp: ${JSON.stringify(result.error.format())}`);
  }
  return result.data;
}
