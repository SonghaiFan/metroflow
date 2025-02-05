import { defineConfig } from "vite";

export default defineConfig({
  assetsInclude: ["**/*.json"],
  json: {
    stringify: true,
  },
});
