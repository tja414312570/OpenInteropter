import { contextBridge, IpcRenderer, ipcRenderer, IpcRendererEvent } from "electron";
const invokers: Map<string, Map<string, (event: any, data: any) => void>> = new Map;
const bindListener = (_id_: string | undefined, channel: string, listener: any) => {
  if (!_id_) {
    throw new Error("绑定监听器失败，请使用代理，并传递参数")
  }
  if (!invokers.has(_id_)) {
    invokers.set(_id_, new Map())
  }
  invokers.get(_id_)?.set(channel, listener)
}
const removeListener = (_id_: string | undefined, channel: string) => {
  if (!_id_) {
    throw new Error("注销监听器失败，请使用代理，并传递参数")
  }
  const _child = invokers.get(_id_);
  if (_child) {
    _child.delete(channel)
    if (_child.size === 0) {
      invokers.delete(_id_);
    }
  }
}

interface IpcRendererExtended extends IpcRenderer {
  _id_?: string | undefined;
  _app_id_?: string | undefined;
  _setId_: (call: string | Function) => void;
  off: (channel: string, listener?: any) => this;
  offAll: () => void;
}

let _app_id_: string;
class IpcReanderMapper implements IpcRendererExtended {
  namespace: string;
  _id_: string | undefined;
  constructor(namespace: string) {
    this.namespace = namespace;
  }
  _setId_(call: string | Function) {
    if (typeof call === 'function')
      this._id_ = call();
    else
      this._id_ = call;
  }
  _bind(channel: string, target: Function, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    channel = `${this.namespace}.${channel}`;
    const wrappedListener = (event: IpcRendererEvent, ...args: any[]) => {
      try {
        listener(event, ...args);
      } catch (error) {
        console.log(error)
        throw error;
      }
    };
    bindListener(this._id_, channel, wrappedListener)
    ipcRenderer.send('ipc-core.bind-channel-listener', { channel, id: this._id_ })
    try {
      target.bind(ipcRenderer)(channel, wrappedListener);
    } catch (error) {
      throw error
    }
  }
  on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    this._bind(channel, ipcRenderer.on, listener)
    return this;
  }
  offAll() {
    if (!this._id_) {
      throw new Error("注销监听器失败，请使用代理，并传递参数")
    }
    const temp: Map<string, (event: any, data: any) => void> | undefined = invokers.get(this._id_);
    if (temp) {
      for (const [channel] of temp) { // 使用 for...of 遍历 Map 的键值对
        this._off(channel); // 这里的 channel 是 Map 的键
      }
    }
  }
  _off(channel: string) {
    const listener = invokers.get(this._id_ as string)?.get(channel);
    if (!listener) {
      // const error = new Error(`没有找到监听器${this._id_}::${channel}`);
      // console.log(error)
      // throw error;
      return;
    }
    removeListener(this._id_, channel)
    ipcRenderer.off(channel, listener);
    ipcRenderer.send('ipc-core.remove-channel-listener', { channel, id: this._id_ })
    return this;
  }
  off(channel: string) {
    if (!channel) {
      const error = new Error("注销监听器失败，请使用代理，并传递渠道参数")
      console.log(error)
      throw error;
    }
    channel = `${this.namespace}.${channel}`;
    this._off(channel)
    return this;
  }
  addListener(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
    this._bind(channel, ipcRenderer.addListener, listener)
    return this;
  }
  invoke(channel: string, ...args: any[]): Promise<any> {
    channel = `${this.namespace}.${channel}`;
    return ipcRenderer.invoke(channel, ...args)

  }
  once(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
    channel = `${this.namespace}.${channel}`;
    ipcRenderer.once(channel, listener);
    return this;
  }
  postMessage(channel: string, message: any, transfer?: MessagePort[]): void {
    channel = `${this.namespace}.${channel}`;
    ipcRenderer.postMessage(channel, message, transfer)
  }
  removeAllListeners(channel: string): this {
    channel = `${this.namespace}.${channel}`;
    ipcRenderer.removeAllListeners(channel);
    return this;
  }
  removeListener(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): this {
    channel = `${this.namespace}.${channel}`;
    ipcRenderer.removeListener(channel, listener);
    return this;
  }
  send(channel: string, ...args: any[]): void {
    channel = `${this.namespace}.${channel}`;
    ipcRenderer.send(channel, ...args);
  }
  sendSync(channel: string, ...args: any[]) {
    channel = `${this.namespace}.${channel}`;
    ipcRenderer.sendSync(channel, ...args);
  }
  sendToHost(channel: string, ...args: any[]): void {
    channel = `${this.namespace}.${channel}`;
    ipcRenderer.sendToHost(channel);
  }
  setMaxListeners(n: number): this {
    ipcRenderer.setMaxListeners(n);
    return this;
  }
  getMaxListeners(): number {
    return ipcRenderer.getMaxListeners();
  }
  listeners<K>(eventName: string | symbol): Function[] {
    return ipcRenderer.listeners(eventName);
  }
  rawListeners<K>(eventName: string | symbol): Function[] {
    return ipcRenderer.rawListeners(eventName);
  }
  emit<K>(eventName: string | symbol, ...args: any[]): boolean {
    return ipcRenderer.emit(eventName, ...args);
  }
  listenerCount<K>(eventName: string | symbol, listener?: Function): number {
    return ipcRenderer.listenerCount(eventName, listener);
  }
  prependListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
    ipcRenderer.prependListener(eventName, listener);
    return this;
  }
  prependOnceListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
    ipcRenderer.prependOnceListener(eventName, listener);
    return this;
  }
  eventNames(): (string | symbol)[] {
    return ipcRenderer.eventNames();
  }

}
const getAppid = async () => {
  if (_app_id_) {
    return _app_id_;
  }
  const appId = await ipcRenderer.invoke('plugin-window-core-ipc.get-plugin-id');
  if (!appId) {
    throw new Error("没有获取到插件id")
  }
  _app_id_ = appId;
  return appId;
}

