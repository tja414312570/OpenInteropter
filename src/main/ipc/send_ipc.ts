import { getWebContentIds } from "@main/services/web-content-listener";
import { showErrorDialog } from "@main/utils/dialog";
import { webContents } from "electron";

export const send_ipc_render = (event_: string, message: any) => {
    const webContentIds: Set<number> | undefined = getWebContentIds(event_)
    if (webContentIds && webContentIds.size > 0) {
        webContentIds.forEach(webContentId => {
            const webContent = webContents.fromId(webContentId)
            if (webContent) {
                console.log(`发送通知到webview进程${webContentId},${JSON.stringify({ event_, message })}`)
                webContent.send(event_, message)
            } else {
                console.warn(`webcontent已被移除:${webContentId},${JSON.stringify({ event_, message })}`)
            }
        })
    } else {
        console.error(`渠道尚未正确注册:${event_}`, event_, message, new Error("程序未启动完成"))
        showErrorDialog(`渠道尚未正确注册:${event_}`)
    }
};