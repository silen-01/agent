import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@modules": path.resolve(__dirname, "src/modules"),
      "@storages": path.resolve(__dirname, "src/storages"),
      "@views": path.resolve(__dirname, "src/views"),
      "@types": path.resolve(__dirname, "src/types"),
    },
  },
});
