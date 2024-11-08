import { IpcRendererEvent } from 'electron';
import { IpcRenderer } from 'electron/renderer';
import { v4 as uuidv4 } from 'uuid';
import { observe } from '../../../lib/src/preload/observer-manager';
function showCustomAlert(message: string) {
    const alertDiv = document.createElement('div');
    alertDiv.innerText = message;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '50px';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';
    alertDiv.style.backgroundColor = 'white';
    alertDiv.style.padding = '10px';
    alertDiv.style.border = '1px solid black';
    alertDiv.style.zIndex = '1000';
    const doms = document.body || document.querySelector('#app-body-container')
    doms.appendChild(alertDiv);
}

const _win: { [key: string]: any } = (window as any);

class IpcApi {
    private uuid: string;
    private channel: string;
    private ipcApi: any;
    __v_isRef = false;

    constructor(channel: string) {
        this.uuid = uuidv4();  // 生成 UUID
        this.channel = channel;  // 初始化 channel
        if (!_win[channel]) {
            const message = `IPC-API错误，没有找到渠道:${channel} `
            console.log(new Error(message))
            _win['ipc-core'].send('error-notify', message)
            showCustomAlert(message)
            throw new Error(message)
        }
        this.ipcApi = _win[channel]
    }
    _getId__ = () => {
        return this.uuid;
    }

    _getChannel__ = () => {
        return this.channel;
    }

    _getIpcApi__ = () => {
        return this.ipcApi;
    }
}

export interface DefaultApi {
    off: (channel: string) => void,
    offAll: () => void,
    on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => IpcRenderer;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
}
const notifyError = (message: string) => {
    console.error(new Error(message))
    _win['ipc-core'].send('error-notify', message)
    showCustomAlert(message)
}

// getIpcApi 函数，用于创建带有代理的 IpcApi 对象
/**
 * 获取ipc api
 * @param channel api渠道
 * @param binder 绑定对象 支持Dom，钩子（Function），以及其他类型（Ref等需要自己注册适配器:registerObserverElementAdapter)
 * @returns 
 */
export function getIpcApi<T>(channel: string, binder: Element | Function | any): IpcApi & DefaultApi & T {
    if (!binder) {
        throw new Error("请绑定api所在渠道")
    }

    const ipcApiInstance = new IpcApi(channel);
    const { _getIpcApi__, _getId__ } = ipcApiInstance;

    // 使用 Proxy 创建代理
    const proxy = new Proxy(ipcApiInstance, {
        get(target, prop) {
            if (prop in target) {
                // 如果方法存在，则调用原始对象的方法
                return (target as any)[prop];
            } else {
                // 如果方法不存在，输出调用的方法名并返回一个默认值
                if (prop in _getIpcApi__()) {
                    const apiProp = _getIpcApi__()[prop]
                    return typeof apiProp !== 'function' ? apiProp : (...args: any[]) => {
                        try {
                            _getIpcApi__()._setId_(_getId__());
                            return _getIpcApi__()[prop](...args);
                        } catch (err) {
                            const message = `ipc通信异常:${String(err)},api:${channel}.${String(prop)}`
                            notifyError(message)
                            throw new Error(message, { cause: err })
                        } finally {
                            _getIpcApi__()._setId_(undefined);
                        }
                    };
                } else {
                    const message = `ipc通信异常,api:${channel}.${String(prop)}不存在！`;
                    notifyError(message);
                    throw new Error(message)
                }

            }
        }
    }) as IpcApi & T & DefaultApi;
    if (binder !== window) {
        //钩子
        if (typeof binder === 'function') {
            binder(proxy.offAll)
        } else {
            observe(binder, proxy.offAll)
        }
    }
    return proxy;
}
function isListener(args: any[]) {
    return args.some(arg => typeof arg === 'function');;
}

