import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,  // Changes the origin of the request to the target URL
        secure: false,  // If using HTTPS, set to true
      },
    },
  },
});
