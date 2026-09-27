import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Linked workspace packages are skipped by automatic dependency pre-bundling.
  // Convert the CommonJS browser verifier before serving it as a browser module.
  optimizeDeps: {
    include: ["@alignment-governance-stack/assurance/browser"],
  },
  test: {
    environment: "jsdom",
  },
});
