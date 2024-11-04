import { DownloaderHelper } from "node-downloader-helper";
import path from "path";
import fs, { createReadStream, unlinkSync } from "fs";
import { createHash } from "crypto";
import { Agent } from "http";

function getFileSHA256Sync(filePath: string) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
}

const downloadNode = async (
  url: string,
  filePath: string,
  hash?: string | null
): Promise<string> => {
  if (hash && fs.existsSync(filePath)) {
    const file_hash = await getFileSHA256Sync(filePath);
    console.log("文件hash值");
    if (hash === file_hash) {
      console.log("文件已下载:", filePath);
      return filePath;
    } else {
      console.log("文件不完整，重新下载");
      unlinkSync(filePath);
    }
  }
  const fileName = path.basename(filePath);
  const downloadDir = path.dirname(filePath);
  const dl = new DownloaderHelper(url, downloadDir, {
    fileName: fileName,
    resumeIfFileExists: true, // 如果文件存在则继续下载
    override: true, // 默认不覆盖已有文件
    httpsRequestOptions: {},
  });

  dl.on("progress", (stats) => {
    process.stdout.write(`\r下载进度: ${stats.progress.toFixed(2)}%`);
  });

  dl.on("end", () => {
    console.log(`下载完成: ${filePath}`);
  });

  dl.on("error", (err) => {
    console.error(`下载出错: ${err.message}`);
  });

  try {
    await dl.start();
    return filePath;
  } catch (err) {
    throw new Error(`下载失败: ${(err as Error).message}`);
  }
};

export default downloadNode;
