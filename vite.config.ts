import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import inject from "@rollup/plugin-inject";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), inject({ Buffer: ["buffer", "Buffer"] })],
  build: {
    target: ["es2020"],
  },
  define: {
    global: {},
  },
  optimizeDeps: {
    esbuildOptions: { target: "es2020" },
    include: ["buffer"],
  },
});
