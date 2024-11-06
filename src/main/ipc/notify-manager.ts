import { getIpcApi } from "./ipc-wrapper";
const api = getIpcApi('ipc-notify')

const _notify_app = (message: string, is_error: boolean) => {
    api.send('show-notification', { message, is_error });
};
// 通知应用的函数
const notify = (message: string) => {
    _notify_app(message, false)
};

// 通知应用错误的函数
const notifyError = (message: string) => {
    _notify_app(message, true)
};
export { notify, notifyError }