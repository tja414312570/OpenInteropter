import { InstructContent } from "@main/ipc/code-manager";
import { exposeInMainWorld } from "./ipc-wrapper";

exposeInMainWorld('code-view-api', ipcRenderer => ({
    onCode: (callback: Function) => ipcRenderer.on('code', (_, notifyData) => callback(notifyData)),
    executeCode: (code: InstructContent) => ipcRenderer.invoke("execute", code),
    onCodeExecuted: (callback: Function) => ipcRenderer.on('executed', (_, notifyData) => callback(notifyData)),
}));
