import { getIpcApi } from "./ipc-wrapper"
const api = getIpcApi('webview-api')
export const sendMessage = (message: string) => {
    api.send('send-content', message)
}