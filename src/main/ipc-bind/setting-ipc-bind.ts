import settingManager from "@main/services/service-setting";
import { ipcMain } from "electron";

ipcMain.handle('ipc-settings.get-settings', (event, args) => {
    return settingManager.getSettings();
});
ipcMain.handle('ipc-settings.get-setting-value', (event, key) => {
    return settingManager.getSettingValue(key);
});

ipcMain.handle('ipc-settings.save-setting-value', (event, json) => {
    settingManager.saveSettingValue(json)
    return;
});
