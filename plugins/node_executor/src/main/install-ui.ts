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
//@ts-ignore
import got from "got";
import { getFileName } from "./install";
import { DownloaderHelper } from "node-downloader-helper";
import path, { basename } from "path";
import { getFileSHA256Sync } from "./util";
import fs, { createReadStream, existsSync, unlinkSync } from "fs";
import { extractNode } from "./extract";
import { platform } from "os";
import util from "util";
import { exec } from "child_process";
import { symlink } from "fs/promises";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);
function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}
class NodeInstaller {
  modify(nodePath: any) {
    this.checkStatus();
    this.uiApi =  pluginContext.getIpcApi('node');
      this.virtualWindow = new VirtualWindow();
        const window = pluginContext.windowManager.createWindow('render',{
          title: "Nodejs安装器",
            webPreferences: {
              preload: getPreloadFile("index"),
            },
            width: 720,
            height: 360,
            minimizable: false,
            resizable: false, // 禁用调整窗口大小
          } );
        try{
          window.loadURL(getUrl('render'))
          this.uiApi.onRenderBind('installer-output',()=>{
            this.virtualWindow.write('正在修复依赖环境')
            const extAni = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
              suffix: " 请稍后",
            });
            try{
              this.copyBin(nodePath)
              
              const current = this.getFromCurrentEnv();
              this.uiApi.send('installer-output-completed');
              extAni.success(`修复完成,当前版本:${current}`)
            }catch(err){
              extAni.error(pc.red('修复失败:'+err))
            }
          });
          window.on("close", () => {
            this.virtualWindow.clear();
          });
          this.uiApi.handle("close-window", async (_event, version: any) => {
            window.close();
          });
        }catch(err){
         throw err;
        }
  }
  checkStatus() {
    if(this.uiApi != null || this.virtualWindow != null){
      throw new Error("一个安装程序正在运行中")
    }
  }
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
      this.render(ansiEscapes.clearScreen);
      if (typeof version === "object") {
        version = version.version;
      }
      const fileName = `node-${version}-${getFileName()}`;
      this.render(`开始下载文件:${fileName}`);
      await this.startInstall(version, fileName);
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
    window.on("close", () => {
      this.virtualWindow.clear();
    });
    this.uiApi.handle("close-window", async (_event, version: any) => {
      window.close();
    });
  }
  async startInstall(version: string, fileName: string) {
    pluginContext.notifyManager.showTask({
      content: `文件名:${fileName}`,
      progress: -1,
    });
    this.virtualWindow.write("\n从服务器获取文件sha值 ");
    const sha256 = await this.getNodeSha(version, fileName);
    const downloadUrl = `https://nodejs.org/dist/${version}/${fileName}`;
    this.render(`\n从服务器下载资源:${downloadUrl}`);
    const downpath = pluginContext.getPath("downloads");
    const filePath = path.join(downpath, fileName);
    await this.startDownload(downloadUrl, filePath, sha256);
    const extSaveNodePath = path.join(
      pluginContext.workPath,
      "node-" + version
    );
    this.render(`\n正在解压文件:${extSaveNodePath}`);
    const extAni = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      suffix: " 请稍后",
    });
    if (fs.existsSync(extSaveNodePath)) {
      fs.mkdirSync(extSaveNodePath, { recursive: true });
    }
    pluginContext.notifyManager.showTask({
      content: `正在解压文件:${fileName}`,
      progress: -1,
    });
    let cache = -1;
    let extNodePath: string;
    try {
      extNodePath = await extractNode(
        filePath,
        (progress: any) => {
          progress = parseInt(progress);
          if (progress !== cache) {
            cache = progress;
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
      extAni.success(pc.green(`解压完成`));
    } catch (err) {
      extAni.error(pc.red(`解压失败:${err.message}`));
      throw err;
    }
    if (platform() !== "win32") {
      extNodePath = path.join(extNodePath, "bin");
    }
    const nodeCmd = path.join(extNodePath, "node");
    this.render("\n检测版本:");
    const execAni = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      suffix: " 请稍后",
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
        this.copyBin(extNodePath);
        execAni.success(pc.green(`版本：${getVersion}`));
      } else {
        throw new Error(`${stderr}`);
      }
    } catch (err) {
      execAni.error(pc.red(`安装失败:${err.message}`));
      throw err;
    }
  }
  async copyBin(extNodePath: string) {
    if (platform() === "win32") {
      if (existsSync("node.exe")) {
        unlinkSync("node.exe");
      }
      if (existsSync("npm.cmd")) {
        unlinkSync("npm.cmd");
      }
      if (existsSync("npx.cmd")) {
        unlinkSync("npx.cmd");
      }
      if (existsSync("node_modules")) {
        unlinkSync("node_modules");
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
      if (existsSync("node")) {
        unlinkSync("node");
      }
      if (existsSync("npm")) {
        unlinkSync("npm");
      }
      if (existsSync("npx")) {
        unlinkSync("npx");
      }
      if (existsSync("node_modules")) {
        unlinkSync("node_modules");
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
  }
  async startDownload(url: string, filePath: string, hash?: string | null) {
    const ani = draw(this.virtualWindow.getStream(), cliSpinners.dots, {
      suffix: " 请稍后",
    });
    const timeout = 15000;
    let lastReceived = Date.now();
    let checkInterval: undefined | NodeJS.Timeout;
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
      ani.error(`${pc.red("下载失败:" + err.message)}`);
      throw new Error(`下载失败: ${(err as Error).message}`);
    } finally {
      checkInterval && clearInterval(checkInterval);
    }
  }
  async getNodeSha(version: string, fileName: string) {
    const shaUrl = `https://nodejs.org/dist/${version}/SHASUMS256.txt`;
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
    if (!version) {
      this.startUi();
    }
  }
  async getNodeVersions() {
    try {
      const response = await axios.get(
        "https://nodejs.org/dist/index.json",
        {}
      );
      this.render(pc.red("等待选择版本"));
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
      const env = pluginContext.env;
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
      throw new Error("STD ERR:"+stderr)
    } catch (err) {
      throw err;
    }
  }
}

export default new NodeInstaller();
