import {
  AbstractPlugin,
  InstructContent,
  InstructExecutor,
  InstructResult,
  InstructResultType,
  pluginContext,
} from "mylib/main";
import { Pluginlifecycle } from "mylib/main";
import { ExtensionContext } from "mylib/main";
import { v4 as uuidv4 } from "uuid";
import VirtualWindow from "./virtual-window";
import fs from "fs";
import path from "path";
import { IDisposable, IPty } from "node-pty";

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
const isDebug = true;

export function debug(data: string) {
  return isDebug
    ? data.replace(/[\x00-\x1F\x7F]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
        return `\\x${hex}`;
      })
    : data;
}

class SshExecutor
  extends AbstractPlugin
  implements InstructExecutor, Pluginlifecycle
{
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
      const virtualWindow = new VirtualWindow();
      const render = (data: string, type: InstructResultType) => {
        virtualWindow.write(data);
        const output = virtualWindow.render();
        pluginContext.sendIpcRender("code-view-api.insertLine", {
          id,
          code: output,
          execId,
          line,
          type,
        });
      };
      let dispose: IDisposable;
      const destory = () => {
        dispose?.dispose();
        this.cache.delete(id);
      };
      executeContext.onError((err) => {
        render(`程序异常:${err}`, InstructResultType.completed), destory();
        const output = virtualWindow.render();
        resolve({
          id: instruct.id,
          // ret: output,
          std: output,
          execId,
          type: InstructResultType.completed,
        });
      });
      try {
        const pty = await pluginContext.resourceManager.require<IPty>("pty");
        this.cache.set(id, executeContext);
        executeContext.onWrite((data) => pty.write(data));
        // const path_ = path.join(__dirname, "frames.txt");

        // let frame = 0;
        dispose = pty.onData((data: string) => {
          render(data, InstructResultType.executing);
          const output = virtualWindow.render();
          // fs.appendFileSync(path_,"\r\n=========================原始帧【"+(frame++)+'\r\n')
          // fs.appendFileSync(path_,debug(data),'utf-8')
          // fs.appendFileSync(path_,"\r\n-------------------------渲染帧【"+(frame++)+'\r\n')
          // fs.appendFileSync(path_,debug(output).replace(/\x0a/g,'\r\n'),'utf-8')
          executeContext.callData(output);
        });

        executeContext.onEnd((data?: string) => {
          render(data ? data : "", InstructResultType.completed);
          const output = virtualWindow.render();
          resolve({
            id: instruct.id,
            // ret: output,
            std: output,
            execId,
            type: InstructResultType.completed,
          });
          destory();
        });

        executeContext.onAbort((err) => {
          pty.write("\x03");
          render(`程序终止执行:${err}`, InstructResultType.completed),
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

        const code_splits = instruct.code
          .split(/\r?\n/)
          .filter((line) => line.trim() && !/^\s*(#|REM|::)/i.test(line));
        (async () => {
          for (const instruct of code_splits) {
            try {
              const exitCode = await this.executeLine(
                id,
                instruct,
                line,
                execId,
                executeContext
              );
              if (!isCommandSuccessful(exitCode)) {
                executeContext.abort(`程序异常退出，退出码${exitCode}`);
                break;
              }
              // 如果需要在执行成功后处理 result，可以在这里添加逻辑
            } catch (error: any) {
              // 在此捕获执行过程中可能发生的错误
              console.error(`Error executing line: ${instruct}`, error);
              executeContext.error(error);
              break; // 如果发生错误，可以选择中断循环
            }
          }
          executeContext.end();
        })();
      } catch (error: any) {
        executeContext.error(error);
      }
    });
  }

  executeLine(
    id: string,
    instruct: string,
    line: number,
    execId: string,
    executeContext: ExecuteContext
  ): Promise<string> {
    let executeing = true;
    const end_tag = `_${uuidv4()}_`;
    const cmd =
      process.platform === "win32"
        ? `try { ${instruct} } catch { Write-Error $_.Exception.Message ;$_.ErrorRecord } finally { Write-Host "${end_tag}$?" }` //ps
        : `${instruct} ; echo "${end_tag}$?"`; //ssh
    const msg = `命令[${instruct}]开始执行,执行id[${end_tag}],命令：${cmd}`;
    pluginContext.notifyManager.notify(msg);
    return new Promise((resolve) => {
      // 将 PTY 输出发送到前端
      let remainingText;
      executeContext.onData((data: string) => {
        remainingText = data;
        let index;
        while ((index = remainingText.indexOf("\n")) > -1) {
          const _line = remainingText.substring(0, index);
          const lineTrim = removeInvisibleChars(_line);
          if (lineTrim.length > 1 && lineTrim.startsWith(end_tag)) {
            executeing = false;
            const exitCode = lineTrim.substring(end_tag.length);
            const msg = `命令[${instruct}]执行完成,执行id[${end_tag}]，退出状态[${exitCode}]`;
            pluginContext.notifyManager.notify(msg);
            resolve(exitCode);
          }
          remainingText = remainingText.substring(index + 1);
        }
      });
      executeContext.write(cmd);
      executeContext.write("\r");
    });
  }

  async onMounted(ctx: ExtensionContext) {}
  onUnmounted(): void {}
}
export default new SshExecutor();
