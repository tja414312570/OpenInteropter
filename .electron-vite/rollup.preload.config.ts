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
import { readdirSync, readFileSync } from "fs";
import { getConfig } from "./utils";
import assert from "assert";

const config = getConfig();

// Electron 渲染进程允许的模块
const electronModules = [
    "electron",
    "electron/contextBridge",
    "electron/crashReporter",
    "electron/ipcRenderer",
    "electron/nativeImage",
    "electron/webFrame",
    "electron/webUtils",
];

// Node.js 允许的内置模块子集
const allowedNodeModules = ["events", "timers", "url"];

// 合并所有允许的模块列表
const allowedModules = [...builtinModules, ...electronModules, ...allowedNodeModules];

// 检查文件是否有自定义依赖（排除已知模块）
const hasCustomDependencies = (filePath) => {
    const content = readFileSync(filePath, "utf-8");
    const importRegex = /import\s+[\w{}\s,]+\s+from\s+['"]([^'"]+)['"]/g;
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;

    // 查找所有 `import` 或 `require` 语句
    let match;
    while ((match = importRegex.exec(content)) || (match = requireRegex.exec(content))) {
        const moduleName = match[1];
        if (!allowedModules.includes(moduleName) && !moduleName.startsWith(".")) {
            return true; // 存在自定义依赖（非外部模块）
        }
    }
    return false;
};

// 获取 `preload` 目录中的所有 TypeScript 文件
const preloadDir = path.join(__dirname, "..", "src", "preload");
const preloadFiles = readdirSync(preloadDir).filter((file) => file.endsWith(".ts"));

export default (env = "production") => {
    const inputFiles = preloadFiles.map((file) => path.join(preloadDir, file)); // 逐个预加载文件处理

    // 动态为每个 `preload` 文件生成配置
    const createOutputConfig = (filePath) => {
        const fileName = path.basename(filePath, ".ts");
        const includeCustomDependencies = hasCustomDependencies(filePath);
        assert(filePath, `文件${filePath},在环境${env}没有输入文件`)
        return defineConfig({
            input: filePath,
            output: {
                file: path.join(__dirname, "..", "dist", "electron", "preload", `${fileName}.js`),
                format: "cjs",
                sourcemap: true,
                inlineDynamicImports: includeCustomDependencies, // 如果有自定义依赖，则内嵌所有导入
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
                        { find: "@config", replacement: path.join(__dirname, "..", "config") },
                    ],
                }),
                env === "production" && obfuscator({}),
            ].filter(Boolean),
            // 只处理自定义依赖，排除所有允许的内置模块和 Electron 模块
            external: includeCustomDependencies
                ? allowedModules
                : [...allowedModules, "axios", "express", "semver"], // 正常保留外部依赖
        });
    };

    return preloadFiles.map((file) => createOutputConfig(path.join(preloadDir, file))); // 生成 preload 文件的配置数组
};
