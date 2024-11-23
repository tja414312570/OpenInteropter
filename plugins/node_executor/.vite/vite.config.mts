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
    extensions: [".js", ".ts", ".mts", ".vue"],
    alias: {
      "@main": resolve("src/main"),
      "@lib": resolve("lib/src"),
      "@renderer": root,
      "@store": join(root, "/store/modules"),
      vue: "vue/dist/vue.esm-bundler.js",
    },
  },
  base: "./",
  build: {
    outDir:
      config && config.target ? resolve("dist/web") : resolve("dist/renderer"),
    emptyOutDir: true,
    target: "esnext",
    assetsInlineLimit: 0, // 禁用内联资源
    cssCodeSplit: false,
  },
  server: {
    cors: {
      origin: "*", // 允许所有来源
      methods: ["GET", "POST", "PUT", "DELETE"], // 指定允许的 HTTP 方法
    },
  },
  plugins: [
    vueJsx(),
    vuePlugin({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "webview",
        },
      },
    }),
    viteIkarosTools(),
  ],
  optimizeDeps: {},
});
