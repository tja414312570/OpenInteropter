import { send_ipc_render } from "./send_ipc";

const _notify_app = (message: string, is_error: boolean) => {
    send_ipc_render('ipc-notify.show-notification', { message, is_error });
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