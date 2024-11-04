import path from "path";
import fs from "fs/promises";
const path_ =
  "file://Volumes/mac_data/git/ml-demo/electron-vite-template/plugins/proxy_doubao/dist/render/js_bridge.js"; //path.join("file://", __dirname, "render", "js_bridge.js");
console.log("加载脚本:", path_);
fs.readFile(path_, "utf-8")
  .then((script) => {
    console.log("加载脚本:", script);
  })
  .catch((err) => {
    console.error(err);
  });
