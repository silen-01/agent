import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, "package.json"), "utf-8")) as { version: string };

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@modules": path.resolve(__dirname, "src/modules"),
      "@storages": path.resolve(__dirname, "src/storages"),
      "@views": path.resolve(__dirname, "src/views"),
      "@types": path.resolve(__dirname, "src/views/types"),
    },
  },
});
