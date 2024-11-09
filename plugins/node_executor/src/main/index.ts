import {
  AbstractPlugin,
  InstructContent,
  InstructExecutor,
  InstructResult,
  InstructResultType,
  pluginContext,
} from "extlib/main";
import { Pluginlifecycle } from "extlib/main";
import { ExtensionContext } from "extlib/main";
import { createContext, runInContext } from "vm";
import { stringify } from "circular-json";
import { rejects } from "assert";
import fs from "fs";
import { symlink } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { ChildProcess, exec, fork } from "child_process";
import VirtualWindow from "./virtual-window";
import path from "path";
import util from "util";
import { getFileName, getNodeSha, getNodeVersions } from "./install";
import DownloadNode from "./download";
import { extractNode } from "./extract";
import { startNodeChildProcess } from "./node-executor";
import { platform } from "os";
import { getPreloadFile, getUrl } from "./static-path";
import { watcher } from "extlib/dev";
watcher();
class ExecuteContext {
  private _data: ((data: string) => void) | undefined;
  private _write: ((data: string) => void) | undefined;
  private _error: ((data: Error) => void) | undefined;
  private _end: ((data?: string) => void) | undefined;
  private _abort: ((message?: any) => void) | undefined;
  private _process;
  constructor(childProcess: ChildProcess) {
    this._process = childProcess;
  }
  callData(data: string) {
    if (!this._data) {
      throw new Error("没有响应回调");
    }
    this._data(data);
  }
  abort(message: string) {
    if (!this._abort) {
      throw new Error("没有终止回调");
    }
    this._abort(message);
  }
  write(data: string) {
    if (!this._write) {
      throw new Error("没有发送回调");
    }
    this._write(data);
  }
  error(data: string | Error) {
    if (!this._error) {
      throw new Error("没有错误回调");
    }
    if (data instanceof Error) {
      this._error(data);
    } else {
      this._error(new Error(data));
    }
  }

  end(data?: string) {
    if (!this._end) {
      throw new Error("没有结束回调");
    }
    this._end(data);
  }
  onAbort(callback: (data: string) => void) {
    this._abort = callback;
  }
  onWrite(callback: (data: string) => void) {
    this._write = callback;
  }
  onData(callback: (data: string) => void) {
    this._data = callback;
  }

  onError(callback: (data: Error) => void) {
    this._error = callback;
  }
  onEnd(callback: () => void) {
    this._end = callback;
  }
}

