import { contextBridge, crashReporter, ipcRenderer, nativeImage, webFrame, webUtils } from "electron";

import { exposeInMainWorld } from "./lib/ipc-wrapper";

import './core-api-pre'
const loadReloadScript = () => {
  ipcRenderer.invoke("plugin-view-api.load-preload-script", location.href).then(async result => {
    const { script, appId } = result;
    // 调用示例，加载模块化的 JavaScript 文件
    if (script.length > 0) {
      if (script.startsWith('http') || script.startsWith('file:')) {
        await import(script)  // 设置模块的路径
      } else {
        const fun = new Function('require', 'contextBridge',
          'crashReporter',
          'ipcRenderer',
          'nativeImage',
          'webFrame',
          'webUtils',
          'Buffer',
          'process',
          'clearImmediate',
          'setImmediate',
          script);
        process['appId'] = appId;
        fun(
          require,
          contextBridge,
          crashReporter,
          ipcRenderer,
          nativeImage,
          webFrame,
          webUtils,
          Buffer,
          process,
          clearImmediate,
          setImmediate,
        )
      }
    } else {
      console.log("当前界面不支持任何组件或组件未就绪")
    }
  }).catch(error => {
    console.error("加载脚本异常", error)
    alert("加载脚本异常:" + error)
  })
}
// const api = 'webview-api'
exposeInMainWorld('childPreload', ipcRenderer => ({
  loadReloadScript
}))
// exposeInMainWorld(api)
loadReloadScript()


window.addEventListener('DOMContentLoaded', () => {
  function loadModule(url: string) {
    const script = document.createElement('script');
    // script.type = 'module';  // 指定为 ES6 模块
    if (url.startsWith('http') || url.startsWith('file:')) {
      script.src = url;  // 设置模块的路径
    } else {
      script.text = url;
    }
    script.onload = () => {
      console.log(`${url} loaded successfully`);
    };
    script.onerror = (...args) => {
      console.error(`Failed to load module: ${url}`, ...args);
    };
    document.head.appendChild(script);  // 将 script 标签插入到页面
  }
  ipcRenderer.invoke("plugin-view-api.load-render-script", location.href).then(file_addr => {
    // 调用示例，加载模块化的 JavaScript 文件
    if (file_addr.length > 0) {
      loadModule(file_addr);
    } else {
      console.log("当前界面不支持任何组件")
    }
  }).catch(error => {
    console.error("加载脚本异常", error)
    alert("加载脚本异常:" + error)
  })
});
