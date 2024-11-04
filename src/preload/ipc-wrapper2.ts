import { contextBridge, IpcRenderer, ipcRenderer, IpcRendererEvent } from "electron";

const invokers: { [key: string]: { [key: string]: (event: any, data: any) => void } } = {};
const bindListener = (_id_: string, channel: string, listener: any) => {
  if (!invokers[_id_]) {
    invokers[_id_] = {}
  }
  invokers[_id_][channel] = listener
}
const removeListener = (_id_: string, channel: string) => {
  if (invokers[_id_]) {
    delete invokers[_id_][channel]
    if (Object.keys(invokers[_id_]).length === 0) {
      delete invokers[_id_];
    }
  }
}
const onReady = (): Promise<number> => {

  return new Promise<number>((resolve, rejects) => {
    if (ipcRenderMapper._web_content_id_) {
      resolve(ipcRenderMapper._web_content_id_)
      return;
    }
    ipcRenderer.invoke('ipc-core.get-current-webcontents-id').then(webContentId => {
      console.log(`获取当前的进程信息：${webContentId}`)
      resolve(webContentId)
    }).catch(err => {
      console.error("获取进程失败：", err)
      rejects(err)
    })
  })
}

interface IpcRendererExtended extends IpcRenderer {
  _id_?: string | undefined;
  _web_content_id_?: number | undefined;
  _setId_: (call: string | Function) => void;
  offAll: () => void;
}

export const ipcRenderMapper: IpcRendererExtended = new Proxy({
  _id_: undefined,
  _web_content_id_: undefined,
  _setId_: (call: string | Function) => {
    if (typeof call === 'function')
      ipcRenderMapper._id_ = call();
    else
      ipcRenderMapper._id_ = call;
  },
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): IpcRenderer => {
    const _id_ = ipcRenderMapper._id_;
    if (!_id_) {
      alert("绑定监听器失败，请使用Ipc-Api调用")
      console.error(new Error("注销监听器失败，请使用代理"))
      return;
    }
    console.log("绑定监听器：", channel)
    const wrappedListener = (event: IpcRendererEvent, ...args: any[]) => {
      try {
        listener(event, ...args);
      } catch (error) {
        console.error(`监听器 '${channel}' 执行出错:`, error);
        alert(`监听器 '${channel}' 执行出错:${String(error)}`)
        // 你可以在这里添加自定义的错误处理，例如发送通知或日志记录
      }
    };
    bindListener(ipcRenderMapper._id_, channel, wrappedListener)
    ipcRenderer.send('ipc-core.bind-channel-listener', { webContentId: ipcRenderMapper._web_content_id_, channel })
    return ipcRenderer.on(channel, wrappedListener);
  },
  offAll: () => {
    const _id_ = ipcRenderMapper._id_;
    if (!_id_) {
      alert("注销监听器失败，请使用Ipc-Api调用，并传递参数")
      console.error(new Error("注销监听器失败，请使用代理，并传递参数"))
      return;
    }
    console.log("注销监听:", _id_)
    if (invokers[_id_]) {
      for (const channel in invokers[_id_]) {
        const listener = invokers[_id_][channel];
        console.log("注销监听:", _id_, listener)
        ipcRenderer.off(channel, listener);
        removeListener(_id_, channel)
        ipcRenderer.send('ipc-core.remove-channel-listener', { webContentId: ipcRenderMapper._web_content_id_, channel })
        console.log(`Listener for ${channel} on ${channel} removed`);
      }
    }
  },
  off: (channel: string) => {
    const _id_ = ipcRenderMapper._id_;
    if (!_id_) {
      alert("注销监听器失败，请使用Ipc-Api调用，并传递参数")
      console.error(new Error("注销监听器失败，请使用代理，并传递参数"))
      return;
    }
    if (channel) {
      alert("注销监听器失败，请传入要解绑的渠道")
      console.error(new Error("注销监听器失败，请使用代理，并传递参数"))
      return;
    }
    console.log("注销监听:", _id_)
    const listener = invokers[_id_][channel];
    ipcRenderer.off(channel, listener);
    removeListener(_id_, channel)
    ipcRenderer.send('ipc-core.remove-channel-listener', { webContentId: _id_, channel })
    console.log(`Listener for ${channel} on ${channel} removed`);
  }
}, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    } else {
      return (...args: any) => ipcRenderer[prop](...args)
    }
  }
}) as any;

const api_wrapoer = {
  _setId_: ipcRenderMapper._setId_,
  off: ipcRenderMapper.off,
  offAll: ipcRenderMapper.offAll,
  on: ipcRenderMapper.on,
  send: ipcRenderer.send,
  invoke: ipcRenderer.invoke
}
export const exposeInMainWorld = (channel: string, api: { [key: string]: any }) => {
  return new Promise<void>((resolve, rejects) => {
    onReady().then((webContentId: number) => {
      console.log("准备暴露进程", webContentId)
      ipcRenderMapper._web_content_id_ = webContentId;
      const wrrpperApi = { ...api_wrapoer, ...api }
      contextBridge.exposeInMainWorld(channel, wrrpperApi);
      resolve();
    }).catch(err => {
      rejects(err)
    })
  })
}
