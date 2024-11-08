import { join } from "path";
import { defineConfig } from "vite";
import vuePlugin from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import viteIkarosTools from "./plugin/vite-ikaros-tools";
import { getConfig } from "./utils";

function resolve(dir: string) {
  return join(__dirname, "..", dir);
}
const config = getConfig();

const root = resolve("src/renderer");

export default defineConfig({
  mode: config && config.NODE_ENV,
  root,
  define: {
    __CONFIG__: config,
    __ISWEB__: Number(config && config.target),
  },
  resolve: {
    alias: {
      '@main': resolve('src/main'),
      '@lib': resolve('lib/src'),
      '@preload': resolve('src/preload'),
      "@renderer": root,
      "@store": join(root, "/store/modules"),
      'vue': 'vue/dist/vue.esm-bundler.js',
    },
  },
  base: "./",
  build: {
    outDir:
      config && config.target
        ? resolve("dist/web")
        : resolve("dist/electron/renderer"),
    emptyOutDir: true,
    target: "esnext",
    cssCodeSplit: false,
  },
  server: {},
  plugins: [vueJsx(), vuePlugin({
    template: {
      compilerOptions: {
        isCustomElement: tag => tag === 'webview',
      },
    },
  }), viteIkarosTools()],
  optimizeDeps: {},
});
