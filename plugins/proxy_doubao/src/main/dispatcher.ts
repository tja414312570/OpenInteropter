import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import util from 'util';
import { IncomingHttpHeaders } from 'http';
import { SseHandler } from './doubao';
import { pluginContext } from 'mylib/main';
import { IContext } from 'http-mitm-proxy';

// import { createWindow ,requiredWindow} from './window_manager.js';
// 使用 promisify 将子进程命令转换为 Promise

// 提取代码块的函数
function extractCodeBlocksFromMarkdown(responseBody:string) {
    // const supportedLanguages = Object.keys(executors).join('|');
    // const pattern = new RegExp(`\`\`\`(${supportedLanguages})\\n([\\s\\S]*?)\`\`\``, 'g');
    const pattern = new RegExp(`\`\`\`([a-zA-Z]+)\\n([\\s\\S]*?)\`\`\``, 'g');

    const codeBlocks = [];
    let match;

    while ((match = pattern.exec(responseBody)) !== null) {
        codeBlocks.push([match[1], match[2]]);
    }

    return codeBlocks;
}


// 调度响应并执行 Python 或 Bash 代码
async function dispatcherResponse(responseData:string) {
    console.log(`处理命令: ${responseData}`);
    pluginContext.notifyManager.notify(`处理命令: ${responseData}`);

    const codeBlocks = extractCodeBlocksFromMarkdown(responseData);

    if (codeBlocks.length > 0) {
        for (const [language, code] of codeBlocks) {
            // if (executors[language]) {
            //     console.log(`检测到的 ${language} 代码:\n${code}`);
            //     await notify(`检测到的 ${language} 代码:\n${code}`);
            //     const executor = executors[language];
            //     // 检查 executor 是否存在
            //     if (!executor.execute) {
            //         throw new Error(` “${language}“ executor not implements execute function`);
            //     }
            //     // 检查 executor.execute 是否是函数
            //     if (typeof executor.execute !== 'function') {
            //         throw new Error(` “${language}“ executor executor.execute is not a function`);
            //     }
            //     previewCode({ code, language })
            //     // TODO  
            // } else {
            //     await notify(`不支持的代码语言: ${language}`);
            // }
        }
    } else {
        console.log("未检测到代码块", responseData);
        pluginContext.notifyManager.notify("未检测到代码块");
    }
}

const regex = /fileupload:\[(.*?)\]/;

// 解析结果函数
async function decodeResult(resultString:string) {
    try {
        // 使用正则表达式提取 fileupload 列表
        const match = resultString.match(regex);
        if (match) {
            const arrayStr = `[${match[1]}]`;  // 将匹配结果转换为有效的数组格式
            try {
                // 使用 JSON.parse() 将字符串转换为数组
                const fileList = JSON.parse(arrayStr.replace(/'/g, '"'));  // 将单引号替换为双引号
                return fileList;
            } catch (error:any) {
                const errorMessage = `解析 fileupload 列表时出错: ${error.message}，数据：${arrayStr}`;
                const errorTraceback = util.inspect(error);  // 打印错误栈
                const fullErrorReport = `${errorMessage}\n错误栈：\n${errorTraceback}`;
                console.error(fullErrorReport);
                // 调用 dispatcherResult 发送错误报告
                // await dispatcherResult(fullErrorReport, true);
                return null;
            }
        } else {
            // 没有匹配到 fileupload 列表
            const errorMessage = "未找到 fileupload 列表。";
            console.error(errorMessage);
            return null;
        }
    } catch (error:any) {
        // 捕获其他异常并生成完整的错误报告
        const errorMessage = `处理 fileupload 列表时出错: ${error.message}，数据：${resultString}`;
        const errorTraceback = util.inspect(error);  // 获取详细的错误栈
        const fullErrorReport = `${errorMessage}\n错误栈：\n${errorTraceback}`;
        console.error(fullErrorReport);

        // 调用 dispatcherResult 发送错误报告
        // await dispatcherResult(fullErrorReport, true);
        return null;
    }
}
const processResponse = async (headers:IncomingHttpHeaders|undefined,ctx:IContext):Promise<string|void> => {
    
}


export {
    decodeResult,
    dispatcherResponse,
    processResponse
};
