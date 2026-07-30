import { defineConfig } from "vite";
import { mado } from "@madojs/mado/vite";

export default defineConfig({
  plugins: [
    mado({
      site: "https://madojs.dev",
    }),
  ],
});
