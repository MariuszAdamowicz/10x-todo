import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";

// Mock serwera i zależności, aby testować tylko warstwę HTTP
const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.post("/:apiKey/:encodedApiUrl/mcp", async (req, res) => {
  const { apiKey, encodedApiUrl } = req.params;
  let apiUrl;
  try {
    apiUrl = Buffer.from(encodedApiUrl, "base64").toString("utf-8");
    new URL(apiUrl);
  } catch () {
    return res.status(400).json({ error: "Invalid Base64 URL" });
  }

  // Symulujemy sukces, zwracając sparsowane dane
  res.status(200).json({
    message: "Request processed successfully",
    parsed: {
      apiKey,
      apiUrl,
      body: req.body,
    },
  });
});

describe("MCP HTTP Server", () => {
  it("should return 200 OK for /health endpoint", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");
  });

  it("should correctly parse apiKey and decoded apiUrl from the path", async () => {
    const testApiKey = "test-api-key";
    const testApiUrl = "http://test-server.com/api";
    const encodedApiUrl = Buffer.from(testApiUrl).toString("base64");
    const mcpRequestBody = { id: "123", jsonrpc: "2.0", method: "call_tool" };

    const response = await request(app).post(`/${testApiKey}/${encodedApiUrl}/mcp`).send(mcpRequestBody);

    expect(response.status).toBe(200);
    expect(response.body.parsed.apiKey).toBe(testApiKey);
    expect(response.body.parsed.apiUrl).toBe(testApiUrl);
    expect(response.body.parsed.body).toEqual(mcpRequestBody);
  });

  it("should return 400 for a malformed Base64 encoded URL", async () => {
    const testApiKey = "test-api-key";
    const malformedEncodedUrl = "this-is-not-base64";

    const response = await request(app).post(`/${testApiKey}/${malformedEncodedUrl}/mcp`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Invalid Base64 URL");
  });
});
