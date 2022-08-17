import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: ["es2021"],
    sourcemap: true,
  },
  optimizeDeps: {
    esbuildOptions: { target: "es2021" },
  },
});
