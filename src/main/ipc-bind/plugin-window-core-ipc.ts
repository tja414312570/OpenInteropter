import { getIpcApi } from "@main/ipc/ipc-wrapper";
import { PluginInfo } from "@main/plugin/plugin-context";
import { BrowserWindow } from "electron";
import _ from "lodash";

const api = getIpcApi('plugin-window-core-ipc')

api.handle('get-plugin-id', (event) => {
    const focusedWindow = BrowserWindow.fromWebContents(event.sender);
    const pluginInfo: PluginInfo = focusedWindow['plugin']
    if (!pluginInfo) {
        throw new Error("非插件窗口");
    }
    return pluginInfo.appId;
});
