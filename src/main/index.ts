"use strict";
// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Promise Rejection:', reason);
//   process.exit(1); // 以非零状态码退出程序
// });
// import './utils/dump'
import './services/app-context'
import { useMainDefaultIpc } from "./services/ipc-main";
import { app, BrowserWindow, dialog, ipcMain, IpcMainEvent, Menu, MenuItem, MenuItemConstructorOptions, session } from "electron";
import { MainInit } from "./services/window-manager";
import { useDisableButton } from "./hooks/disable-button-hook";
import { useProcessException } from "@main/hooks/exception-hook";
import { useMenu } from "@main/hooks/menu-hook"
import { startProxyServer } from "./services/mitm-proxy-service";

import fs, { glob } from "fs"
import { init as ptyInit } from './services/service-inner-shell'
import { notify } from "./ipc/notify-manager";
import pluginManager from "./plugin/plugin-manager";
import path from "path";
import { showErrorDialog } from "./utils/dialog";
const plugin_load_type = process.env.plugin_load_type;
const innerPluginPath = plugin_load_type === 'dev' ? path.join(__dirname, '../../../plugins') : path.join(__dirname, '../plugins');
console.log('插件加载地址:', innerPluginPath)
import './ipc-bind/core-ipc-bind'
app.setName('开放解释器');
import './services/env-manager'
import './services/global-agents'
import './services/service-setting'
import './services/service-menu'
import "./services/window-settings";
import remoteWebviewManager from './services/remote-webview-manager';
import "./services/window-prompt"
import modelService from './services/model-service'; './services/model-service'

modelService.set(new OllamaModel())
// import { onAppReady } from "./ipc-bind/core-ipc-bind";
import { getIpcApi } from "./ipc/ipc-wrapper";
import { OllamaModel } from './model-provider/ollama';
function startWindow(proxy: string) {
  // const { disableF12 } = useDisableButton();
  // const { renderProcessGone } = useProcessException();
  // const { defaultIpc } = useMainDefaultIpc()
  // const { creactMenu } = useMenu()
  // disableF12();
  // renderProcessGone();
  // defaultIpc();
  // creactMenu()

  new MainInit(proxy).initWindow();
  // createWindow();
  if (process.env.NODE_ENV === "development") {
    const { VUEJS_DEVTOOLS } = require("electron-devtools-vendor");
    session.defaultSession.loadExtension(VUEJS_DEVTOOLS, {
      allowFileAccess: true,
    });
    console.log("已安装: vue-devtools");
  }
}
global.userDataPath = app.getPath('userData');
if (fs.existsSync(global.userDataPath)) {
  console.log('配置目录存在:', global.userDataPath);
} else {
  console.log('配置目录不存在:', global.userDataPath);
}
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault(); // 阻止默认行为
  callback(true);  // 忽略证书错误
});
//当终端ui就绪时
const pty = getIpcApi('pty')
pty.onRenderBind('terminal-output', (webId: number) => {
  ptyInit()
})
//当通知ui就绪时
const coreApi = getIpcApi('ipc-notify')
const disposeable = coreApi.onRenderBind('show-task', (webId: number): void => {
  notify("核心界面已初始化完成！")
  disposeable();
})
//当通知ui就绪时
const pluginApi = getIpcApi('plugin-view-api')
const pluginDisposeable = pluginApi.onRenderBind('remove', (webId: number): void => {
  pluginDisposeable()
  pluginManager.on('error', (event_, plugin_path, err) => {
    if (event_ === 'scan') {
      showErrorDialog(`加载扩展异常${plugin_path},错误:${String(err)}`)
    }
  })
  pluginManager.loadPluginFromDir(innerPluginPath).catch(err => {
    notify("插件加载异常:" + err)
  }).finally(() => {
    remoteWebviewManager.onAppReady()
  })
})
const gpuDisableds = ['disabled_off', 'unavailable', 'disabled', 'off']
const gpuStatus = app.getGPUFeatureStatus();
if (gpuDisableds.indexOf(gpuStatus.webgl) > -1 || gpuDisableds.indexOf(gpuStatus.gpu_compositing) > -1) {
  console.warn('GPU 加速不可用，禁用硬件加速');
  app.disableHardwareAcceleration();
}

app.whenReady().then(() => {
  startProxyServer().then(proxy => {
    startWindow(`http://${proxy.httpHost}:${proxy.httpPort}`);
  })
});
// 由于9.x版本问题，需要加入该配置关闭跨域问题
app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");
app.on("window-all-closed", () => {
  // 所有平台均为所有窗口关闭就退出软件
  app.quit();
});
app.on("browser-window-created", (event: Event,
  window: BrowserWindow) => {
  window.once("ready-to-show", () => {

  });
});


if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.removeAsDefaultProtocolClient("electron-vue-template");
    console.log("由于框架特殊性开发环境下无法使用");
  }
} else {
  app.setAsDefaultProtocolClient("electron-vue-template");
}
