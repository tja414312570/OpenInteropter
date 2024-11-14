import path from "path";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { builtinModules } from "module";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import copy from "rollup-plugin-copy";
import alias from "@rollup/plugin-alias";
import json from "@rollup/plugin-json";
import esbuild from "rollup-plugin-esbuild";
import obfuscator from "rollup-plugin-obfuscator";
import { defineConfig } from "rollup";
import * as glob from "glob"; // 引入glob模块
import { getConfig } from "./utils";
import getPreloadConfigs from "./rollup.preload.config";
import { assert } from "console";
import fs from "fs";

const config = getConfig();

export default (env = "production", type = "main") => {
  const inputFiles =
    type === "main"
      ? path.join(__dirname, "..", "src", "main", "index.ts") // 主进程文件
      : glob.sync(path.join(__dirname, "..", "src", type, "*.ts")); // 查找所有 .ts 文件

  if (type === "preload") {
    // 生成并返回 `preload` 的配置
    return getPreloadConfigs(env);
  }

  assert(inputFiles.length > 0, `类型${type},在环境${env}没有输入文件`);

  return defineConfig({
    input: inputFiles, // 单个文件或多个文件
    output:
      type === "main"
        ? {
            // 如果是 main，使用单文件输出
            file: path.join(__dirname, "..", "dist", "main.js"),
            format: "cjs",
            name: "MainProcess",
            exports: "auto",
            interop: "auto",
            inlineDynamicImports: true,
            sourcemap: true,
          }
        : {
            // 如果是 preload，使用输出目录
            dir: path.join(__dirname, "..", "dist", type),
            format: "cjs",
            exports: "auto",
            interop: "auto",
            sourcemap: true,
          },
    plugins: [
      replace({
        preventAssignment: true,
        "process.env.NODE_ENV": JSON.stringify(
          process.env.NODE_ENV || "development"
        ),
        "process.env.PORT": JSON.stringify(process.env.PORT || "9080"),
        "process.env.userConfig": config ? JSON.stringify(config) : "{}",
      }),
      nodeResolve({
        exportConditions: ["node"], // 强制选择 node 环境的导出
        preferBuiltins: true,
        browser: false,
        extensions: [".mjs", ".ts", ".js", ".json", ".node"],
      }),
      commonjs({
        sourceMap: true,
      }),
      json(),
      esbuild({
        include: /\.[jt]s?$/,
        exclude: /node_modules/,
        sourceMap: true,
        // minify: env === "production",
        target: "es2020",
        define: {
          __VERSION__: '"x.y.z"',
        },
        loaders: {
          ".json": "json",
          ".js": "jsx",
        },
      }),
      alias({
        entries: [
          { find: "@main", replacement: path.join(__dirname, "../src/main") },
          { find: "@lib", replacement: path.join(__dirname, "../lib/src") },
          {
            find: "@config",
            replacement: path.join(__dirname, "..", "config"),
          },
        ],
      }),
      process.env.NODE_ENV == "production" && obfuscator({}),
      ...(type === "main"
        ? [
            copy({
              targets: [
                { src: "manifest.json", dest: "dist" },
                { src: "assets", dest: "dist" },
              ],
              hook: "writeBundle", // 在构建完成后进行文件内容修改
            }),
            // 使用 replace 插件修改 manifest.json 中的路径
            {
              name: "modify-manifest", // 自定义插件
              writeBundle() {
                const manifestPath = path.resolve(
                  __dirname,
                  "../dist/manifest.json"
                );
                if (fs.existsSync(manifestPath)) {
                  const manifest = JSON.parse(
                    fs.readFileSync(manifestPath, "utf-8")
                  );
                  // 修改其中的路径
                  if (manifest.main && typeof manifest.main === "string") {
                    manifest.main = manifest.main.replace("./dist/", "./");
                  }
                  if (manifest.icon && typeof manifest.icon === "string") {
                    manifest.icon = manifest.icon.replace("./dist/", "./");
                  }
                  // 保存修改后的 manifest.json
                  fs.writeFileSync(
                    manifestPath,
                    JSON.stringify(manifest, null, 2)
                  );
                }
              },
            },
          ]
        : []),
    ],
    onwarn(warning, warn) {
      if (warning.code === "CIRCULAR_DEPENDENCY") {
        return;
      }
      if (warning.code === "UNRESOLVED_IMPORT") {
        console.error("无法解析模块:", warn);
      }
      warn(warning);
    },
    external: [
      ...builtinModules,
      "node-pty",
      "axios",
      "electron",
      "express",
      "ffi-napi",
      "ref-napi",
      "ref-struct-napi",
      "semver",
      "glob",
    ],
  });
};
