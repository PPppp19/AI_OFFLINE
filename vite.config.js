import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Source HTML lives in app/; the build is written to the repo root so
// GitHub Pages ("Deploy from branch: main / root") serves it directly.
export default defineConfig({
  root: "app",
  base: "./",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "..",
    emptyOutDir: false,
  },
});
