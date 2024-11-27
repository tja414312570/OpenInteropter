import { exposeInMainWorld } from "./lib/ipc-wrapper";
const api = 'plugin-view-api'
exposeInMainWorld(api, ipcRenderMapper => ({
    on: (channel, callback) => {
        ipcRenderMapper.on(channel, (event, message) => {
            callback(event, message)
        })
    }, invoke: (channel: string, ...args: any) => ipcRenderMapper.invoke(channel, ...args)
}))