import { InstructContent, InstructExecutor, InstructResult } from '../../../src/main/plugin/type/bridge'
import { Pluginlifecycle } from '../../../src/main/plugin/type/plugin-lifecycle'
import { PluginExtensionContext } from "../../../src/main/plugin/type/plugin";
import { v4 as uuidv4 } from 'uuid';


const removeInvisibleChars = (str: string) => {
  // 移除 ANSI 转义序列 (\u001b 是转义字符, \[\d*(;\d*)*m 匹配 ANSI 的样式)
  const noAnsi = str.replace(/\u001b\[\d*(;\d*)*m/g, '');
  // 移除其他不可见字符 (包括空白符、制表符、换行符)
  const cleanedStr = noAnsi.replace(/[\x00-\x1F\x7F]/g, ''); // \x00-\x1F 包含不可见字符范围
  return cleanedStr;
};

class SshExecutor implements InstructExecutor, Pluginlifecycle {

  execute(instruct: InstructContent): Promise<InstructResult> {
    const multiSymbol = '\\'
    return new Promise((resolve, reject) => {
      const { id, code, language } = instruct;
      //拆分：
      const codeSplit = code.split(/\r?\n/)
      let complete = '';
      for (const codeLine of codeSplit) {
        if(codeLine.trim().endsWith(multiSymbol)){
          complete+=`\r\n${codeLine}`;
          continue;
        }else{
          complete = codeLine
        }
        const result = await this.executeLine(complete)
        
      }
    }
  }
  executeLine(code: string): Promise < String > {
      // codeViewApi.insertLine
      return new Promise((resolve, reject) => {
        let executeing = true;
        let results: string[] = []
        const end_tag = `_${uuidv4()}_`;
        // 将 PTY 输出发送到前端
        const disable = pluginContext.pty.onData((data: string) => {
          if (executeing) {
            results.push(data)
            const lines = data.split(/\r?\n/); // 按换行符分割
            for (const line of lines) {
              // console.log(`读取行:"${JSON.stringify(line)}"${line.length},"${JSON.stringify(end_tag)}"${end_tag.length}`, executeing,line.trim() === end_tag); 
              if (removeInvisibleChars(line) === end_tag) {
                // executeing = false;
                console.log("代码执行完毕", results.join())
                resolve(results.join())
                disable.dispose()
              }
            }
          }
        });
        const cmd = instruct.code + ' ; echo ' + end_tag + '\r\n';
        console.log(`发送指令:${cmd}`);
        pluginContext.pty.write(cmd)
      })
  }

  onMounted(ctx: PluginExtensionContext): void {
    global.pluginContext = ctx;
  }
  onUnmounted(ctx: PluginExtensionContext): void {
  }


}
export default new SshExecutor();
