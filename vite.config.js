import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base makes this project work on GitHub Pages project URLs.
export default defineConfig({
  base: "./",
  plugins: [react()],
});