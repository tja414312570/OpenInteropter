import { InstructContent, executeCodeCompleted } from "@main/ipc/code-manager";
import { loadModules } from "./modules";
import { notify } from "@main/ipc/notify-manager";
import { send_ipc_render } from "@main/ipc/send_ipc";
import { ipcMain } from "electron";
import { sendMessage } from "@main/ipc/webview-api";
import pluginManager from "@main/plugin/plugin-manager";
import { PluginInfo, PluginType } from '@lib/main';
import { InstructExecutor, InstructResult } from '@lib/main';
import { showErrorDialog } from "@main/utils/dialog";

ipcMain.on('code-view-api.send_execute-result', (event, input) => {
    console.log("发送消息到webview", input)
    sendMessage(input)
});

ipcMain.handle('code-view-api.execute', (event, code: InstructContent) => {
    return executeCode(code)
})
ipcMain.handle('code-view-api.execute.stop', (event, code: InstructContent) => {
    return stopExecute(code)
})
export const stopExecute = async (code_body: InstructContent) => {
    console.log(`执行代码:\n${JSON.stringify(code_body)}`);
    const { code, language, executor } = code_body;
    pluginManager.resolvePluginModule(PluginType.executor, (pluginInfoList: Array<PluginInfo>) => {
        if (executor) {
            return pluginManager.getPluginFromId(executor);
        }
        for (const pluginInfo of pluginInfoList) {
            if (pluginInfo.instruct.indexOf(language) != -1) {
                return pluginInfo;
            }
        }
        return null;
    }).then((module: InstructExecutor) => {
        module.abort(code_body).then((result: InstructResult) => {
            console.log("停止执行", result)
            // sendMessage(result)
        }).catch(err => {
            console.error(err)
            showErrorDialog(`停止执行指令异常:${String(err)}`)
        })
    }).catch(err => {
        console.error(err)
        showErrorDialog(`执行器异常:${String(err)}`)
    })
    // const result = await executor.execute(code);

    // send_ipc_render('terminal-input', code)
    // console.log(`执行结果:\n${result}`);
    // notify(`执行 ${language} 结果:\n${result}`);
    // executeCodeCompleted({ code, language, result })
    // return result;
    // await dispatcherResult(result);
}
export const executeCode = async (code_body: InstructContent) => {
    console.log(`执行代码:\n${JSON.stringify(code_body)}`);
    const { code, language, executor } = code_body;

    pluginManager.resolvePluginModule(PluginType.executor, (pluginInfoList: Array<PluginInfo>) => {
        if (executor) {
            return pluginManager.getPluginFromId(executor);
        }
        for (const pluginInfo of pluginInfoList) {
            if (pluginInfo.instruct.indexOf(language) != -1) {
                return pluginInfo;
            }
        }
        return null;
    }).then((module: InstructExecutor) => {
        module.execute(code_body).then((result: InstructResult) => {
            console.log("执行结果", result)
            // sendMessage(result)
        }).catch(err => {
            console.error(err)
            showErrorDialog(`执行指令异常:${String(err)}`)
        })
    }).catch(err => {
        console.error(err)
        showErrorDialog(`执行器异常:${String(err)}`)
    })
    // const result = await executor.execute(code);

    // send_ipc_render('terminal-input', code)
    // console.log(`执行结果:\n${result}`);
    // notify(`执行 ${language} 结果:\n${result}`);
    // executeCodeCompleted({ code, language, result })
    // return result;
    // await dispatcherResult(result);
}