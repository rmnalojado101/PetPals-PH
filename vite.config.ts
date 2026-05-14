import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import laravel from "laravel-vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    laravel({
      input: ['resources/src/main.tsx'],
      refresh: true,
    }),
    react(), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./resources/src"),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    hmr: {
      host: '127.0.0.1',
    },
  },
}));
