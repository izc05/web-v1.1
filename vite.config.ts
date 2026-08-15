import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  base: "/web-v1.1/",
  plugins: [react()],
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main:             resolve(__dirname, "index.html"),
        cloudTransition:  resolve(__dirname, "lab-cloud-transition/demo.html"),
      },
    },
  },
});
