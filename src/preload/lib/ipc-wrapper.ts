import { contextBridge, IpcRenderer, ipcRenderer, IpcRendererEvent } from "electron";

const invokers: Map<string, Map<string, (event: any, data: any) => void>> = new Map;
const bindListener = (_id_: string, channel: string, listener: any) => {
  if (!invokers.has(_id_)) {
    invokers.set(_id_, new Map())
  }
  invokers.get(_id_).set(channel, listener)
}
const removeListener = (_id_: string, channel: string) => {
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
  _setId_: (call: string | Function) => void;
  off: (channel: string, listener?: any) => this;
  offAll: () => void;
}

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
        console.error(`监听器 '${channel}' 执行出错:`, error);
        alert(`监听器 '${channel}' 执行出错:${String(error)}`)
        throw error;
      }
    };
    bindListener(this._id_, channel, wrappedListener)
    ipcRenderer.send('ipc-core.bind-channel-listener', channel)
    try {
      target.bind(ipcRenderer)(channel, wrappedListener);
    } catch (error) {
      console.error(`监听器 '${channel}' 绑定出错:`, error);
      throw error
    }
  }
  on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) {
    this._bind(channel, ipcRenderer.on, listener)
    return this;
  }
  offAll() {
    if (!this._id_) {
      alert("注销监听器失败，请使用Ipc-Api调用，并传递参数")
      console.error(new Error("注销监听器失败，请使用代理，并传递参数"))
      return;
    }
    const temp: Map<string, (event: any, data: any) => void> = invokers.get(this._id_);
    if (temp) {
      for (const [channel] of temp) { // 使用 for...of 遍历 Map 的键值对
        this._off(channel); // 这里的 channel 是 Map 的键
      }
    }
  }
  _off(channel: string) {
    const listener = invokers.get(this._id_)?.get(channel);
    if (!listener) {
      alert("没有找到监听器")
      const error = new Error(`没有找到监听器${this._id_}::${channel}`);
      console.error(error)
      throw error;
    }
    ipcRenderer.off(channel, listener);
    removeListener(this._id_, channel)
    ipcRenderer.send('ipc-core.remove-channel-listener', channel)
    return this;
  }
  off(channel: string) {
    if (!channel) {
      alert("注销监听器失败，请传入要解绑的渠道")
      console.error(new Error("注销监听器失败，请使用代理，并传递参数"))
      return;
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

export const exposeInMainWorld = (namespace: string, api?: (ipcRenderer: IpcReanderMapper) => { [key: string]: any }) => {
  if (!namespace) {
    throw new Error(`暴漏api必须指定namespace！`)
  }
  if (api && typeof api !== 'function') {
    throw new Error(`暴漏api必须通过函数的方式！`)
  }
  const ipcRenderMapper = new IpcReanderMapper(namespace);
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