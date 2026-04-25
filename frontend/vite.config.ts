// viteconfig.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite"; // Import Tailwind CSS plugin

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), // React plugin for SWC
    tailwindcss(), // Tailwind CSS plugin
  ],
});
