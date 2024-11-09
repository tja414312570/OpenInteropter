import { getIpcApi } from "./ipc-api";
const coreApi = getIpcApi('ipc-core', window);
const showDialog = (opts: Electron.MessageBoxOptions): Electron.MessageBoxReturnValue => {
    return coreApi.invoke('show-dialog', opts) as any
}
const showErrorDialog = (opts: Electron.MessageBoxOptions): Electron.MessageBoxReturnValue => {
    opts.type = 'error';
    opts.title = '出现错误';
    return coreApi.invoke('show-dialog', opts) as any
}
export { showDialog, showErrorDialog }