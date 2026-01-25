// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import process from "node:process";

const isBuild = process.argv.includes("build");

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: isBuild
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : {},
    },
  },
  adapter: cloudflare(),
});
