import { IpcMainInvokeEvent, IpcMainEvent, WebContents } from "electron";

export interface IpcApi {
    api: string;

    handle(
        channel: string,
        listener: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
    ): void;

    handleOnce(
        channel: string,
        listener: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
    ): void;

    on(
        channel: string,
        listener: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
    ): this;

    once(
        channel: string,
        listener: (event: IpcMainEvent, ...args: any[]) => void
    ): this;

    removeAllListeners(channel: string): this;

    removeHandler(channel: string): void;

    removeListener(
        channel: string,
        listener: (...args: any[]) => void
    ): this;

    send(channel: string, ...args: any[]): void;

    trySend(channel: string, ...args: any[]): void;

    sendWeb(
        channel: string,
        webContentId: number,
        ...args: any[]
    ): void;

    trySendWeb(
        channel: string,
        webContentId: number,
        ...args: any[]
    ): void;

    onRenderBind(
        channel: string,
        listener: (webId: number) => void
    ): void;

    onRenderRemove(
        channel: string,
        listener: (webId: number) => void
    ): void;
}
export type GetIpcApi = (api: string) => IpcApi;