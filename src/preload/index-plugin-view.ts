import { exposeInMainWorld } from "./ipc-wrapper";
const api = 'plugin-view-api'


exposeInMainWorld(api, ipcRenderMapper => ({
    on: (channel, callback) => {
        console.log("webview监听:", channel)
        ipcRenderMapper.on(channel, (event, message) => {
            console.log("webview消息:", message)
            callback(event, message)
        })
    }, invoke: (channel: string, ...args: any) => ipcRenderMapper.invoke(channel, ...args)
}))