class NodeExecutor
  extends AbstractPlugin
  implements Pluginlifecycle, InstructExecutor
{
  private executeContext: null | ExecuteContext = null;
  env = {} as any;
  currentTask(): string[] {
    return this.executeContext ? [""] : [];
  }
  abort(instruct: InstructContent): Promise<InstructResult | void> {
    if (!this.executeContext) {
      return Promise.reject(new Error("没有找到正在执行的指令"));
    }
    this.executeContext.abort("用户主动终止");
    return Promise.resolve();
  }
  execute(instruct: InstructContent): Promise<InstructResult> {
    return new Promise((resolve, reject) => {
      if (this.executeContext) {
        reject("一个程序正在运行中");
      }
      const execId = uuidv4();
      const { code, language, id } = instruct;
      this.executeContext = new ExecuteContext(null as any);
      try {
        let childProcess: ChildProcess;
        const destory = () => {
          this.executeContext = null;
          childProcess?.kill();
        };
        let isNomalExit = false;
        this.executeContext.onError((err) => {
          isNomalExit = true;
          render(
            `程序异常:${util.inspect(err, { colors: true })}`,
            InstructResultType.completed
          );
          destory();
          const output = virtualWindow.render();
          resolve({
            id: instruct.id,
            std: output,
            execId,
            type: InstructResultType.completed,
          });
        });
        const virtualWindow = new VirtualWindow();
        const line = code.split(/\r?\n/).length;
        const codeViewApi = pluginContext.getCrossIpcApi("code-view-api");
        const render = (data: string, type: InstructResultType) => {
          console.log(data);
          virtualWindow.write(data);
          const output = virtualWindow.render();

          codeViewApi.send("insertLine", {
            id,
            code: output,
            execId,
            line,
            type,
          });
        };
        childProcess = fork(
          path.join(__dirname, "../lib/child-process-script.ts"),
          [],
          {
            stdio: ["pipe", "pipe", "pipe", "ipc"],
            env: { FORCE_COLOR: "1" },
          }
        );
        childProcess.stdout?.setEncoding("utf8");
        childProcess.stdout?.on("data", (data) => {
          render(data, InstructResultType.executing);
          console.log(`子进程输出: ${data}`);
        });
        childProcess.stdout?.on("error", (data) => {
          render(
            util.inspect(data, { colors: true }),
            InstructResultType.executing
          );
          console.log(`子进程输出: ${data}`);
        });
        childProcess.stderr?.setEncoding("utf8");
        childProcess.stderr?.on("data", (data) => {
          render(data, InstructResultType.executing);
          console.error(`子进程错误: `, data);
        });
        childProcess.stderr?.on("error", (data) => {
          render(
            util.inspect(data, { colors: true }),
            InstructResultType.executing
          );
          console.log(`子进程输出: ${data}`);
        });
        this.executeContext.onWrite((data?: string) => {
          render(data ? stringify(data) : "", InstructResultType.executing);
        });
        this.executeContext.onEnd((data?: string) => {
          render(data ? data : "", InstructResultType.completed);
          const output = virtualWindow.render();
          resolve({
            id: instruct.id,
            std: output,
            execId,
            type: InstructResultType.completed,
          });
          destory();
        });

        this.executeContext.onAbort((err) => {
          render(`程序终止执行:${err}`, InstructResultType.completed);
          destory();
          const output = virtualWindow.render();
          resolve({
            id: instruct.id,
            // ret: output,
            std: output,
            execId,
            type: InstructResultType.completed,
          });
        });

        // 监听子进程的消息事件，获取执行结果
        childProcess.on("message", (message) => {
          if (message === execId) {
            isNomalExit = true;
            return;
          }
          this.executeContext?.write(message.toString());
        });
        // 监听子进程的错误事件
        childProcess.on("error", (error) => {
          isNomalExit = true;
          this.executeContext?.error(error);
        });
        childProcess.on("close", (code, signal) => {
          this.executeContext?.write("子进程关闭！");
        });
        childProcess.on("disconnect", () => {
          if (isNomalExit) {
            return;
          }
          pluginContext.showDialog({
            type: "error",
            message: "执行子进程时出现错误，子进程断开连接!",
          });
          this.executeContext?.error("子进程断开连接！");
        });
        // 监听子进程的退出事件
        childProcess.on("exit", (code, signal) => {
          if (code !== null && code === 0) {
            this.executeContext?.end(`程序执行完成！`);
          } else {
            this.executeContext?.end(
              `子进程已被终止,退出码:${code},信号：${signal}`
            );
          }
        });
        // 向子进程发送用户代码
        childProcess.send({ code, execId });
      } catch (error: any) {
        this.executeContext.error(error);
        this.executeContext = null;
      }
    });
  }

  async onMounted(ctx: ExtensionContext) {
    // 插件挂载时的处理逻辑
    pluginContext.notifyManager.showTask({
      content: "正在检查环境",
      progress: -1,
    });
    const url = getUrl();
    console.log("ui渲染地址:" + url);
    const window = pluginContext.windowManager.createWindow(
      pluginContext.plugin.appId,
      {
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
    const api = pluginContext.getIpcApi("node");
    api.onRenderBind("test", () => {
      api.send("test", "这是测试插件,来自插件进程"!);
    });
    console.log("哈哈哈");
    // throw new Error("未捕获异常");
    if (true) return;
    const plugHome = pluginContext.workPath;
    if (fs.existsSync(plugHome)) {
      fs.mkdirSync(plugHome, { recursive: true });
    }
    const nodeVersion = await pluginContext.settingManager.get(`version`);
    const nodePath = await pluginContext.settingManager.get(`path`);
    const execPromise = util.promisify(exec);
    if (nodeVersion && nodePath) {
      pluginContext.notifyManager.showTask({
        content: "正在获取node信息",
        progress: -1,
      });
      //使用默认nodejs
      let nodeCmd = "node";
      let env = {};
      if (nodePath !== "default") {
        // if (platform() === "win32") {
        nodeCmd = path.join(nodePath, nodeCmd);
        // } else {
        //   nodeCmd = path.join(nodePath, nodeCmd);
        // }
      } else {
        env = { ...process.env };
      }
      try {
        const { stdout, stderr } = await execPromise(`"${nodeCmd}" -v`, {
          env,
        });
        const getVersion = stdout.trim();
        if (getVersion.length > 0) {
          this.env = env;
          if (nodeVersion.trim() !== getVersion) {
            pluginContext.settingManager.save(`version`, getVersion);
          }
          pluginContext.notifyManager.showTask({
            content: `已获取到Node，版本:${stdout}`,
          });
          return;
        }
        console.error("STD Error:", stderr);
      } catch (err) {
        console.error("Error:", err);
      }
      pluginContext.notifyManager.showTask({ content: `Node环境已损坏` });
    }
    // pluginContext.notifyManager.showTask({ content: "尝试从当前环境获取！", progress: -1 });
    // try {
    //   const env = { ...process.env };
    //   const { stdout, stderr } = await execPromise('node -v', { env });
    //   const getVersion = stdout.trim();
    //   if (getVersion.length > 0) {
    //     pluginContext.settingManager.save(`version`, getVersion);
    //     pluginContext.settingManager.save(`path`, 'default');
    //     pluginContext.notifyManager.showTask({ content: `已获取到Node，版本:${stdout}` });
    //     return;
    //   }
    //   console.error('STD Error:', stderr)
    // } catch (err) {
    //   console.error('Error:', err);
    // }
    pluginContext.notifyManager.showTask({
      content: "正在下载最新的nodejs版本",
      progress: -1,
    });
    const versions = (await getNodeVersions()) as any;
    const latestVersion = versions[0].version;
    pluginContext.notifyManager.showTask({
      content: `找到nodejs版本:${latestVersion}`,
      progress: -1,
    });
    const fileName = `node-${latestVersion}-${getFileName()}`;
    pluginContext.notifyManager.showTask({
      content: `文件名:${fileName}`,
      progress: -1,
    });
    const downloadUrl = `https://nodejs.org/dist/${latestVersion}/${fileName}`;
    console.log(`下载地址:${downloadUrl}`);
    const sha256 = await getNodeSha(latestVersion, fileName);
    console.log("256:" + sha256);
    const downpath = pluginContext.getPath("downloads");
    const filePath = path.join(downpath, fileName);
    console.log(filePath, "\n", path.basename(filePath));
    await DownloadNode(
      downloadUrl,
      filePath,
      (progress) => {
        pluginContext.notifyManager.showTask({
          content: `正在下载文件:${fileName}`,
          progress: progress,
        });
      },
      sha256
    );
    console.log("下载后的文件地址:" + filePath);
    const extSaveNodePath = path.join(
      pluginContext.workPath,
      "node-" + latestVersion
    );
    if (fs.existsSync(extSaveNodePath)) {
      fs.mkdirSync(extSaveNodePath, { recursive: true });
    }
    pluginContext.notifyManager.showTask({
      content: `正在解压文件:${fileName}`,
      progress: -1,
    });
    let extNodePath: string = await extractNode(
      filePath,
      (progress) => {
        pluginContext.notifyManager.showTask({
          content: `正在解压文件:${fileName}`,
          progress: progress,
        });
      },
      extSaveNodePath
    );
    pluginContext.notifyManager.showTask({
      content: `文件解压完成:${fileName}`,
      progress: -2,
    });
    console.log("解压后的文件路径:" + extNodePath);
    if (platform() !== "win32") {
      extNodePath = path.join(extNodePath, "bin");
    }
    const nodeCmd = path.join(extNodePath, "node");
    try {
      const env = {};
      const { stdout, stderr } = await execPromise(`"${nodeCmd}" -v`, { env });
      const getVersion = stdout.trim();
      if (getVersion.length > 0) {
        this.env = env;
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
        return;
      }
      console.error("STD Error:", stderr);
    } catch (err) {
      console.error("Error:", err);
    }
  }

  onUnmounted(): void {
    // 插件卸载时的处理逻辑
  }
}

export default new NodeExecutor();
