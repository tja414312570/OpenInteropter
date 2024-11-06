import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  IpcMainEvent,
  MessageBoxOptions,
  MessageBoxReturnValue,
  WebContents,
  WebFrameMain,
} from "electron";
import { Pluginlifecycle } from "./plugin-lifecycle";
import EventEmitter from "events";
import path from "path";

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

// 定义加载的插件结构
export interface PluginInfo {
  id: string;
  appId: string;
  manifest: any;
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

export interface PluginProxy {
  proxy: any;
  getModule(): any;
}

export interface ResourceManager {
  require: <T>(id: string) => Promise<T>;
  put: (id: string, resource: any) => void;
}
export enum ResourceStatus {
  RESOURCE_NOT_FOUND,
}
export type ISetting = {
  name: string;
  key: string;
  page?: string;
  path?: string;
  hide?: boolean;
  subs?: Array<ISetting> | null;
};

export type IBrowserWindowOptions = BrowserWindowConstructorOptions & {
  showMenu?: boolean
}

export interface IWindowManager {
  createWindow: (windowId: string, options?: IBrowserWindowOptions) => BrowserWindow;
  getWindow: (windowId: string) => BrowserWindow;
}
export interface SettingEventMap {
  add: [string, ISetting];
  remove: [string, ISetting];
  change: [string, any];
  [event: string]: any[];
}
export interface ISettingManager extends EventEmitter<SettingEventMap> {
  /**
   * @param key 设置坐标
   * @param listener 监听器
   * @returns 移除监听器
   */
  onValueChange(key: string, listener: (value: any) => void): () => void;
  offAllValueChange(key: string): void;
  register(menus: ISetting | ISetting[], path_?: string): Promise<ISetting | ISetting[]>;
  get(key: string): any;
  remove(menus: ISetting | ISetting[]): void;
  save(
    key: string | Record<string, any>,
    value?: any
  ): Promise<void>;
  getSettings(path?: string): ISetting[] | ISetting;
}
export type NotifyManager = {
  notify: (message: string) => void;
  notifyError: (message: string) => void;
  showTask: (task: { content: string, progress?: number }) => void;
};
export interface ExtensionContext {
  plugin: PluginInfo,
  settingManager: ISettingManager;
  envDir: string;
  resourceManager: ResourceManager;
  _pluginPath: string;
  workPath: string;
  windowManager: IWindowManager;
  getPath(path: 'home' | 'appData' | 'userData' | 'sessionData' | 'temp' | 'exe' | 'module' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'recent' | 'logs' | 'crashDumps'): string;
  /**
   * 通知管理
   */
  notifyManager: NotifyManager
  ipcMain: IIpcMain;
  appPath: string;
  sendIpcRender: (event_: string, message: any) => void;
  showDialog: (message: DialogOpt) => Promise<DialogReturnValue>;
  reload: () => void;
  unload: () => void;
}
export type DialogOpt = MessageBoxOptions;
export type DialogReturnValue = MessageBoxReturnValue;

export interface IIpcMain {
  /**
   * Adds a handler for an `invoke`able IPC. This handler will be called whenever a
   * renderer calls `ipcRenderer.invoke(channel, ...args)`.
   *
   * If `listener` returns a Promise, the eventual result of the promise will be
   * returned as a reply to the remote caller. Otherwise, the return value of the
   * listener will be used as the value of the reply.
   *
   * The `event` that is passed as the first argument to the handler is the same as
   * that passed to a regular event listener. It includes information about which
   * WebContents is the source of the invoke request.
   *
   * Errors thrown through `handle` in the main process are not transparent as they
   * are serialized and only the `message` property from the original error is
   * provided to the renderer process. Please refer to #24427 for details.
   */
  handle(
    channel: string,
    listener: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
  ): void;
  /**
   * Handles a single `invoke`able IPC message, then removes the listener. See
   * `ipcMain.handle(channel, listener)`.
   */
  handleOnce(
    channel: string,
    listener: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any
  ): void;
  /**
   * Listens to `channel`, when a new message arrives `listener` would be called with
   * `listener(event, args...)`.
   */
  on(
    channel: string,
    listener: (event: IpcMainEvent, ...args: any[]) => void
  ): this;
  /**
   * Adds a one time `listener` function for the event. This `listener` is invoked
   * only the next time a message is sent to `channel`, after which it is removed.
   */
  once(
    channel: string,
    listener: (event: IpcMainEvent, ...args: any[]) => void
  ): this;
  /**
   * Removes listeners of the specified `channel`.
   */
  removeAllListeners(channel?: string): this;
  /**
   * Removes any handler for `channel`, if present.
   */
  removeHandler(channel: string): void;
  /**
   * Removes the specified `listener` from the listener array for the specified
   * `channel`.
   */
  removeListener(channel: string, listener: (...args: any[]) => void): this;
}

export interface IpcMainInvokeEvent extends Event {
  // Docs: https://electronjs.org/docs/api/structures/ipc-main-invoke-event

  /**
   * The ID of the renderer frame that sent this message
   */
  frameId: number;
  /**
   * The internal ID of the renderer process that sent this message
   */
  processId: number;
  /**
   * Returns the `webContents` that sent the message
   */
  sender: WebContents;
  /**
   * The frame that sent this message
   *
   */
  readonly senderFrame: WebFrameMain;
}
export enum PluginType {
  agent = "agent",
  executor = "executor",
}

export enum PluginStatus {
  ready = "ready",
  load = "load",
  unload = "unload",
  disable = "disable",
}
