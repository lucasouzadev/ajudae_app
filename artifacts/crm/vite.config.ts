import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": "/src" },
  },
  /* Dev server config for local development.
     NOT used in production builds (vite build doesn't start a server).
     Security headers for production are set in public/_headers (Cloudflare)
     and vercel.json (Vercel). */
  server: {
    host: "0.0.0.0",
    allowedHosts: ["all"],
  },
  build: {
    /* Minify and remove sourcemaps from production bundle */
    sourcemap: false,
    minify: "esbuild",
  },
});
