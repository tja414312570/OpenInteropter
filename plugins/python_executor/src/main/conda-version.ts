import axios from "axios";
import * as cheerio from "cheerio";

export type MinicodaItemInfo = {
  filename: string;
  version: string;
  platform: string;
  architecture: string;
  size: string;
  lastModified: string;
  sha256: string;
};

const url = "https://repo.anaconda.com/miniconda/";

// 获取当前平台和架构信息
const currentPlatform = (() => {
  switch (process.platform) {
    case "win32":
      return "Windows";
    case "darwin":
      return "MacOSX";
    case "linux":
      return "Linux";
    default:
      throw new Error("不支持的操作系统平台");
  }
})();

const currentArchitecture = (() => {
  switch (process.arch) {
    case "x64":
      return "x86_64";
    case "ia32":
      return "x86";
    case "arm64":
      return "arm64";
    case "ppc64":
      return "ppc64le";
    case "s390":
      return "s390x";
    default:
      throw new Error("不支持的架构");
  }
})();

export const getPythonList = async () => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const data: MinicodaItemInfo[] = [];

    $("table tr").each((index, element) => {
      if (index === 0) return; // 跳过表头

      const filename = $(element).find("td a").attr("href")?.trim();
      const size = $(element).find("td.s").text().trim();
      const lastModified = $(element).children().eq(2).text().trim();
      const sha256 = $(element).children().eq(3).text().trim();
      if (!filename) return;

      // 从文件名中提取版本、平台和架构信息
      const match = filename.match(
        /Miniconda3-(py\d+_\d+\.\d+\.\d+-\d+|latest)-(Windows|MacOSX|Linux)-(x86_64|x86|arm64|aarch64|ppc64le|s390x)\.(exe|sh|pkg)/
      );
      if (match) {
        const [, version, platform, architecture] = match;

        // 只推入当前平台和架构的数据
        if (
          platform === currentPlatform &&
          architecture === currentArchitecture &&
          (filename.endsWith(".sh") || filename.endsWith(".exe"))
        ) {
          data.push({
            filename,
            version,
            platform,
            architecture,
            size,
            lastModified,
            sha256,
          });
        }
      }
    });
    return data;
  } catch (error) {
    console.error("页面获取失败:", error);
    throw new Error(`获取版本异常: ${(error as any).message}`);
  }
};
