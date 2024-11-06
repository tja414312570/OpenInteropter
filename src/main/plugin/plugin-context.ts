import { DialogOpt, DialogReturnValue, IIpcMain, ISetting, ISettingManager, IWindowManager, NotifyManager, PluginExtensionContext, PluginInfo, Pluginlifecycle, ResourceManager } from '@lib/main'
import { send_ipc_render } from '@main/ipc/send_ipc';
import settingManager from '@main/services/service-setting'
import path from 'path';
import appContext from '@main/services/app-context';
import resourceManager from './resource-manager';
import { app } from 'electron';
import windowManager from '@main/services/window-manager';
import pluginManager from './plugin-manager';
import { getPreloadFile, getUrl } from "@main/config/static-path";

export class PluginContext implements PluginExtensionContext {
    plugin: PluginInfo;
    settingManager: ISettingManager;
    private settings: Set<string> = new Set;
    envDir: string;
    resourceManager: ResourceManager;
    _pluginPath: string;
    workPath: string;
    notifyManager: NotifyManager;
    ipcMain: IIpcMain;
    appPath: string;
    windowManager: IWindowManager;
    getPath(path: 'home' | 'appData' | 'userData' | 'sessionData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps') {
        return app.getPath(path);
    }
    sendIpcRender: (event_: string, message: any) => void;
    showDialog: (message: DialogOpt) => Promise<DialogReturnValue>;
    reload() {
        pluginManager.reload(this.plugin);
    }
    unload() {
        pluginManager.unload(this.plugin);
    }
    constructor(plugin: PluginInfo) {
        this.plugin = plugin;
        const appid = plugin.appId.replaceAll('.', '-');
        this.settingManager = {
            onSettingChange: (path: string, callback: (value: any) => void) => {
                settingManager.onSettingChange(`plugin.${appid}.${path}`, callback);
            },
            registeSetting: (menus: ISetting | ISetting[], path_?: string) => {
                // this.settings.add(menus.key)
                settingManager.registeSetting(menus, `plugin.${appid}${path_ ? '.' + path_ : ''}`);
            },
            getSettingValue: (key: string) => {
                return settingManager.getSettingValue(`plugin.${appid}.${key}`);
            },
            saveSettingValue: (key: string, value?: any) => {
                return settingManager.saveSettingValue(`plugin.${appid}.${key}`, value)
            },
            getSettings: (path?: string) => {
                return settingManager.getSettings(`plugin.${appid}.${path}`)
            }
        }
        this.windowManager = {
            createWindow(windowId, options) {
                options = {
                    ...options, webPreferences: {
                        devTools: true,
                        webviewTag: true,
                        preload: getPreloadFile('index')
                    }
                }
                const window = windowManager.createWindow(windowId, options);
                const loadUrl = window.loadURL;
                window.loadURL = async (url, options) => {
                    const pluginUrl = getUrl('plugin-window');
                    const newUrl = `${pluginUrl}?path=${encodeURI(url)}`;
                    loadUrl.bind(window)(newUrl, options);
                }
                window.webContents.openDevTools({
                    mode: "undocked",
                    activate: true,
                });
                return windowManager.createWindow(windowId, options)
            },
            getWindow: windowManager.getWindow
        };

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
            }, showTask: (task) => {
                const { content, progress } = task;
                send_ipc_render('ipc-notify.show-task', {
                    content,
                    progress,
                    name: this.plugin.name,
                    id: this.plugin.id,
                    is_error: false,
                });
            },
            notifyError: (message: string) => {
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
