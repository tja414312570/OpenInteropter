import path from "path";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { builtinModules } from "module";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import alias from "@rollup/plugin-alias";
import json from "@rollup/plugin-json";
import esbuild from "rollup-plugin-esbuild";
import obfuscator from "rollup-plugin-obfuscator";
import { defineConfig } from "rollup";
import * as glob from "glob"; // 引入glob模块
import { getConfig } from "./utils";
import getPreloadConfigs from './rollup.preload.config'
import { assert } from "console";

const config = getConfig();

export default (env = "production", type = "main") => {
  const inputFiles =
    type === "main"
      ? path.join(__dirname, "..", "src", "main", "index.ts") // 主进程文件
      : glob.sync(path.join(__dirname, "..", "src", type, "*.ts")); // 查找所有 .ts 文件

  if (type === 'preload') {
    // 生成并返回 `preload` 的配置
    return getPreloadConfigs(env);
  }

  assert(inputFiles.length > 0, `类型${type},在环境${env}没有输入文件`)

  return defineConfig({
    input: inputFiles, // 单个文件或多个文件
    output: type === "main"
      ? { // 如果是 main，使用单文件输出
        file: path.join(__dirname, "..", "dist", "electron", "main", "main.js"),
        format: "cjs",
        name: "MainProcess",
        inlineDynamicImports: true,
        sourcemap: true,
      }
      : { // 如果是 preload，使用输出目录
        dir: path.join(__dirname, "..", "dist", "electron", type),
        format: "cjs",
        sourcemap: true,
      },
    plugins: [
      replace({
        preventAssignment: true,
        "process.env.userConfig": config ? JSON.stringify(config) : "{}",
      }),
      nodeResolve({
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
        minify: env === "production",
        target: "es2017",
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
    ],
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
