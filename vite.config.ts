// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: { preset: "node" },
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    optimizeDeps: { exclude: ["onnxruntime-web", "playwright", "fsevents", "better-sqlite3"] },
    assetsInclude: ["**/*.wasm"],
    build: { bundler: "rollup" } as never,
  },
});
