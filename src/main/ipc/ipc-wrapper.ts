import { ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents, webContents } from "electron";
import { getWebContentIds, removeListenerChannel } from "@main/services/web-content-listener";
import { showErrorDialog } from "@main/utils/dialog";
import { } from "electron";

class IpcApi {
    private api: string;
    constructor(api: string) {
        this.api = api;
    }
    handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => (Promise<any>) | (any)) {
        return ipcMain.handle(`${this.api}.${channel}`, listener);
    }
    handleOnce(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => (Promise<any>) | (any)) {
        return ipcMain.handleOnce(`${this.api}.${channel}`, listener);
    }
    on(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => (Promise<any>) | (any)) {
        ipcMain.on(`${this.api}.${channel}`, listener);
        return this;
    }
    once(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void) {
        ipcMain.once(`${this.api}.${channel}`, listener);
        return this;
    }
    removeAllListeners(channel: string) {
        ipcMain.removeAllListeners(`${this.api}.${channel}`);
        return this;
    };
    removeHandler(channel: string) {
        ipcMain.removeHandler(`${this.api}.${channel}`);
    };
    removeListener(channel: string, listener: (...args: any[]) => void) {
        ipcMain.removeListener(`${this.api}.${channel}`, listener);
        return this;
    };
    _dispatcher(event: string, callback: (webContent: WebContents) => void, strict = true) {
        const webContentIds: Set<number> | undefined = getWebContentIds(event)
        if (webContentIds && webContentIds.size > 0) {
            webContentIds.forEach(webContentId => {
                const webContent = webContents.fromId(webContentId)
                if (webContent) {
                    callback(webContent)
                } else {
                    removeListenerChannel(event, webContentId);
                    console.warn(`webcontent已被移除:${webContentId},${event}`)
                }
            })
        } else {
            if (strict) {
                console.error(new Error(`渠道尚未正确注册:${event}`))
                showErrorDialog(`渠道尚未正确注册:${event}`)
            } else {
                console.log(`非严格模式下，渠道未注册或已被移除，跳过事件发送: ${event}`);
            }

        }
    }
    send(channel: string, ...args: any[]) {
        channel = `${this.api}.${channel}`;
        this._dispatcher(channel, webContent => {
            console.log(`发送事件到webview进程${webContent},${JSON.stringify({ channel, ...args })}`)
            webContent.send(channel, ...args)
        })
    }
    trySend(channel: string, ...args: any[]) {
        channel = `${this.api}.${channel}`;
        this._dispatcher(channel, webContent => {
            console.log(`发送事件到webview进程${webContent},${JSON.stringify({ channel, ...args })}`)
            webContent.send(channel, ...args)
        }, false)
    }
}

const map = new Map<String, IpcApi>();
export const getIpcApi = (api: string) => {
    let ipcApi = map.get(api);
    if (!ipcApi) {
        ipcApi = new IpcApi(api);
        map.set(api, ipcApi);
    }
    return ipcApi;
}