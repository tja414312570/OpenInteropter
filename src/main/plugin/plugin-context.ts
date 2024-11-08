import {
    DialogOpt, DialogReturnValue, ExtensionContext as ExtExtensionContext, IIpcMain, ISetting, ISettingManager, IWindowManager, NotifyManager, PluginInfo as ExtPluginInfo,
    ResourceManager
} from '@lib/main'
import settingManager from '@main/services/service-setting'
import path from 'path';
import appContext from '@main/services/app-context';
import resourceManager from './resource-manager';
import { app } from 'electron';
import windowManager from '@main/services/window-manager';
import pluginManager from './plugin-manager';
import { getPreloadFile, getUrl } from "@main/config/static-path";
import { getIpcApi } from '@main/ipc/ipc-wrapper';

export interface ExtensionContext extends ExtExtensionContext {
    /**
       *
       * @param plugin 用于获取组件的id
       */
    create(): void;
    /**
     * 用于当组件卸载时主动清理上线文中的钩子
     * @param plugin
     */
    destory(): void;
}

export interface PluginInfo extends ExtPluginInfo {
    context: ExtensionContext
}
const notifyApi = getIpcApi('ipc-notify')
export class PluginContext implements ExtensionContext {
    plugin: PluginInfo;
    settingManager: ISettingManager;
    private settings: Set<string> = new Set;
    private closeCleanResource: Set<() => void> = new Set;
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
            on(_evnent: string, listener: (...args: any) => void) {
                settingManager.on(_evnent, listener)
                this.closeCleanResource.add(() => settingManager.off(_evnent, listener))
            },
            off: settingManager.off,
            offAllValueChange(key: any) {
                settingManager.offAllValueChange(`plugin.${appid}.${key}`)
            },
            remove(menus: ISetting | ISetting[]) {
                settingManager.remove(menus);
            },
            onValueChange(key: any, listener: (value: any) => void) {
                return settingManager.onValueChange(`plugin.${appid}.${key}`, listener);
            },
            register: (menus: ISetting | ISetting[], path_?: string) => {
                const promise = settingManager.register(menus, `plugin.${appid}${path_ ? '.' + path_ : ''}`);
                this.closeCleanResource.add(() => settingManager.remove(menus))
                return promise;
            },
            get: (key: string) => {
                return settingManager.get(`plugin.${appid}.${key}`);
            },
            save: (key: string, value?: any) => {
                return settingManager.save(`plugin.${appid}.${key}`, value)
            },
            getSettings: (path?: string) => {
                return settingManager.getSettings(`plugin.${appid}.${path}`)
            }
        } as any;
        this.windowManager = {
            createWindow: (windowId, options) => {
                windowId = plugin.appId + (windowId || '')
                const preload = options.webPreferences.preload;
                options = {
                    ...options, webPreferences: {
                        devTools: true,
                        webviewTag: true,
                        preload: getPreloadFile('ext-plugin-main')
                    }
                }
                const window = windowManager.createWindow(windowId, options);
                window.webContents.on('will-attach-webview', (e, webPreferences) => {
                    webPreferences.preload = preload;
                })
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
                const closeClear = window.close.bind(window);
                window.on('close', () => {
                    this.closeCleanResource.delete(closeClear)
                })
                this.closeCleanResource.add(closeClear)
                window['plugin'] = this.plugin;
                return windowManager.createWindow(windowId, options)
            },
            getWindow: windowManager.getWindow
        };

        this.workPath = path.join(appContext.pluginPath, plugin.appId);
        this.envDir = appContext.envPath;
        this.resourceManager = resourceManager;
        this.notifyManager = {
            notify: (message: string) => {
                notifyApi.send('show-notification', {
                    message,
                    name: this.plugin.name,
                    id: this.plugin.id,
                    is_error: false,
                });
            }, showTask: (task) => {
                const { content, progress } = task;
                notifyApi.send('show-task', {
                    content,
                    progress,
                    name: this.plugin.name,
                    id: this.plugin.id,
                    is_error: false,
                });
            },
            notifyError: (message: string) => {
                notifyApi.send('show-notification', {
                    message,
                    name: this.plugin.name,
                    id: this.plugin.id,
                    is_error: false,
                });
            }
        }
    }

    create(): void {
        console.log("组件开始注册")
    }
    destory(): void {
        console.log("组件开始移除")
        for (const fun of this.closeCleanResource) {
            fun();
        }
    }
}
