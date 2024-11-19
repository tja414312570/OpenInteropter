import { Dialog } from "electron";
import { GetIpcApi } from "./ipc-api-defined";
import { DialogOpt, DialogReturnValue, IEnvManager, ISettingManager, IWindowManager, NotifyManager, ResourceManager } from "./plugin-ext-defined";

export enum PluginType {
    agent = "agent",
    prompter = "prompter",
    executor = "executor",
}

export enum PluginStatus {
    ready = "ready",
    load = "load",
    unload = "unload",
    disable = "disable",
}
export interface ExtensionContext {
    plugin: PluginInfo,
    settingManager: ISettingManager;
    envDir: string;
    resourceManager: ResourceManager;
    pluginManager: IPluginManager;
    _pluginPath: string;
    workPath: string;
    env: { [key: string]: string; };
    appEnv: { [key: string]: string; };
    envManager: IEnvManager;
    windowManager: IWindowManager;
    getPath(path: 'home' | 'appData' | 'userData' | 'sessionData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps'): string;
    /**
     * 通知管理
     */
    notifyManager: NotifyManager
    getCrossIpcApi: GetIpcApi;
    appPath: string;
    getIpcApi: GetIpcApi;
    showDialog: (message: DialogOpt) => Promise<DialogReturnValue>;
    dialog: Dialog;
    reload: () => void;
    unload: () => void;
}
/**
 * 插件生命周期
 */
export interface Pluginlifecycle {
    /**
     * 加载插件
     */
    onMounted(ctx: ExtensionContext): Promise<void>
    /**
     * 卸载插件
     */
    onUnmounted(): void
}
// 定义加载的插件结构
export interface PluginInfo {
    id: string;
    appId: string;
    manifest: PluginManifest;
    name: string;
    version: string;
    main: string;
    dir: string;
    context: ExtensionContext;
    description: string;
    module: Pluginlifecycle; // 插件导出的钩子函数
    type: PluginType; // 插件类型（根据 manifest 中的 type 字段）
    match?: string[]; // 匹配规则
    instruct?: string[]; //支持的指令
    status: PluginStatus;
}
// 定义插件的接口
export interface PluginManifest {
    appId: string;
    name: string;
    version: string;
    description: string;
    main: string; // 插件的入口文件
    pluginType: string; // 插件类型
    supportedHooks: string[]; // 插件支持的钩子
    author: string;
    license?: string;
    type: string; // 自定义插件的类型（如 bridge）
    match?: string[]; // 匹配规则（如 URL 匹配）
    instruct?: string[]; //支持的指令
}
export interface PluginEventMap {
    load: PluginInfo;
    loaded: PluginInfo;
    error: string;
    unload: PluginInfo;
    unloaded: PluginInfo;
    reload: PluginInfo;
    reloaded: PluginInfo;
    scan: string;
}
export interface PluginProxy {
    proxy: any;
    getModule(): any;
}
export interface IPluginManager {
    register(id: string, plugin: PluginInfo): void;
    unregister(id: string): void;
    loadPlugin(id: string): void;
    unloadPlugin(id: string): void;
    reloadPlugin(id: string): void;
    getAllPlugins(): Array<PluginInfo>;
    getModule(pluginInfo: PluginInfo & PluginProxy): any & Pluginlifecycle;
    getPluginInfo(id: string): PluginInfo | undefined;
    getPluginsByType(type: PluginType): Set<PluginInfo>;
    scanPlugins(): void;
    scanPluginsAsync(): Promise<void>;
    installPlugin(plugin: PluginInfo): void;
    getPluginContext(id: string): ExtensionContext | undefined;
    destroyContext(id: string): void;
    handlePluginError(id: string, error: string): void;
    on(event: keyof PluginEventMap, listener: (...args: any[]) => void): this;
    emit(event: keyof PluginEventMap, ...args: any[]): boolean;
}