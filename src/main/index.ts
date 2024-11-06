"use strict";
// process.on('unhandledRejection', (reason, promise) => {
//   console.error('Unhandled Promise Rejection:', reason);
//   process.exit(1); // 以非零状态码退出程序
// });
import { useMainDefaultIpc } from "./services/ipc-main";
import { app, BrowserWindow, dialog, ipcMain, IpcMainEvent, session } from "electron";
import { MainInit } from "./services/window-manager";
import { useDisableButton } from "./hooks/disable-button-hook";
import { useProcessException } from "@main/hooks/exception-hook";
import { useMenu } from "@main/hooks/menu-hook"
import { startProxyServer } from "./services/proxy";

import fs, { glob } from "fs"
import { init as ptyInit } from './services/service-inner-shell'
import { notify } from "./ipc/notify-manager";
import { listeners } from "process";
import pluginManager from "./plugin/plugin-manager";
import path from "path";
import { showErrorDialog } from "./utils/dialog";
import { createWindow } from "./services/window-settings";
const innerPluginPath = path.join(__dirname, '../../../plugins');
import './ipc-bind/core-ipc-bind'
app.setName('myApp');
import './services/global-agents'
import './services/service-setting'
import './services/service-menu'
import "./services/window-settings";
import { handleChannelEvent } from "./services/web-content-listener";
import { onAppReady } from "./ipc-bind/core-ipc-bind";
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
handleChannelEvent('pty.terminal-output', {
  onBind: function (webId: number): void {
    // ptyInit()
  }
})
//当通知ui就绪时
handleChannelEvent('ipc-notify.show-task', {
  onBind: (webId: number): void => {
    notify("gpt拦截器已初始化完成！")
    pluginManager.on('error', (event_, plugin_path, err) => {
      if (event_ === 'scan') {
        showErrorDialog(`加载扩展异常${plugin_path},错误:${String(err)}`)
      }

    })

  }
})
//当通知ui就绪时
handleChannelEvent('plugin-view-api.load', {
  onBind: (webId: number): void => {
    pluginManager.loadPluginFromDir(innerPluginPath).catch(err => {
      notify("插件加载异常:" + err)
    })
  }
})

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
