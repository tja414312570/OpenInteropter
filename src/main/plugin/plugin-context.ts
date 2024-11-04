import { DialogOpt, DialogReturnValue, IIpcMain, ISettingManager, PluginExtensionContext, PluginInfo, Pluginlifecycle, ResourceManager } from '@lib/main'
import { send_ipc_render } from '@main/ipc/send_ipc';
import settingManager from '@main/services/service-setting'
import path from 'path';
import appContext from '@main/services/app-context';
import resourceManager from './resource-manager';


export class PluginContext implements PluginExtensionContext {
    plugin: PluginInfo;
    settingManager: ISettingManager;
    private settings: Set<string> = new Set;
    envDir: string;
    resourceManager: ResourceManager;
    _pluginPath: string;
    workPath: string;
    notifyManager: { notify: (message: string) => void; notifyError: (message: string) => void; };
    ipcMain: IIpcMain;
    appPath: string;
    sendIpcRender: (event_: string, message: any) => void;
    showDialog: (message: DialogOpt) => Promise<DialogReturnValue>;
    constructor(plugin: PluginInfo) {
        this.plugin = plugin;
        this.settingManager = settingManager
        this.workPath = path.join(appContext.pluginPath, plugin.appId);
        this.envDir = appContext.envPath;
        this.resourceManager = resourceManager;
        this.notifyManager = {
            notify: (message: string) => {
                send_ipc_render('ipc-notify.show-notification', {
                    message,
                    name: this.plugin.name,
                    id: this.plugin.id,
                    is_error: false,
                });
            }, notifyError: (message: string) => {
                send_ipc_render('ipc-notify.show-notification', {
                    message,
                    name: this.plugin.name,
                    id: this.plugin.id,
                    is_error: false,
                });
            }
        }
    }
    register(plugin: Pluginlifecycle & any): void {
        console.log("组件开始注册")
    }
    remove(plugin: Pluginlifecycle & any): void {
        console.log("组件开始移除")
    }
}
