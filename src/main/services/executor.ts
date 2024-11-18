import { InstructContent, executeCodeCompleted } from "@main/ipc/code-manager";
import { sendMessage } from "@main/ipc/webview-api";
import pluginManager from "@main/plugin/plugin-manager";
import { PluginType } from '@lib/main';
import { InstructExecutor, InstructResult } from '@lib/main';
import { showErrorDialog } from "@main/utils/dialog";
import { PluginInfo } from "@main/plugin/plugin-context";
import { getIpcApi } from "@main/ipc/ipc-wrapper";
import { getCurrentAgent } from "./mitm-proxy-service";

const api = getIpcApi('code-view-api')


api.on('send_execute-result', async (event, input) => {
    console.log("发送消息到webview", input)
    const agentList = getCurrentAgent();
    if (agentList && agentList.length > 0) {
        for (const agent of agentList) {
            await agent.send(input)
        }
    } else {
        showErrorDialog('没有注册的agent')
        throw new Error('没有注册的agent')
    }
});

api.handle('execute', (event, code: InstructContent) => {
    return executeCode(code)
})
api.handle('execute.stop', (event, code: InstructContent) => {
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
}
export const executeCode = async (code_body: InstructContent) => {
    console.log(`执行代码:\n${JSON.stringify(code_body)}`);
    const { code, language, executor } = code_body;

    const module = await pluginManager.resolvePluginModule<InstructExecutor>(PluginType.executor, (pluginInfoList: Array<PluginInfo>) => {
        if (executor) {
            return pluginManager.getPluginFromId(executor);
        }
        for (const pluginInfo of pluginInfoList) {
            if (pluginInfo.instruct.indexOf(language) != -1) {
                return pluginInfo;
            }
        }
        return null;
    })
    const result = await module.execute(code_body);
    console.log("代码执行完成:", result)
    // const result = await executor.execute(code);

    // send_ipc_render('terminal-input', code)
    // console.log(`执行结果:\n${result}`);
    // notify(`执行 ${language} 结果:\n${result}`);
    // executeCodeCompleted({ code, language, result })
    // return result;
    // await dispatcherResult(result);
}