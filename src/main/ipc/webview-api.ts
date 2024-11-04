import { send_ipc_render } from "./send_ipc"

export const sendMessage = (message: string) => {
    send_ipc_render('webview-api.send-content', message)
}