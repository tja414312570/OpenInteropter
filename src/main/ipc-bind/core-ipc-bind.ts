import { bindListenerChannel, removeListenerChannel } from "@main/services/web-content-listener";
import { showErrorDialog } from "@main/utils/dialog";
import { dialog, ipcMain } from "electron";
import './core-ipc-window-bind'
import appContext from "@main/services/app-context";

ipcMain.handle('ipc-core.get-current-webcontents-id', (event, input) => {
    return event.sender.id;
});
ipcMain.on('ipc-core.bind-channel-listener', (event, channel_info) => {
    const { webContentId, channel } = channel_info;
    console.log(`注册渠道:${webContentId},${channel}`)
    bindListenerChannel(channel, webContentId)
});
ipcMain.on('ipc-core.remove-channel-listener', (event, channel_info) => {
    const { webContentId, channel } = channel_info;
    removeListenerChannel(channel, webContentId)
});
ipcMain.on('ipc-core.error-notify', (event, message) => {
    showErrorDialog(message)
})
ipcMain.handle('ipc-core.show-dialog', (event, opts: Electron.MessageBoxOptions) => dialog.showMessageBox(opts))
appContext['ready'] = false;
const callbackFun: Array<Function> = []
ipcMain.on('ipc-core.ui-ready', (event, message) => {
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