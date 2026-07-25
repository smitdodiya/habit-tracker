import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    rollupOptions: {
      output: {
        /**
         * Splits the two heavyweight dependencies out of the main bundle.
         *
         * Recharts is only needed on the dashboard and the icon set is large;
         * bundling them with the app shell meant every first visit — including
         * the login screen — downloaded the charting library. Separate chunks
         * let the browser cache them independently of app code, so a deploy
         * that touches only our own source doesn't re-download them.
         */
        manualChunks: {
          charts: ['recharts'],
          icons: ['@phosphor-icons/react'],
        },
      },
    },
    // The chunks below are deliberate and understood; this keeps the build
    // output quiet so a genuinely surprising size increase still stands out.
    chunkSizeWarningLimit: 700,
  },

  server: {
    port: 5173,
    // Listen on all interfaces so the dev server is reachable from a phone on
    // the same network, or through a tunnel, for real-device testing.
    host: true,
    // Tunnel hostnames are random per session; Vite blocks unknown Host headers
    // by default, so allow the providers used for device testing.
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.io',
      '.loca.lt',
      '.trycloudflare.com',
    ],

    // Proxying /api keeps the browser on a single origin in development, so the
    // httpOnly refresh cookie behaves exactly as it will in production — and it
    // means exposing this one port is enough to test the whole app on a phone.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
