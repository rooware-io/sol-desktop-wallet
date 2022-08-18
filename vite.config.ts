import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import inject from "@rollup/plugin-inject";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import nodePolyfills from "rollup-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    inject({ Buffer: ["buffer", "Buffer"] }),
    nodePolyfills({ crypto: true }),
  ],
  build: {
    target: ["es2021"],
    sourcemap: true,
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
    esbuildOptions: {
      target: "es2021",
      plugins: [NodeGlobalsPolyfillPlugin({ buffer: true })],
    },
  },
});
