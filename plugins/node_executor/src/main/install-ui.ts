import { IpcApi, pluginContext } from "extlib/main";
//@ts-ignore
import { execa } from "execa";
import { getPreloadFile, getUrl } from "./static-path";
import axios from "axios";
import VirtualWindow, { draw } from "virtual-window";
import { createColors } from "picocolors";
const pc = createColors(true);
//@ts-ignore
import ansiEscapes from "ansi-escapes";
//@ts-ignore
import ora from "ora";
//@ts-ignore
import cliSpinners from "cli-spinners";
import { getFileName } from "./install";
import path from "path";
import DownloadNode from "./download";
import fs from "fs";
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
    let cache = -1;
    await DownloadNode(
      downloadUrl,
      filePath,
      (progress: any) => {
        progress = parseInt(progress);
        if (progress !== cache) {
          cache = progress;
          ani.prefix(" ");
          ani.suffix(` ${progress} %`);
          pluginContext.notifyManager.showTask({
            content: `正在下载文件:${fileName}`,
            progress: progress,
          });
        }
      },
      sha256
    );
    ani.success(`${pc.green(`下载完成`)}\n` + pc.reset(""));
    const extSaveNodePath = path.join(
      pluginContext.workPath,
      "node-" + version
    );
    this.render(`正在解压数据:${extSaveNodePath}`);
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
    this.render("正在检测版本");
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
      execAni.success(`安装失败${err}`);
      console.error("Error:", err);
    }
    this.render("正在检测版本");
  }
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
