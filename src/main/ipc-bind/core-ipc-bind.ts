import { bindListenerChannel, removeListenerChannel } from "@main/services/web-content-listener";
import { showErrorDialog } from "@main/utils/dialog";
import { dialog } from "electron";
import './core-ipc-window-bind'
import appContext from "@main/services/app-context";
import { getIpcApi } from "@main/ipc/ipc-wrapper";
const api = getIpcApi('ipc-core')

api.handle('get-current-webcontents-id', (event, input) => {
    return event.sender.id;
});
api.on('bind-channel-listener', (event, channel_info) => {
    const { id, channel } = channel_info
    console.log(`注册渠道:${channel} 在 ${event.sender.id},api id:${id}`)
    bindListenerChannel(channel, event.sender.id, id)
});
api.on('remove-channel-listener', (event, channel_info) => {
    const { id, channel } = channel_info
    console.log(`移除渠道:${channel} 在 ${event.sender.id},api id:${id}`)
    removeListenerChannel(channel, event.sender.id, id)
});
api.on('error-notify', (event, message) => {
    showErrorDialog(message)
})
api.handle('show-dialog', (event, opts: Electron.MessageBoxOptions) => dialog.showMessageBox(opts))
appContext['ready'] = false;
const callbackFun: Array<Function> = []
api.on('ui-ready', (event, message) => {
    console.log("app就绪")
    appContext['ready'] = true;
    if (callbackFun.length > 0) {
        const fun = callbackFun.pop()
        fun();
    }
})
export const onAppReady = (callback: () => void) => {
    if (!appContext['ready']) {
        callbackFun.push(callback)
    } else {
        callback();
    }
}