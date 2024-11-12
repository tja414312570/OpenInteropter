import { IpcApi, pluginContext } from "extlib/main";
//@ts-ignore
import { execa } from "execa";
import { getPreloadFile, getUrl } from "./static-path";
import axios from "axios";
import VirtualWindow, { draw, DrawCallback } from "virtual-window";
import { createColors } from "picocolors";
const pc = createColors(true);
//@ts-ignore
import ansiEscapes from "ansi-escapes";
//@ts-ignore
import ora from "ora";
//@ts-ignore
import cliSpinners from "cli-spinners";
import { getFileName } from "./install";
import { DownloaderHelper } from "node-downloader-helper";
import path from "path";
import { getFileSHA256Sync } from './util'
import fs, { createReadStream, existsSync, unlinkSync } from "fs";
import { extractNode } from "./extract";
import { platform } from "os";
import util from "util";
import { exec } from "child_process";
import { symlink } from "fs/promises";
function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}
class NodeInstaller {
  uiApi: IpcApi;
  virtualWindow: VirtualWindow;
  render(content: string) {
    this.virtualWindow.write(content);
  }
  startUi() {
    this.virtualWindow = new VirtualWindow();
    this.uiApi = pluginContext.getIpcApi("node");
    this.uiApi.handle("list-node-version", async () => {
      return await this.getNodeVersions();
    });
    this.uiApi.handle("start-install", async (_event, version: any) => {
      this.render(ansiEscapes.eraseScreen);
      if (typeof version === "object") {
        version = version.version;
      }
      const fileName = `node-${version}-${getFileName()}`;
      this.render(`开始下载文件:${pc.blue(fileName)}`);
      this.startInstall(version, fileName);
    });
    const url = getUrl();
    const window = pluginContext.windowManager.createWindow(
      pluginContext.plugin.appId,
      {
        title: "Nodejs安装器",
        webPreferences: {
          preload: getPreloadFile("index"),
        },
        width: 720,
        height: 360,
        minimizable: false,
        resizable: false, // 禁用调整窗口大小
      }
    );
    window.loadURL(url);
    this.uiApi.onRenderBind("installer-output", () => {
      this.virtualWindow.onRender((content) => {
        console.log(debug(content));
        this.uiApi.send("installer-output", content);
      });
    });
  }
  async startInstall(version: string, fileName: string) {
    pluginContext.notifyManager.showTask({
      content: `文件名:${fileName}`,
      progress: -1,
    });
    const sha256 = await this.getNodeSha(version, fileName);
    console.log("256:" + sha256);
    const downloadUrl = `https://nodejs.org/dist/${version}/${fileName}`;
    this.render(`\n准备从服务器下载资源:${downloadUrl}`);
    const downpath = pluginContext.getPath("downloads");
    this.render("\x1b[0m");
    const filePath = path.join(downpath, fileName);
    const ani = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      prefix: "下载中  ",
    });
    try {
      const donaload = await this.startDownload(
        downloadUrl,
        filePath,
        ani,
        sha256,
      );
      ani.success(`${pc.green(`下载完成`)}\n` + pc.reset(""));
    } catch (err) {
      ani.error(`${pc.red(err)}\n` + pc.reset(""))
    }

    const extSaveNodePath = path.join(
      pluginContext.workPath,
      "node-" + version
    );
    this.render(`正在解压文件:${extSaveNodePath}`);
    const extAni = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      prefix: "请稍后 ",
    });
    if (fs.existsSync(extSaveNodePath)) {
      fs.mkdirSync(extSaveNodePath, { recursive: true });
    }
    pluginContext.notifyManager.showTask({
      content: `正在解压文件:${fileName}`,
      progress: -1,
    });
    let cache = -1;
    let extNodePath: string = await extractNode(
      filePath,
      (progress: any) => {
        progress = parseInt(progress);
        if (progress !== cache) {
          cache = progress;
          extAni.prefix(" ");
          extAni.suffix(` ${progress} %`);
          pluginContext.notifyManager.showTask({
            content: `正在解压文件:${fileName}`,
            progress: progress,
          });
        }
      },
      extSaveNodePath
    );
    pluginContext.notifyManager.showTask({
      content: `文件解压完成:${fileName}`,
      progress: -2,
    });
    extAni.success(`${pc.green(`解压完成`)}\n` + pc.reset(""));
    if (platform() !== "win32") {
      extNodePath = path.join(extNodePath, "bin");
    }
    const nodeCmd = path.join(extNodePath, "node");
    this.render("正在检测版本:");
    const execAni = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      prefix: "请稍后 ",
    });
    const execPromise = util.promisify(exec);
    try {
      const env = {};
      const { stdout, stderr } = await execPromise(`"${nodeCmd}" -v`, { env });
      const getVersion = stdout.trim();
      if (getVersion.length > 0) {
        pluginContext.settingManager.save(`version`, getVersion);
        pluginContext.settingManager.save(`path`, extNodePath);
        pluginContext.notifyManager.showTask({
          content: `NodeJs，版本:${stdout}`,
        });

        if (platform() === "win32") {
          if (existsSync('node.exe')) {
            unlinkSync('node.exe');
          }
          if (existsSync('npm.cmd')) {
            unlinkSync('npm.cmd');
          }
          if (existsSync('npx.cmd')) {
            unlinkSync('npx.cmd');
          }
          if (existsSync('node_modules')) {
            unlinkSync('node_modules');
          }
          await symlink(
            path.join(extNodePath, "node.exe"),
            path.join(pluginContext.envDir, "node.exe"),
            "file"
          );
          await symlink(
            path.join(extNodePath, "npm.cmd"),
            path.join(pluginContext.envDir, "npm.cmd"),
            "file"
          );
          await symlink(
            path.join(extNodePath, "npx.cmd"),
            path.join(pluginContext.envDir, "npx.cmd"),
            "file"
          );
          await symlink(
            path.join(extNodePath, "node_modules"),
            path.join(pluginContext.envDir, "node_modules"),
            "junction"
          );
        } else {
          if (existsSync('node')) {
            unlinkSync('node');
          }
          if (existsSync('npm')) {
            unlinkSync('npm');
          }
          if (existsSync('npx')) {
            unlinkSync('npx');
          }
          if (existsSync('node_modules')) {
            unlinkSync('node_modules');
          }
          await symlink(
            path.join(extNodePath, "node"),
            path.join(pluginContext.envDir, "node"),
            "file"
          );

          await symlink(
            path.join(extNodePath, "npm"),
            path.join(pluginContext.envDir, "npm"),
            "file"
          );
          await symlink(
            path.join(extNodePath, "npx"),
            path.join(pluginContext.envDir, "npx"),
            "file"
          );
          await symlink(
            path.join(extNodePath, "node_modules"),
            path.join(pluginContext.envDir, "node_modules"),
            "dir"
          );
        }
        execAni.success(`版本：${getVersion}`);
        return;
      }
      console.error("STD Error:", stderr);
      execAni.failed(`执行失败：${stderr}`);
    } catch (err) {
      execAni.error(`安装失败${err}`);
      console.error("Error:", err);
    }

  }

  async startDownload(
    url: string, filePath: string, ani: DrawCallback, hash?: string | null) {
      ani.prefix(" ");
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
    dl.on("start", () => {
      pluginContext.notifyManager.showTask({
        content: `开始下载文件: ${fileName}`,
        progress: 0,
      });
    
      ani.suffix(` ${0} %`);
    });

    dl.on("skip", (stats) => {
      pluginContext.notifyManager.showTask({
        content: `文件已存在，跳过下载: ${fileName}`,
        progress: 100,
      });
    });

    dl.on("download", (stats) => {
     
    });
    let cache = -1;
    dl.on("progress", (stats) => {
      const progress =  Math.floor(stats.progress);
      if (progress !== cache) {
        cache = progress;
        pluginContext.notifyManager.showTask({
          content: `正在下载文件: ${fileName}`,
          progress: progress,
        });
        ani.suffix(` ${progress} %`);
      }
    });

    dl.on("progress.throttled", (stats) => {
      const progress = stats.progress.toFixed(2);
      pluginContext.notifyManager.showTask({
        content: `正在下载文件(更新中): ${fileName}`,
        progress: parseFloat(progress),
      });
    });

    dl.on("retry", (attempt, retryOptions, error) => {
      pluginContext.notifyManager.showTask({
        content: `下载失败，正在重试（第${attempt}次）: ${fileName}`,
        progress: 0,
      });
      ani.suffix(`重试（第${attempt}次）`);
    });

    dl.on("end", (stats) => {
      pluginContext.notifyManager.showTask({
        content: `文件下载完成: ${fileName}`,
        progress: 100,
      });
    });

    dl.on("error", (stats) => {
      pluginContext.notifyManager.showTask({
        content: `下载出错: ${fileName}`,
        progress: 0,
      });
      // ani.error(`下载出错:${pc.red(stats.message)}\n` + pc.reset(""));
    });

    dl.on("timeout", () => {
      pluginContext.notifyManager.showTask({
        content: `下载超时: ${fileName}`,
        progress: 0,
      });
      ani.failed(`${pc.red("下载超时")}\n` + pc.reset(""));
    });

    dl.on("pause", () => {
      pluginContext.notifyManager.showTask({
        content: `下载暂停: ${fileName}`,
        progress: cache,
      });
      ani.pause("下载暂停中");
    });

    dl.on("resume", (isResume) => {
      pluginContext.notifyManager.showTask({
        content: `下载恢复: ${fileName}`,
        progress: cache,
      });
      ani.resume("下载恢复");
    });

    dl.on("stop", () => {
      pluginContext.notifyManager.showTask({
        content: `下载已停止: ${fileName}`,
        progress: 0,
      });
      ani.error(`${pc.red("下载已停止")}\n` + pc.reset(""));
    });

    dl.on("renamed", (stats) => {
      pluginContext.notifyManager.showTask({
        content: `文件重命名: ${stats.fileName}`,
        progress: cache,
      });
      ani.prefix("文件重命名中");
    });

    dl.on("redirected", (newUrl, oldUrl) => {
      pluginContext.notifyManager.showTask({
        content: `重定向到新地址: ${newUrl}`,
        progress: cache,
      });
      ani.prefix("重定向中");
    });

    dl.on("stateChanged", (state) => {
      pluginContext.notifyManager.showTask({
        content: `下载状态更改为: ${state}`,
        progress: cache,
      });
    });

    dl.on("warning", (error) => {
      pluginContext.notifyManager.showTask({
        content: `下载警告: ${error.message}`,
        progress: cache,
      });
      ani.prefix("警告中");
    });
    try {
      return dl.start();
    } catch (err) {
      throw new Error(`下载失败: ${(err as Error).message}`);
    }
  };
  async getNodeSha(version: string, fileName: string) {
    const shaUrl = `https://nodejs.org/dist/${version}/SHASUMS256.txt`;
    this.virtualWindow.write("\n正在从服务器获取文件sha值 ");
    const ani = draw(this.virtualWindow.getStream(), cliSpinners.dots);
    try {
      // 发起请求并获取数据
      const response = await axios.get(shaUrl, {
        responseType: "text", // 确保以文本格式接收数据
      });

      // 处理数据
      const lines = response.data.trim().split("\n");
      for (const line of lines) {
        // 使用正则表达式分割 SHA 值和文件名
        const match = line.match(/([a-f0-9]{64})\s+(.+)/);
        if (match) {
          const _sha = match[1];
          const _fileName = match[2];
          if (_fileName === fileName) {
            ani.success(_sha);
            return _sha;
          }
        }
      }
      ani.failed("没有找到");
      return null; // 如果没有找到匹配的文件名
    } catch (error) {
      ani.error(
        `Error fetching SHA for ${fileName}: ${(error as Error).message}`
      );
      throw new Error(
        `Error fetching SHA for ${fileName}: ${(error as Error).message}`
      );
    }
  }
  async start() {
    this.startUi();
    //let version = await this.getFromCurrentEnv();
  }
  async getNodeVersions() {
    try {
      const response = await axios.get(
        "https://nodejs.org/dist/index.json",
        {}
      );
      this.render(pc.red("hello world"));
      return response.data; // 返回解析后的数据
    } catch (error) {
      throw new Error(
        `Error fetching node versions: ${(error as Error).message}`
      );
    }
  }
  async getFromCurrentEnv() {
    pluginContext.notifyManager.showTask({
      content: "尝试从当前环境获取！",
      progress: -1,
    });
    try {
      const env = { ...process.env };
      const { stdout, stderr } = await execa("node -v", { env });
      const getVersion = stdout.trim();
      if (getVersion.length > 0) {
        pluginContext.settingManager.save(`version`, getVersion);
        pluginContext.settingManager.save(`path`, "default");
        pluginContext.notifyManager.showTask({
          content: `已获取到Node，版本:${stdout}`,
        });
        return getVersion;
      }
      console.error("STD Error:", stderr);
    } catch (err) {
      throw err;
    }
  }
}

