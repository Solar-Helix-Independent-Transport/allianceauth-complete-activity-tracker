import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    proxy: {
      "/cat/api/": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/static/": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: true,
    manifest: true,
    outDir: "build/static/",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "@react";
          }
          if (id.includes("react-router-dom") || id.includes("react-router")) {
            return "@react-router";
          }
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) {
            return "@recharts";
          }
          if (id.includes("@tanstack")) {
            return "@tanstack";
          }
          if (id.includes("react-bootstrap") || id.includes("bootstrap")) {
            return "@bootstrap";
          }
          if (
            id.includes("react-query") ||
            id.includes("react-select") ||
            id.includes("javascript-time-ago")
          ) {
            return "@libs";
          }
        },
      },
    },
  },
});
