/// <reference types="vitest" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  define: {
    "import.meta.env.PUBLIC_MOCK_SERVICES": JSON.stringify("false"),
  },
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
