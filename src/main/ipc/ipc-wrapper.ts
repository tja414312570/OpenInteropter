import { ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents, webContents } from "electron";
import { getWebContentIds, handleChannelBind, handleChannelUnbind, removeListenerChannel } from "@main/services/web-content-listener";
import { showErrorDialog } from "@main/utils/dialog";

export interface Stream {
    id: string,
    closed: boolean,
    write(arg: any): void
    end(arg: any): void
    error: (arg: any) => void
    onCancel(listener: (event: IpcMainEvent, ...args: any[]) => void): void
}
export interface StreamIpcMainInvokeEvent extends IpcMainInvokeEvent {
    stream: Stream
}
//最后一个参数返回{ type: 'stream', id: request_id }
function processArgs(ipc: IpcApi, event: IpcMainInvokeEvent, args: any[]) {
    if (args.length > 0) {
        const lastArg = args[args.length - 1];
        if (lastArg?.type === 'stream' && typeof lastArg.id === 'string') {
            wrapperEvent(ipc, event, lastArg)
            return args.slice(0, args.length - 1);
        }
    }
    return args;
}
function wrapperEvent(ipc: IpcApi, event: IpcMainInvokeEvent, stream: {
    closed: boolean; type: string, id: string
}): StreamIpcMainInvokeEvent {
    const streamEvent = (event as StreamIpcMainInvokeEvent);
    const removeAllListener = () => {
        ipcMain.removeAllListeners('end-cancel-' + stream.id);
        ipcMain.removeAllListeners('cancel-cancel-' + stream.id);
    }
    streamEvent.stream = {
        id: stream.id,
        closed: false,
        write: (arg) => {
            if (streamEvent.stream.closed) {
                return;
            }
            event.sender.send('stream-data-' + stream.id, arg);
        },
        end: (arg) => {
            if (streamEvent.stream.closed) {
                return;
            }
            event.sender.send('end-stream-' + stream.id, arg);
        }, error: (arg) => {
            if (streamEvent.stream.closed) {
                return;
            }
            event.sender.send('error-stream-' + stream.id, arg);
        }, onCancel(listener: (event: IpcMainEvent, ...args: any[]) => void) {
            ipcMain.on('cancel-stream-' + stream.id, (event: IpcMainEvent, ...args: any[]) => {
                removeAllListener()
                listener(event, ...args);
                streamEvent.stream.closed = true;

            })
        },
    }
    ipcMain.on('close-stream-' + stream.id, () => {
        streamEvent.stream.closed = true;
        removeAllListener()
    })
    return streamEvent;
}
export class IpcApi {
    private api: string;
    constructor(api: string) {
        this.api = api;
    }
    wrapper(listener: (...args: any[]) => (Promise<any>) | (any)) {
        return async (...args: any[]) => {
            try {
                const event = args[0];
                let realArgs = args.slice(1);
                realArgs = processArgs(this, event, realArgs)
                return await listener(event, ...realArgs);
            } catch (err) {
                // console.error(`Error in listener: ${err.message}`, err);
                throw err;
            }
        };
    }
    handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => (Promise<any>) | (any)) {
        return ipcMain.handle(`${this.api}.${channel}`, this.wrapper(listener));
    }
    handleOnce(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => (Promise<any>) | (any)) {
        return ipcMain.handleOnce(`${this.api}.${channel}`, this.wrapper(listener));
    }
    on(channel: string, listener: (event: IpcMainInvokeEvent, ...args: any[]) => (Promise<any>) | (any)) {
        ipcMain.on(`${this.api}.${channel}`, this.wrapper(listener));
        return this;
    }
    once(channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void) {
        ipcMain.once(`${this.api}.${channel}`, this.wrapper(listener));
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
        ipcMain.removeListener(`${this.api}.${channel}`, this.wrapper(listener));
        return this;
    };
    _dispatcher(event: string, callback: (webContent: WebContents) => void, strict = true, webContentId_?: number) {
        const webContentIds: Set<number> | undefined = getWebContentIds(event)
        if (webContentIds && webContentIds.size > 0) {
            if (webContentId_) {
                const webContent = webContents.fromId(webContentId_)
                if (webContent) {
                    callback(webContent)
                } else {
                    removeListenerChannel(event, webContentId_);
                    console.warn(`webcontent已被移除:${webContentId_},${event}`)
                }
            } else {
                webContentIds.forEach(webContentId => {
                    const webContent = webContents.fromId(webContentId)
                    if (webContent) {
                        callback(webContent)
                    } else {
                        removeListenerChannel(event, webContentId);
                        console.warn(`webcontent已被移除:${webContentId},${event}`)
                    }
                })
            }
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
            console.log(`发送事件到webview进程${webContent.id},${JSON.stringify({ channel, ...args })}`)
            webContent.send(channel, ...args)
        })
    }
    trySend(channel: string, ...args: any[]) {
        channel = `${this.api}.${channel}`;
        this._dispatcher(channel, webContent => {
            console.log(`发送事件到webview进程${webContent.id},${JSON.stringify({ channel, ...args })}`)
            webContent.send(channel, ...args)
        }, false)
    }
    sendWeb(channel: string, webContentId: number, ...args: any[]) {
        channel = `${this.api}.${channel}`;
        this._dispatcher(channel, webContent => {
            console.log(`发送事件到webview进程${webContentId},${JSON.stringify({ channel, ...args })}`)
            webContent.send(channel, ...args)
        }, true, webContentId)
    }
    trySendWeb(channel: string, webContentId: number, ...args: any[]) {
        channel = `${this.api}.${channel}`;
        this._dispatcher(channel, webContent => {
            console.log(`发送事件到webview进程${webContentId},${JSON.stringify({ channel, ...args })}`)
            webContent.send(channel, ...args)
        }, false, webContentId)
    }
    onRenderBind(channel: string, listener: (webId: number) => void) {
        channel = `${this.api}.${channel}`;
        return handleChannelBind(channel, listener)
    }
    onRenderRemove(channel: string, listener: (webId: number) => void) {
        channel = `${this.api}.${channel}`;
        return handleChannelUnbind(channel, listener)
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