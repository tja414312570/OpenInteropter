import {
    DialogOpt, DialogReturnValue, ExtensionContext as ExtExtensionContext, IIpcMain, ISetting, ISettingManager, IWindowManager, NotifyManager, PluginInfo as ExtPluginInfo,
    ResourceManager,
    GetIpcApi,
    IpcApi
} from '@lib/main'
import settingManager from '@main/services/service-setting'
import path from 'path';
import appContext from '@main/services/app-context';
import resourceManager from './resource-manager';
import { app, IpcMainInvokeEvent } from 'electron';
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
type CloseableCallback = () => void | Promise<any>;
const notifyApi = getIpcApi('ipc-notify')
export class PluginContext implements ExtensionContext {
    plugin: PluginInfo;
    settingManager: ISettingManager;
    private closeCleanResource: Set<CloseableCallback> = new Set;
    envDir: string;
    resourceManager: ResourceManager;
    _pluginPath: string;
    workPath: string;
    notifyManager: NotifyManager;
    getCrossIpcApi: GetIpcApi;
    appPath: string;
    windowManager: IWindowManager;
    getIpcApi: GetIpcApi;
    env: { [key: string]: string; };
    getPath(path: 'home' | 'appData' | 'userData' | 'sessionData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps') {
        return app.getPath(path);
    }
    showDialog: (message: DialogOpt) => Promise<DialogReturnValue>;
    reload() {
        pluginManager.reload(this.plugin);
    }
    unload() {
        pluginManager.unload(this.plugin);
    }
    constructor(plugin: PluginInfo) {
        this.plugin = plugin;
        this.resourceManager = resourceManager;
        this.env = { ...appContext.env };
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
        const codeApi = getIpcApi("code-view-api")
        this.resourceManager.put('code', {
            render: (message: any) => {
                codeApi.send("execute-render", message);
            }
        })

        this.windowManager = {
            createWindow: (windowId, options) => {
                windowId = plugin.appId + (windowId || '')
                const preload = options?.webPreferences?.preload;
                options = {
                    ...options, webPreferences: {
                        devTools: true,
                        webviewTag: true,
                        preload: getPreloadFile('ext-plugin-main')
                    }
                }
                options.title = options.title || plugin.name
                const window = windowManager.createWindow(windowId, options);
                if (preload) {
                    window.webContents.on('will-attach-webview', (e, webPreferences) => {
                        webPreferences.preload = preload;
                    })
                }
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
                const closeClear = () => {
                    return new Promise<void>(resolve => {
                        console.log('关闭窗口:' + windowId)
                        window.on('close', async () => {
                            console.log('关闭窗口2:' + windowId)
                            window.off('close', closeClear);
                            window.destroy();
                            resolve();
                        })
                        window.close();
                    })
                };
                window.on('close', () => {
                    this.closeCleanResource.delete(closeClear)
                })
                this.closeCleanResource.add(closeClear)
                window['plugin'] = this.plugin;
                return windowManager.createWindow(windowId, options)
            },
            getWindow: windowManager.getWindow
        };
        this.getIpcApi = (namespace: string) => {
            const api = getIpcApi(`${plugin.appId}.${namespace}`) as unknown as IpcApi;
            const api_on = api.on
            api.on = (channel: string, listener: any) => {
                this.closeCleanResource.add(() => api.removeListener.bind(api)(channel, listener))
                api_on.bind(api)(channel, listener);
                return api;
            };
            const api_handle = api.handle;
            api.handle = (channel: string, listener: any) => {
                this.closeCleanResource.add(() => api.removeHandler.bind(api)(channel, listener))
                api_handle.bind(api)(channel, listener);
                return api;
            };
            return api;
        };
        this.getCrossIpcApi = (namespace: string) => getIpcApi(`${namespace}`) as unknown as IpcApi;
        this.workPath = path.join(appContext.pluginPath, plugin.appId);
        this.envDir = appContext.envPath;

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
    async destory() {
        for (const fun of this.closeCleanResource) {
            try {
                await fun();
            } catch (err) {
                console.warn('释放资源时出现异常：', err)
            }

        }
    }
}
