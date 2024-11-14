import { IpcApi, pluginContext } from "extlib/main";

import { getPythonList, MinicodaItemInfo } from "./conda-version";
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
//@ts-ignore
import got from "got";
// import { getFileName } from "./install";
import path, { basename } from "path";
import { getFileSHA256Sync } from "./util";
import fs, { createReadStream, existsSync, unlinkSync } from "fs";
// import { extractpython } from "./extract";
import { platform } from "os";
import util from "util";
import { exec, spawn } from "child_process";
import { symlink } from "fs/promises";
import { pipeline } from "stream";
import { promisify } from "util";
const execPromise = util.promisify(exec);
const streamPipeline = promisify(pipeline);
function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}
class pythonInstaller {
  async modify(pythonPath: any, version: string) {
    console.log("修复;" + pythonPath);
    this.checkStatus();
    this.uiApi = pluginContext.getIpcApi("installer");
    this.virtualWindow = new VirtualWindow();
    this.virtualWindow.onRender((message) => {});
    const window = pluginContext.windowManager.createWindow("render", {
      title: "pythonjs安装器",
      webPreferences: {
        preload: getPreloadFile("index"),
      },
      width: 720,
      height: 360,
      minimizable: false,
      resizable: false, // 禁用调整窗口大小
    });
    try {
      const url = getUrl("render");
      window.loadURL(url);
      this.uiApi.onRenderBind("render", async () => {
        this.virtualWindow.onRender((content) => {
          console.log(debug(content));
          this.uiApi.send("render", content);
        });
        this.virtualWindow.write("正在修复依赖环境");
        const extAni = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
          suffix: " 请稍后",
        });
        try {
          await pluginContext.envManager.setEnv("PYTHON_HOME", pythonPath);
          const current = await this.getFromCurrentEnv();
          if (current.trim() !== version.trim()) {
            extAni.suffix(` 修复失败,等待用户确认`);
            const result = await pluginContext.showDialog({
              message: "修复失败，是否确认使用系统版本",
              buttons: ["确认", "取消"],
              defaultId: 0, // 默认选择第一个按钮
              cancelId: 1, // 当用户关闭对话框时，视为点击“取消”
            });
            if (result.response === 0) {
              pluginContext.settingManager.save(`version`, version);
              pluginContext.settingManager.save(`path`, "default");
            } else {
              throw new Error(`环境中版本和安装版本不一致!`);
            }
          }
          this.uiApi.send("installer-completed");
          extAni.success(`修复完成,当前版本:${current}`);
        } catch (err) {
          extAni.error(pc.red("修复失败:" + err));
        }
      });
      window.on("close", () => {
        this.virtualWindow.clear();
      });
      this.uiApi.handle("close-window", async (_event, version: any) => {
        window.close();
      });
    } catch (err) {
      throw err;
    }
  }
  checkStatus() {
    if (this.uiApi != null || this.virtualWindow != null) {
      throw new Error("一个安装程序正在运行中");
    }
  }
  uiApi!: IpcApi;
  virtualWindow!: VirtualWindow;
  render(content: string) {
    this.virtualWindow?.write(content);
  }
  startUi() {
    console.log("安装;");
    this.virtualWindow = new VirtualWindow();
    this.uiApi = pluginContext.getIpcApi("installer");
    this.uiApi.handle("list-version", async () => {
      return await getPythonList();
    });
    this.uiApi.handle(
      "start-install",
      async (_event, selected: MinicodaItemInfo) => {
        this.render(ansiEscapes.clearScreen);
        const { filename, version, sha256 } = selected;
        this.render(`开始下载文件:${filename}`);
        await this.startInstall(version, filename, sha256);
      }
    );
    const url = getUrl();
    const window = pluginContext.windowManager.createWindow(
      pluginContext.plugin.appId,
      {
        title: "pythonjs安装器",
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
    this.uiApi.onRenderBind("render", () => {
      this.virtualWindow.onRender((content) => {
        console.log(debug(content));
        this.uiApi.send("render", content);
      });
    });
    window.on("close", () => {
      this.virtualWindow.clear();
    });
    this.uiApi.handle("close-window", async (_event, version: any) => {
      window.close();
    });
  }
  async startInstall(version: string, fileName: string, sha256: string) {
    pluginContext.notifyManager.showTask({
      content: `文件名:${fileName}`,
      progress: -1,
    });
    const downloadUrl = `https://repo.anaconda.com/miniconda/${fileName}`;
    this.render(`\n从服务器下载资源:${downloadUrl}`);
    const downpath = pluginContext.getPath("downloads");
    const filePath = path.join(downpath, fileName);
    await this.startDownload(downloadUrl, filePath, sha256);
    const extSavepythonPath = path.join(
      pluginContext.workPath,
      "python-" + version
    );
    this.render(`\n正在安装:${extSavepythonPath}`);
    const extAni = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      suffix: " 请稍后",
    });
    if (fs.existsSync(extSavepythonPath)) {
      fs.mkdirSync(extSavepythonPath, { recursive: true });
    }
    pluginContext.notifyManager.showTask({
      content: `正在安装python:${fileName}`,
      progress: -1,
    });
    let cache = -1;
    let extpythonPath: string;
    try {
      this.installPython(filePath, extSavepythonPath);
      pluginContext.notifyManager.showTask({
        content: `安装完成:${fileName}`,
        progress: -2,
      });
      extAni.success(pc.green(`安装完成`));
    } catch (err) {
      extAni.error(pc.red(`安装完成:${(err as Error).message}`));
      throw err;
    }
    if (platform() !== "win32") {
      extpythonPath = path.join(extpythonPath, "bin");
    }
    const pythonCmd = path.join(extpythonPath, "python");
    this.render("\n检测版本:");
    const execAni = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      suffix: " 请稍后",
    });

    try {
      const env = {};
      const { stdout, stderr } = await execPromise(`"${pythonCmd}" -V`, {
        env,
      });
      const getVersion = stdout.trim();
      if (getVersion.length > 0) {
        pluginContext.settingManager.save(`version`, getVersion);
        pluginContext.settingManager.save(`path`, extpythonPath);
        pluginContext.notifyManager.showTask({
          content: `pythonJs，版本:${stdout}`,
        });
        await pluginContext.envManager.setEnv("python_HOME", extpythonPath);
        execAni.success(pc.green(`版本：${getVersion}`));
      } else {
        throw new Error(`${stderr}`);
      }
    } catch (err) {
      execAni.error(pc.red(`安装失败:${err.message}`));
      throw err;
    }
  }
  async copyBin(extpythonPath: string) {
    await pluginContext.envManager.setEnv("python_HOME", extpythonPath);
  }
  async startDownload(url: string, filePath: string, hash?: string | null) {
    const ani = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      suffix: " 请稍后",
    });
    const timeout = 15000;
    let lastReceived = Date.now();
    let checkInterval: undefined | pythonJS.Timeout;
    try {
      if (hash && fs.existsSync(filePath)) {
        const file_hash = await getFileSHA256Sync(filePath);
        if (hash === file_hash) {
          ani.success(pc.green(" 文件已下载"));
          return filePath;
        } else {
          unlinkSync(filePath);
        }
      }
      const response = got.stream(url, {
        timeout: {
          lookup: 5000, // DNS 查找超时时间 5秒
          connect: 10000, // 连接超时时间 10秒
          secureConnect: 3000, // TLS 握手超时时间 3秒
        },
      });
      checkInterval = setInterval(() => {
        const diffTime = Date.now() - lastReceived;
        if (diffTime > timeout) {
          response.destroy(
            new Error(`服务器响应超时:超时时间${diffTime / 1000}秒`)
          );
        }
      }, 5000); // 每 5 秒检查一次
      let cache = -1;
      response.on("downloadProgress", ({ transferred, total, percent }) => {
        lastReceived = Date.now();
        const progress = Math.round(percent * 100);
        if (progress !== cache) {
          cache = progress;
          pluginContext.notifyManager.showTask({
            content: `正在下载文件: ${basename(filePath)}`,
            progress: progress,
          });
          ani.suffix(` ${progress} %`);
        }
      });
      // Write file to disk
      await streamPipeline(response, fs.createWriteStream(filePath));
      ani.success(pc.green(" 下载完成"));
    } catch (err) {
      ani.error(`${pc.red("下载失败:" + (err as Error).message)}`);
      throw new Error(`下载失败: ${(err as Error).message}`);
    } finally {
      checkInterval && clearInterval(checkInterval);
    }
  }
  // 安装 Python
  installPython(downloadPath: string, INSTALL_DIR: string) {
    return new Promise((resolve, reject) => {
      if (platform() === "win32") {
        // Windows: 解压嵌入式 Python
        const unzip = require("unzipper");
        fs.createReadStream(INSTALL_DIR)
          .pipe(unzip.Extract({ path: INSTALL_DIR }))
          .on("close", () => {
            console.log("Python 已安装在:", INSTALL_DIR);
          });
      } else {
        // macOS 和 Linux: 使用 bash 安装 Miniconda
        fs.chmodSync(downloadPath, "755");
        const installProcess = spawn("bash", [
          downloadPath,
          "-b",
          "-p",
          INSTALL_DIR,
          "-f",
        ]);
        console.log(installProcess.spawnargs);
        installProcess.stdout.setEncoding("utf-8");
        installProcess.stdout.on("data", (data) => {
          this.virtualWindow.write(data);
        });
        installProcess.stderr.setEncoding("utf-8");
        installProcess.stderr.on("data", (data) => {
          this.virtualWindow.write(data);
        });
        installProcess.on("close", (code) => {
          if (code === 0) {
            resolve("");
          } else {
            reject(new Error("安装 Miniconda 失败"));
          }
        });
      }
    });
  }
  async getpythonSha(version: string, fileName: string) {
    const shaUrl = `https://pythonjs.org/dist/${version}/SHASUMS256.txt`;
    const ani = draw(this.virtualWindow.getStream(), cliSpinners.dots);
    try {
      const response = await axios.get(shaUrl, {
        responseType: "text", // 确保以文本格式接收数据
      });
      const lines = response.data.trim().split("\n");
      for (const line of lines) {
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
      throw new Error(`没有找到${fileName}的hash数据`);
    } catch (error) {
      ani.error(pc.red(`获取hash文件失败${(error as Error).message}`));
      throw error;
    }
  }
  async start() {
    let version = await this.getFromCurrentEnv();
    if (version) {
      const result = await pluginContext.showDialog({
        message: `检查到系统中已存在python ${version}，是否确认使用系统版本`,
        buttons: ["确认", "取消"],
        defaultId: 0, // 默认选择第一个按钮
        cancelId: 1, // 当用户关闭对话框时，视为点击“取消”
      });
      if (result.response === 0) {
        pluginContext.settingManager.save(`version`, version);
        pluginContext.settingManager.save(`path`, "default");
        return;
      }
    }
    this.startUi();
  }
  async getFromCurrentEnv() {
    pluginContext.notifyManager.showTask({
      content: "尝试从当前环境获取！",
      progress: -1,
    });
    try {
      const env = pluginContext.env;
      const { stdout, stderr } = await execPromise("python -V", env);
      const getVersion = stdout.trim();
      if (getVersion.length > 0) {
        pluginContext.notifyManager.showTask({
          content: `已获取到python，版本:${stdout}`,
        });
        return getVersion;
      }
      console.error("STD Error:", stderr);
      throw new Error("STD ERR:" + stderr);
    } catch (err) {
      throw err;
    }
  }
}

export default new pythonInstaller();
