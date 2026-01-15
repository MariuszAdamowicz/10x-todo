import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("should merge classes correctly", () => {
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
  });

  it("should handle conditional classes", () => {
    expect(cn("text-lg", { "font-bold": true, italic: false })).toBe("text-lg font-bold");
  });
});
