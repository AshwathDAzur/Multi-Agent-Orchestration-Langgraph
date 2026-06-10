import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// UI runs on 5173 and calls the aiBackend at :2424.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
