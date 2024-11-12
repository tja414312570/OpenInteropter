import got, { Request } from "got";
import fs from "fs";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);
const url = "https://nodejs.org/dist/v23.0.0/node-v23.0.0-darwin-arm64.tar.gz";
async function downloadFile(url, outputFilePath) {
  console.log(`Starting download from: ${url}`);
  const timeout = 15000;
  let checkInterval: string | number | NodeJS.Timeout;
  let response: Request;
  try {
    let lastReceived = Date.now();
    response = got.stream(url, {
      timeout: {
        lookup: 5000, // DNS 查找超时时间 5秒
        connect: 10000, // 连接超时时间 10秒
        secureConnect: 3000, // TLS 握手超时时间 3秒
        socket: 115000, // 套接字空闲超时时间 5秒
        send: 1000, // 请求发送超时时间 1秒
        response: 30000, // 响应首字节超时时间 30秒
        request: 120000, // 整个请求超时时间 120秒
      },
    });
    checkInterval = setInterval(() => {
      if (Date.now() - lastReceived > timeout) {
        response.destroy(new Error(`服务器响应超时:${timeout / 1000}`));
      }
    }, 5000); // 每 5 秒检查一次
    // Monitor progress
    response.on("downloadProgress", ({ transferred, total, percent }) => {
      lastReceived = Date.now();
      const percentage = Math.round(percent * 100);
      console.error(`progress: l${transferred}/${total} (${percentage}%)`);
    });
    // Write file to disk
    await streamPipeline(response, fs.createWriteStream(outputFilePath));
  } finally {
    checkInterval && clearInterval(checkInterval);
    response && !response.destroyed && response.destroy();
  }
}

const outputFilePath = "./node-v23.0.0-darwin-arm64.tar.gz";
(async () => {
  try {
    await downloadFile(url, outputFilePath);
  } catch (error) {
    console.error("下载错误:", error.message);
  }
})();
