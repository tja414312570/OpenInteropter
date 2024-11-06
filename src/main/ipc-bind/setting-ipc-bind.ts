import { getIpcApi } from "@main/ipc/ipc-wrapper";
import settingManager from "@main/services/service-setting";
const ipc = getIpcApi('ipc-settings')

ipc.handle('get-settings', (event, args) => {
    return settingManager.getSettings();
});
ipc.handle('get-setting-value', (event, key) => {
    return settingManager.get(key);
});

ipc.handle('save-setting-value', (event, json) => {
    settingManager.save(json)
    return;
});
