import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-react';
            if (id.includes('react-dom') || id.match(/[\\/]react[\\/]/)) return 'vendor-react';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (id.includes('@radix-ui')) return 'vendor-ui';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@dnd-kit') || id.includes('react-dnd') || id.includes('dnd-core')) return 'vendor-dnd';
            if (id.includes('pdfjs') || id.includes('react-pdf') || id.includes('pdf-lib')) return 'vendor-pdf';
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('@sentry')) return 'vendor-sentry';
            if (id.includes('cmdk')) return 'vendor-cmdk';
          }
        },
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
