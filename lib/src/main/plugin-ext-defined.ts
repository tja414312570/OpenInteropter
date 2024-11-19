import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  MessageBoxOptions,
  MessageBoxReturnValue,
  WebContents,
  WebFrameMain,
} from "electron";
import { EventEmitter } from "events";


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
  default?: any;
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

export interface EnvEventMap {
  change: [];
}

export type NotifyManager = {
  notify: (message: string) => void;
  notifyError: (message: string) => void;
  showTask: (task: { content: string, progress?: number }) => void;
};
export interface IEnvManager extends Pick<EventEmitter<EnvEventMap>, "on"> {
  getAll(): Array<EnvVariable> | undefined;
  getEnv(): Record<string, string>;
  getProcessEnv(): NodeJS.ProcessEnv;
  // foundEnv(name: string, envs?: Array<EnvVariable>): EnvVariable | undefined;
  // foundEnvById(id: string, envs?: Array<EnvVariable>): EnvVariable | undefined;
  get(name: string): EnvVariable | undefined;
  getValue(name: string): string | undefined;
  setEnv(env: EnvVariable | string): Promise<void>;
  setEnv(name: string, value: string, path?: boolean): Promise<void>;
  disable(name: string): Promise<void>;
  enable(name: string): Promise<void>;
  setStatus(name: string, status: EnvVariable['status']): Promise<void>;
  delete(name: string): Promise<void>;
}
export type EnvVariable = {
  id?: string
  name: string
  value: string
  path: boolean
  source: string
  status?: 'enable' | 'disable'
}

export type DialogOpt = MessageBoxOptions;
export type DialogReturnValue = MessageBoxReturnValue;

export interface IpcMainInvokeEvent extends Event {
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
