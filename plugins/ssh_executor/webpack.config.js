const path = require("path");
const fs = require("fs");
const glob = require("glob");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Webpack 配置：Node.js 环境，用于打包 `main` 目录
const mainConfig = {
  entry: "./src/main/index.ts", // 入口文件为 main 目录下的 index.ts
  target: "node", // Node.js 环境
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  externals: [
    "node-pty", // 将 fs 模块标记为外部模块
  ],
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "main.js", // 输出文件名
    path: path.resolve(__dirname, "dist"), // 输出到 dist 目录
    libraryTarget: "commonjs2", // Node.js 使用 CommonJS2
  },
  mode: "production",
  optimization: {
    minimize: false, // 禁用压缩
  },
};

// Webpack 配置：Web 环境，用于打包 `render` 目录
const renderConfig = {
  entry: glob.sync("./src/render/**/*.ts").reduce((entries, file) => {
    const entry = path.basename(file, path.extname(file));
    entries[`render/${entry}`] = file;
    return entries;
  }, {}), // render 目录下所有 TypeScript 文件为入口文件
  target: "web", // 浏览器环境
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: "[name].js", // 输出文件名保持 render 目录结构
    path: path.resolve(__dirname, "dist"), // 输出到 dist 根目录，render 文件夹不再重复嵌套
  },
  mode: "production",
  optimization: {
    minimize: false, // 禁用压缩
  },
};

const copy = {
  entry: {}, // 无需入口文件
  mode: "production",
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "manifest.json",
          to: "manifest.json",
          transform(content) {
            const manifest = JSON.parse(content.toString());
            Object.keys(manifest).forEach((key) => {
              if (typeof manifest[key] === "string") {
                manifest[key] = manifest[key].replace("./dist/", "");
              }
            });
            return JSON.stringify(manifest, null, 2);
          },
        }, // 复制到 dist 根目录
        { from: "assets", to: "assets" }, // 复制到 dist 根目录
      ],
    }),
  ],
};

module.exports = [mainConfig, renderConfig, copy]; // 导出多个配置
