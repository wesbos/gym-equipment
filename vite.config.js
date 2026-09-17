import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: { input: { upright: "index.html", parts: "parts.html", builder: "builder.html" } },
  },
});
