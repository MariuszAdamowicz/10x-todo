import { z } from "zod";

const configSchema = z.object({
  TODO_API_URL: z.string().url().default("https://10x-todo.pages.dev"),
  TODO_API_KEY: z.string().min(1, "TODO_API_KEY is required"),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Validates configuration from environment variables or request parameters.
 */
export function validateConfig(env: Record<string, string | undefined> | NodeJS.ProcessEnv): Config {
  const result = configSchema.safeParse(env);

  if (!result.success) {
    throw new Error(`Invalid MCP configuration: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
  }
  return result.data;
}
