// Hono
import devServer from "@hono/vite-dev-server";

// Vike
import vikeSolid from "vike-solid/vite";
import vike from "vike/plugin";

// Vite
import tailwindcss from "@tailwindcss/vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, ".");

// Icons
import solidSvg from "vite-plugin-solid-svg";

export default defineConfig({
  plugins: [
    devServer({
      entry: "server.ts",

      exclude: [
        /^\/@.+$/,
        /.*\.(ts|tsx|vue)($|\?)/,
        /.*\.(s?css|less)($|\?)/,
        /^\/favicon\.ico$/,
        /.*\.(svg|png)($|\?)/,
        /^\/(public|assets|static)\/.+/,
        /^\/node_modules\/.*/,
      ],

      injectClientScript: false,
    }),
    vike({}),
    vikeSolid(),
    tailwindcss(),
    solidSvg(),
  ],
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": resolve(root),
    },
  },
});
