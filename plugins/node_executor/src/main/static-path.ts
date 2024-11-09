// 这里定义了静态文件路径的位置
import { join, dirname } from "path";
import config from "@config/index";
import { fileURLToPath } from "url";
console.log("环境:", process.env.NODE_ENV);
const env = process.env.NODE_ENV;

const filePath = {
  winURL: {
    development: `http://localhost:${process.env.PORT}`,
    production: `file://${join(__dirname, "dist", "renderer", "index.html")}`,
  },
  loadingURL: {
    development: `http://localhost:${process.env.PORT}/loader.html`,
    production: `file://${join(__dirname, "dist", "renderer", "loader.html")}`,
  },
  getUrl: (filename?: string) => {
    if (env === "development") {
      return `http://localhost:${process.env.PORT}${
        filename ? `/#/${filename}` : ""
      }`;
    }
    return `file://${join(
      __dirname,
      "dist",
      "renderer",
      `index.html${filename ? `/#/${filename}` : ""}`
    )}`;
  },
  settingURL: {
    development: `http://localhost:${process.env.PORT}/setting.html`,
    production: `file://${join(__dirname, "dist", "renderer", "setting.html")}`,
  },
  __static: {
    development: join(
      __dirname,
      "..",
      "..",
      "src",
      "renderer",
      "public"
    ).replace(/\\/g, "\\\\"),
    production: join(__dirname, "dist", "renderer").replace(/\\/g, "\\\\"),
  },
  getPreloadFile(fileName: string) {
    if (env !== "development") {
      return join(__dirname, "preload", `${fileName}.js`);
    }
    return join(__dirname, "preload", `${fileName}.js`);
  },
};

process.env.__static = filePath.__static[env];

process.env.__lib = getAppRootPath(config.DllFolder);
process.env.__updateFolder = getAppRootPath(config.HotUpdateFolder);

function getAppRootPath(path: string) {
  return env !== "development"
    ? join(__dirname, "..", "..", "..", "..", path).replace(/\\/g, "\\\\")
    : join(__dirname, "..", "..", "..", path).replace(/\\/g, "\\\\");
}

export const winURL = filePath.winURL[env];
export const loadingURL = filePath.loadingURL[env];
export const getUrl = filePath.getUrl;
export const lib = process.env.__lib;
export const updateFolder = process.env.__updateFolder;
export const getPreloadFile = filePath.getPreloadFile;
