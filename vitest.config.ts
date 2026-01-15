/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    coverage: {
      include: ["src/**/*"],
      exclude: ["src/env.d.ts", "src/types.ts"],
    },
  },
});
