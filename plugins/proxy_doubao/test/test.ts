import path from "path";
import fs from "fs/promises";
import { SseHandler } from "../src/main/doubao";
const path_ =
  "file://Volumes/mac_data/git/ml-demo/electron-vite-template/plugins/proxy_doubao/dist/render/js_bridge.js"; //path.join("file://", __dirname, "render", "js_bridge.js");
const handler = new SseHandler();
handler.onMessage((message) => {});
handler.onEnd((data: any) => {
  console.log(data);
});
handler.onError((err) => {
  console.error(err);
});
fs.readFile(path.join(__dirname, "test.txt"), "utf-8").then((data) => {
  handler.feed(data);
});
