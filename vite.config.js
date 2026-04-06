const path = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
  root: "frontend",
  envDir: path.resolve(__dirname),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3200",
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
