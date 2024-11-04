import { pluginContext } from '@lib/main'
import { app, dialog, ipcMain } from "electron";
import { notify } from '@main/ipc/notify-manager';
import { notifyError } from '@main/ipc/notify-manager';
import { send_ipc_render } from '@main/ipc/send_ipc';
import settingManager from '@main/services/service-setting'
import fs from 'fs';
import path from 'path';

const _plugin_dir = 'plugins'
const init = () => {
    const _user_data = app.getPath('userData');
    const _plugin_path = path.join(_user_data, _plugin_dir)
    if (!fs.existsSync(_plugin_path)) {
        fs.mkdirSync(_plugin_path);
        console.log('配置目录不存在:', _plugin_path);
    }
    pluginContext.appPath = _user_data;
    pluginContext._pluginPath = _plugin_path;
    pluginContext.ipcMain = ipcMain as any;
    pluginContext.notifyManager = { notify, notifyError } as any
    pluginContext.showDialog = dialog.showMessageBox
    pluginContext.sendIpcRender = send_ipc_render;
    pluginContext.envDir = path.join(_user_data, 'bin')
    if (!fs.existsSync(pluginContext.envDir)) {
        fs.mkdirSync(pluginContext.envDir, { recursive: true });
    }
    pluginContext.settingManager = settingManager
}
export default init;