const core_namespaces = ['ipc-core']
export const exposeInMainWorld = async (namespace: string, api?: (ipcRenderer: IpcReanderMapper) => { [key: string]: any }) => {
  if (!namespace) {
    throw new Error(`暴漏api必须指定namespace！`)
  }
  if (core_namespaces.indexOf(namespace) > -1) {
    throw new Error(`系统命名空间${core_namespaces.join(',')}不允许被注册！`)
  }
  if (api && typeof api !== 'function') {
    throw new Error(`暴漏api必须通过函数的方式！`)
  }
  const appId = await getAppid();
  const ipcRenderMapper = new IpcReanderMapper(`${appId}.${namespace}`);
  const newApi = api ? api(ipcRenderMapper) : {};
  const wrrpperApi = {
    _setId_: ipcRenderMapper._setId_.bind(ipcRenderMapper),
    off: ipcRenderMapper.off.bind(ipcRenderMapper),
    offAll: ipcRenderMapper.offAll.bind(ipcRenderMapper),
    on: ipcRenderMapper.on.bind(ipcRenderMapper),
    send: ipcRenderMapper.send.bind(ipcRenderMapper),
    invoke: ipcRenderMapper.invoke.bind(ipcRenderMapper),
    ...newApi
  }
  contextBridge.exposeInMainWorld(namespace, wrrpperApi);
}

(() => {
  const appId = (process as any)['appId'];
  if ((process as any)['appId']) {
    _app_id_ = appId;
    return;
  }
  const namespace = `ipc-core`
  const ipcRenderMapper = new IpcReanderMapper(namespace);
  const wrrpperApi = {
    _setId_: ipcRenderMapper._setId_.bind(ipcRenderMapper),
    off: ipcRenderMapper.off.bind(ipcRenderMapper),
    offAll: ipcRenderMapper.offAll.bind(ipcRenderMapper),
    on: ipcRenderMapper.on.bind(ipcRenderMapper),
    send: ipcRenderMapper.send.bind(ipcRenderMapper),
    invoke: ipcRenderMapper.invoke.bind(ipcRenderMapper),
  }
  contextBridge.exposeInMainWorld(namespace, wrrpperApi);
})();