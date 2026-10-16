import path from "node:path";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { authoring } from "./scripts/authoring-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss(), authoring()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
