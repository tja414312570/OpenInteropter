import {
  AbstractPlugin,
  InstructContent,
  InstructExecutor,
  InstructResult,
  InstructResultType,
  pluginContext,
  Prompter,
} from "mylib/main";
import VirtualWindow, { debug } from "virtual-window";
import { Pluginlifecycle } from "mylib/main";
import { ExtensionContext } from "mylib/main";
import { v4 as uuidv4 } from "uuid";
import * as pty from "node-pty";
import { prompt } from "./prompt";

const removeInvisibleChars = (str: string) => {
  // 移除 ANSI 转义序列 (\u001b 是转义字符, \[\d*(;\d*)*m 匹配 ANSI 的样式)
  // const noAnsi = str.replace(/\u001b\[\d*(;\d*)*m/g, '');
  // // 移除其他不可见字符 (包括空白符、制表符、换行符)
  // const cleanedStr = noAnsi.replace(/[\x00-\x1F\x7F]/g, ''); // \x00-\x1F 包含不可见字符范围
  let cleanedStr = str.replace(/\u001b\[\d*(;\d*)*m/g, "");

  // 移除 PowerShell 特有的控制字符 (例如，\r\n[?25l 和类似的序列)
  cleanedStr = cleanedStr.replace(/\[\?\d+[a-z]/gi, "");

  // 移除回车和换行符、其他不可见字符 (包括空白符、制表符、换行符)
  cleanedStr = cleanedStr.replace(/[\x00-\x1F\x7F\x80-\x9F]+/g, "");

  // 移除光标定位和清屏等特殊字符序列，例如 [24;21H 和 [1C 之类的
  cleanedStr = cleanedStr.replace(/\[\d+;\d+[A-Za-z]|\[\d+[A-Za-z]/g, "");
  return cleanedStr;
};

function equalsAny(value: any, ...candidates: any[]) {
  return candidates.includes(value);
}

function isCommandSuccessful(exitCode: string | number) {
  return equalsAny(exitCode, 0, "0", true, "True", "true");
}
class ExecuteContext {
  private _data: ((data: string) => void) | undefined;
  private _write: ((data: string) => void) | undefined;
  private _error: ((data: Error) => void) | undefined;
  private _end: ((data?: string) => void) | undefined;
  private _abort: ((message?: any) => void) | undefined;
  public pty: pty.IPty | undefined;
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

class SshExecutor
  extends AbstractPlugin
  implements InstructExecutor, Pluginlifecycle, Prompter
{
  requirePrompt(): Promise<String> {
    return prompt();
  }
  private cache: Map<string, ExecuteContext> = new Map();
  currentTask(): string[] {
    return [...this.cache.keys()];
  }
  abort(instruct: InstructContent): Promise<InstructResult | void> {
    return new Promise((resolve) => {
      const { id } = instruct;
      const context = this.cache.get(id);
      if (context) {
        context.abort("用户主动终止");
      } else {
        resolve({
          id: instruct.id,
          // ret: output,
          std: "",
          execId: uuidv4(),
          type: InstructResultType.abort,
        });
      }
      resolve();
    });
  }

  execute(instruct: InstructContent): Promise<InstructResult> {
    const { id, code } = instruct;
    const execId = uuidv4();
    const line = code.split(/\r?\n/).length;
    return new Promise(async (resolve, reject) => {
      if (this.cache.has(id)) {
        throw new Error("代码正在执行中");
      }
      const executeContext = new ExecuteContext();
      this.cache.set(id, executeContext);
      const virtualWindow = new VirtualWindow();
      const render = (data: string, type: InstructResultType) => {
        virtualWindow.write(data);
        const output = virtualWindow.render();
        const codeApi = pluginContext.getCrossIpcApi("code-view-api");
        codeApi.send("insertLine", {
          id,
          code: output,
          execId,
          line,
          type,
        });
      };
      const destory = () => {
        this.cache.delete(id);
        executeContext.pty?.kill();
      };
      executeContext.onError((err) => {
        destory();
        render(`程序异常:${err}`, InstructResultType.completed);
        const output = virtualWindow.render();
        resolve({
          id: instruct.id,
          std: output,
          execId,
          type: InstructResultType.failed,
        });
      });
      try {
        const shell = process.platform === "win32" ? "powershell.exe" : "bash";
        console.log("启动shell:", shell);
        const params =
          process.platform === "win32"
            ? ["-NoLogo ", "-NonInteractive", "-Command", `${code.trim()}`]
            : ["-c", `${code.trim()}`];
        const ptyProcess = (executeContext.pty = pty.spawn(shell, params, {
          name: "xterm-color",
          cols: 256,
          rows: 256,
          cwd: process.env.HOME,
          env: pluginContext.env,
        }));
        virtualWindow.setCols(ptyProcess.cols);
        ptyProcess.onData((data: string) => {
          render(data, InstructResultType.executing); // 将数据写入虚拟窗口
        });
        // ptyProcess.on('error', (error: string) => {
        //     virtualWindow.write(error); // 将数据写入虚拟窗口
        // });
        ptyProcess.onExit((exit) => {
          destory();
          if (exit.exitCode === 0) {
            render(`程序执行成功！`, InstructResultType.completed); // 将数据写入虚拟窗口
            resolve({
              id,
              std: virtualWindow.render(),
              ret: exit.exitCode + "",
              type: InstructResultType.completed,
              execId,
            });
          } else {
            render(
              `程序执行失败,退出码:${exit.exitCode},信号:${exit.signal}`,
              InstructResultType.failed
            ); // 将数据写入虚拟窗口
            resolve({
              id,
              std: virtualWindow.render(),
              ret: exit.exitCode + "",
              type: InstructResultType.failed,
              execId,
            });
          }
        });
        executeContext.onAbort((err) => {
          ptyProcess.write("\x03");
          ptyProcess.kill("SIGKILL");
        });
      } catch (error: any) {
        console.error(error);
        executeContext.error(error);
        reject(error);
      }
    });
  }

  async onMounted(ctx: ExtensionContext) {}
  onUnmounted(): void {}
}
export default new SshExecutor();