export default new NodeInstaller();

// export const startInstall = async () => {
//   pluginContext.notifyManager.showTask({
//     content: "正在下载最新的nodejs版本",
//     progress: -1,
//   });
//   const versions = (await getNodeVersions()) as any;
//   const latestVersion = versions[0].version;
//   pluginContext.notifyManager.showTask({
//     content: `找到nodejs版本:${latestVersion}`,
//     progress: -1,
//   });
//   const fileName = `node-${latestVersion}-${getFileName()}`;
//   pluginContext.notifyManager.showTask({
//     content: `文件名:${fileName}`,
//     progress: -1,
//   });
//   const downloadUrl = `https://nodejs.org/dist/${latestVersion}/${fileName}`;
//   console.log(`下载地址:${downloadUrl}`);
//   const sha256 = await getNodeSha(latestVersion, fileName);
//   console.log("256:" + sha256);
//   const downpath = pluginContext.getPath("downloads");
//   const filePath = path.join(downpath, fileName);
//   console.log(filePath, "\n", path.basename(filePath));
//   await DownloadNode(
//     downloadUrl,
//     filePath,
//     (progress) => {
//       pluginContext.notifyManager.showTask({
//         content: `正在下载文件:${fileName}`,
//         progress: progress,
//       });
//     },
//     sha256
//   );
//   console.log("下载后的文件地址:" + filePath);
//   const extSaveNodePath = path.join(
//     pluginContext.workPath,
//     "node-" + latestVersion
//   );
//   if (fs.existsSync(extSaveNodePath)) {
//     fs.mkdirSync(extSaveNodePath, { recursive: true });
//   }
//   pluginContext.notifyManager.showTask({
//     content: `正在解压文件:${fileName}`,
//     progress: -1,
//   });
//   let extNodePath: string = await extractNode(
//     filePath,
//     (progress) => {
//       pluginContext.notifyManager.showTask({
//         content: `正在解压文件:${fileName}`,
//         progress: progress,
//       });
//     },
//     extSaveNodePath
//   );
//   pluginContext.notifyManager.showTask({
//     content: `文件解压完成:${fileName}`,
//     progress: -2,
//   });
//   console.log("解压后的文件路径:" + extNodePath);
//   if (platform() !== "win32") {
//     extNodePath = path.join(extNodePath, "bin");
//   }
//   const nodeCmd = path.join(extNodePath, "node");
//   try {
//     const env = {};
//     const { stdout, stderr } = await execPromise(`"${nodeCmd}" -v`, { env });
//     const getVersion = stdout.trim();
//     if (getVersion.length > 0) {
//       this.env = env;
//       pluginContext.settingManager.save(`version`, getVersion);
//       pluginContext.settingManager.save(`path`, extNodePath);
//       pluginContext.notifyManager.showTask({
//         content: `NodeJs，版本:${stdout}`,
//       });
//       if (platform() === "win32") {
//         await symlink(
//           path.join(extNodePath, "node.exe"),
//           path.join(pluginContext.envDir, "node.exe"),
//           "file"
//         );
//         await symlink(
//           path.join(extNodePath, "npm.cmd"),
//           path.join(pluginContext.envDir, "npm.cmd"),
//           "file"
//         );
//         await symlink(
//           path.join(extNodePath, "npx.cmd"),
//           path.join(pluginContext.envDir, "npx.cmd"),
//           "file"
//         );
//         await symlink(
//           path.join(extNodePath, "node_modules"),
//           path.join(pluginContext.envDir, "node_modules"),
//           "junction"
//         );
//       } else {
//         await symlink(
//           path.join(extNodePath, "node"),
//           path.join(pluginContext.envDir, "node"),
//           "file"
//         );
//         await symlink(
//           path.join(extNodePath, "npm"),
//           path.join(pluginContext.envDir, "npm"),
//           "file"
//         );
//         await symlink(
//           path.join(extNodePath, "npx"),
//           path.join(pluginContext.envDir, "npx"),
//           "file"
//         );
//         await symlink(
//           path.join(extNodePath, "node_modules"),
//           path.join(pluginContext.envDir, "node_modules"),
//           "dir"
//         );
//       }
//       return;
//     }
//     console.error("STD Error:", stderr);
//   } catch (err) {
//     console.error("Error:", err);
//   }
// };
