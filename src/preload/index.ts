import { contextBridge, ipcRenderer, shell } from "electron";
import { onUnmounted } from "vue";
import { IpcChannelMainClass, IpcChannelRendererClass } from "../ipc/index";
import { exposeInMainWorld } from "./lib/ipc-wrapper";
import './index-plugin-view'
import './index-instruct-view'
import './core-api-pre'

exposeInMainWorld('pty');

exposeInMainWorld('ipc-notify', ipcRenderer => ({
  onReady: () => ipcRenderer.send('ready'),
  sendNotification: (message, isError = false) => ipcRenderer.send('notify', { message, isError }),
  clearNotification: () => ipcRenderer.send('clear-notification'),
  // 监听通知事件
  onNotify: (callback) => ipcRenderer.on('show-notification', (event, notifyData) => {
    callback(notifyData);
  }),
  // 监听清理通知事件
  onClearNotification: (callback) => ipcRenderer.on('clear-notification', callback),
}));

function getIpcRenderer() {
  const IpcRenderer = {};
  Object.keys(new IpcChannelMainClass()).forEach((channel) => {
    IpcRenderer[channel] = {
      invoke: async (args: any) => ipcRenderer.invoke(channel, args),
    };
  });
  Object.keys(new IpcChannelRendererClass()).forEach((channel) => {
    IpcRenderer[channel] = {
      on: (listener: (...args: any[]) => void) => {
        ipcRenderer.on(channel, listener);
      },
      once: (listener: (...args: any[]) => void) => {
        ipcRenderer.once(channel, listener);
        onUnmounted(() => {
          ipcRenderer.removeListener(channel, listener);
        });
      },
      removeAllListeners: () => ipcRenderer.removeAllListeners(channel),
    };
  });
  return IpcRenderer;
}

contextBridge.exposeInMainWorld("ipcRendererChannel", getIpcRenderer());

contextBridge.exposeInMainWorld("shell", shell);

contextBridge.exposeInMainWorld("crash", {
  start: () => {
    process.crash();
  },
});
