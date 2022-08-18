import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import inject from "@rollup/plugin-inject";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), inject({ Buffer: ["buffer", "Buffer"] })],
  build: {
    target: ["es2021"],
    sourcemap: true,
    commonjsOptions: { include: [] },
  },
  resolve: {
    alias: {
      stream: "rollup-plugin-node-polyfills/polyfills/stream",
      events: "rollup-plugin-node-polyfills/polyfills/events",
      assert: "assert",
      crypto: "crypto-browserify",
      util: "util",
    },
  },
  define: {
    global: {},
  },
  optimizeDeps: {
    disabled: false,
    esbuildOptions: {
      target: "es2021",
      plugins: [NodeGlobalsPolyfillPlugin({ buffer: true })],
    },
  },
});
