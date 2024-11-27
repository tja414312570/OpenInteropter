import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import json from "@rollup/plugin-json";
import { builtinModules } from "module";
import { defineConfig, ExternalOption } from 'rollup';
import dts from 'rollup-plugin-dts';

const external: ExternalOption | undefined = [
    ...builtinModules,
    "node-pty",
    "axios",
    "electron",
    "events",
    "express",
    "ffi-napi",
    "ref-napi",
    "ref-struct-napi",
    "semver",
    "glob",
]

export const buildOptions = (fileName: string) => {
    return [defineConfig({
        input: `./src/${fileName}.ts`,
        output: [
            {
                dir: 'dist/esm',
                format: 'esm',
                preserveModules: true,
                preserveModulesRoot: 'src',
                exports: "named",
            },
            {
                dir: 'dist/cjs',
                format: 'cjs',
                preserveModules: true,
                preserveModulesRoot: 'src',
                exports: "named",
            }
        ],
        treeshake: false, // 禁用 Tree-shaking
        plugins: [
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
                target: "es2020",
                define: {
                    __VERSION__: '"x.y.z"',
                },
                loaders: {
                    ".json": "json",
                    ".js": "jsx",
                },
            }),
        ],
        onwarn(warning, warn) {
            if (warning.code === "CIRCULAR_DEPENDENCY") {
                return;
            }
            if (warning.code === 'UNRESOLVED_IMPORT') {
                console.error('无法解析模块:', warning);
            }
            warn(warning);
        },
        external
    }), defineConfig({
        input: `./src/${fileName}.ts`,
        output: {
            file: `./dist/${fileName}.d.ts`,
            format: 'esm',
        },
        plugins: [dts()],
        external
    }
    )];
}