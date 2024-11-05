import { buildProxy } from "@main/services/global-agents";
import { proxyRequest } from "@main/utils/nets";
import { ipcMain } from "electron";

ipcMain.handle('ipc-settings.proxy-test', async (event, proxyInfo, url) => {
    const newProxy = buildProxy(proxyInfo);
    try {
        const httpResponse = await proxyRequest({
            proxyUrl: newProxy.http,
            targetUrl: url,
        });
        return { data: httpResponse }; // 返回解析后的数据
    } catch (error) {
        console.error(error)
        return { error }
        // return Promise.reject(error)
        // throw new Error(
        //     `Error fetching: ${(error as Error).message}`
        // );
    }
})