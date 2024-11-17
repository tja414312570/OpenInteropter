import { getIpcApi, IpcApi } from '@main/ipc/ipc-wrapper';
import '../ipc-bind/remote-ipc-bind';
import settingsManager from './service-setting'
import browserHitoryService from './browser-history-service'
class RemoteWebviewManager {
    api: IpcApi;
    history: string[];
    constructor() {
        this.api = getIpcApi('remote-webview');
        this.history = settingsManager.get('')
    }
    onAppReady() {
        this.bind()
        this.api.onRenderBind('to', async () => {
            const data = await browserHitoryService.queryHistory(1, 1);
            let url = 'https://www.doubao.com/chat/';
            if (data.data.length === 1) {
                url = data.data[0].url;
            }
            this.api.send('to', url)
        })
    }

    bind() {
        this.api.on('save-history', (_event, { url, title }) => {
            browserHitoryService.saveHistory(url, title)
        })
        this.api.handle('query-history', async (event, { page, pageSize }) => {
            try {
                const result = await browserHitoryService.queryHistory(page, pageSize);
                return result;
            } catch (error) {
                console.error('Error querying history:', error);
                return { success: false, error: error.message };
            }
        })
        this.api.handle('delete-history', async (event, id: []) => {
            try {
                const result = await browserHitoryService.deleteHistory(id);
                return result;
            } catch (error) {
                console.error('Error querying history:', error);
                return { success: false, error: error.message };
            }
        })
        this.api.handle('delete-all', async (event) => {
            try {
                const result = await browserHitoryService.deleteAllHistory();
                return result;
            } catch (error) {
                console.error('Error querying history:', error);
                return { success: false, error: error.message };
            }
        })
    }
}
export default new RemoteWebviewManager()