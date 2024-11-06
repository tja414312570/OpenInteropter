import config from "@config/index";
import { BrowserWindow, BrowserWindowConstructorOptions, dialog, session } from "electron";
import { winURL, loadingURL, getPreloadFile } from "../config/static-path";
import { useProcessException } from "@main/hooks/exception-hook";
import "./executor";
import _ from "lodash";
import { registeMenu } from "./service-menu";
import { showErrorDialog } from "@main/utils/dialog";
import { IBrowserWindowOptions, IWindowManager } from "@lib/main";

export const DefaultWindowId = {
  LOADING: 'DEFAULT_WINDOW',
  MAIN: 'DEFAULT_MAIN',
}
export type ExtBrowserWindowOptions = {
  showMenu?: boolean
}

class WindowManager implements IWindowManager {
  private windowMap: Map<string, BrowserWindow>
  constructor() {
    this.windowMap = new Map();
  }
  createWindow(windowId: string, options?: IBrowserWindowOptions) {
    let window = this.windowMap.get(windowId);
    if (!window) {
      const mergedOptions = _.merge({}, options, {
        titleBarStyle: "hidden",
        frame: false,
        webPreferences: {
          webSecurity: true,
          scrollBounce: process.platform === "darwin",
          contextIsolation: true,
          nodeIntegration: false,
          allowRunningInsecureContent: false,
        }
      });
      window = new BrowserWindow(mergedOptions)
      window['options'] = mergedOptions;
      this.windowMap.set(windowId, window)
      window.on('closed', () => {
        console.log('主窗口已被销毁');
        this.windowMap.delete(windowId)
      });
    }
    window.show();
    window.focus(); // 使窗口获取焦点
    return window;
  }
  getWindowOptions(windowId: string): IBrowserWindowOptions {
    return this.windowMap.get(windowId)?.['options'] || {};
  }
  getWindow(windowId: string) {
    return this.windowMap.get(windowId);
  }
}
const windowManager = new WindowManager();
export default windowManager;


class MainInit {
  public winURL: string = "";
  public shartURL: string = "";
  public loadWindow: BrowserWindow = null;
  public mainWindow: BrowserWindow = null;
  private childProcessGone = null;
  private proxy: string;

  constructor(proxy: string) {
    const { childProcessGone } = useProcessException();
    this.winURL = winURL;
    this.shartURL = loadingURL;
    this.childProcessGone = childProcessGone;
    this.proxy = proxy;
  }
  // 主窗口函数
  createMainWindow() {
    this.mainWindow = windowManager.createWindow(DefaultWindowId.MAIN, {
      title: '开放解释器',
      titleBarStyle: "hidden",
      height: 800,
      useContentSize: true,
      width: 1700,
      minWidth: 1366,
      show: false,
      frame: false,
      showMenu: true,
      webPreferences: {
        // webSecurity: false,
        webviewTag: true,
        // 如果是开发模式可以使用devTools
        devTools: process.env.NODE_ENV === "development",
        // 在macos中启用橡皮动画
        scrollBounce: process.platform === "darwin",
        preload: getPreloadFile("index"),
        contextIsolation: true,
        nodeIntegration: false,
        // allowRunningInsecureContent: true // 允许不安全内容
      },
    });
    // 加载主窗口
    this.mainWindow.loadURL(this.winURL);
    this.mainWindow.webContents.on('will-attach-webview', (e, webPreferences) => {
      webPreferences.preload = getPreloadFile('webview')
    })
    const ses = session.fromPartition('persist:your-partition');
    registeMenu({
      label: '清理缓存',
      key: 'clean',
      click: () => {
        // 清理所有存储数据，包括缓存、Cookies、LocalStorage 等
        ses.clearStorageData({
          storages: ["filesystem", "indexdb", "localstorage", "shadercache", "websql", "serviceworkers", "cachestorage"]
        }).then(() => {
          dialog.showMessageBox({
            message: '清理完成'
          });
        }).catch(err => {
          showErrorDialog({
            message: `清理缓存失败${String(err)}`
          })
        });
      }
    }, 'general')


    ses.webRequest.onHeadersReceived((details, callback) => {
      delete details.responseHeaders['content-security-policy']
      callback({ responseHeaders: details.responseHeaders });
    })

    ses.setProxy({
      proxyRules: this.proxy,  // 代理地址
      proxyBypassRules: 'localhost'  // 忽略本地流量
    }).then(() => {
      console.log('Proxy set successfully');
    }).catch((error) => {
      console.error('Failed to set proxy', error);
    });
    // dom-ready之后显示界面
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
      if (config.UseStartupChart) this.loadWindow.destroy();
    });
    // 开发模式下自动开启devtools
    if (process.env.NODE_ENV === "development") {
      this.mainWindow.webContents.openDevTools({
        mode: "undocked",
        activate: true,
      });
    }
    // 不知道什么原因，反正就是这个窗口里的页面触发了假死时执行
    this.mainWindow.on("unresponsive", () => {
      dialog
        .showMessageBox(this.mainWindow, {
          type: "warning",
          title: "警告",
          buttons: ["重载", "退出"],
          message: "图形化进程失去响应，是否等待其恢复？",
          noLink: true,
        })
        .then((res) => {
          if (res.response === 0) this.mainWindow.reload();
          else this.mainWindow.close();
        });
    });
    /**
     * 新的gpu崩溃检测，详细参数详见：http://www.electronjs.org/docs/api/app
     * @returns {void}
     * @author zmr (umbrella22)
     * @date 2020-11-27
     */
    this.childProcessGone(this.mainWindow);
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
      process.exit()
    });
  }
  // 加载窗口函数
  loadingWindow(loadingURL: string) {
    this.loadWindow = windowManager.createWindow(DefaultWindowId.LOADING, {
      width: 400,
      height: 600,
      frame: false,
      skipTaskbar: true,
      transparent: true,
      resizable: false,
      webPreferences: {
        experimentalFeatures: true,
        preload: getPreloadFile("index"),
      },
    });

    this.loadWindow.loadURL(loadingURL);
    this.loadWindow.show();
    // this.loadWindow.setAlwaysOnTop(true);
    this.createMainWindow();
  }
  // 初始化窗口函数
  initWindow() {
    if (config.UseStartupChart) {
      return this.loadingWindow(this.shartURL);
    } else {
      return this.createMainWindow();
    }
  }
}
export { MainInit }
