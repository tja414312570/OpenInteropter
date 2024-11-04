import config from "@config/index";
import { BrowserWindow, dialog, session } from "electron";
import { winURL, loadingURL, getPreloadFile } from "../config/static-path";
import { useProcessException } from "@main/hooks/exception-hook";
import "./executor";


class MainInit {
  public winURL: string = "";
  public shartURL: string = "";
  public loadWindow: BrowserWindow = null;
  public mainWindow: BrowserWindow = null;
  private childProcessGone = null;

  constructor() {
    const { childProcessGone } = useProcessException();
    this.winURL = winURL;
    this.shartURL = loadingURL;
    this.childProcessGone = childProcessGone;
  }
  // 主窗口函数
  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      title: '开放解释器',
      titleBarStyle: "hidden",
      height: 800,
      useContentSize: true,
      width: 1700,
      minWidth: 1366,
      show: false,
      frame: false,
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
    global.mainWindow = this.mainWindow;

    // 加载主窗口
    this.mainWindow.loadURL(this.winURL);
    this.mainWindow.webContents.on('will-attach-webview', (e, webPreferences) => {
      // webPreferences.webSecurity = false
      // webPreferences.allowRunningInsecureContent = true
      webPreferences.preload = getPreloadFile('webview')
    })

    const ses = session.fromPartition('persist:your-partition');
    // // 清理所有存储数据，包括缓存、Cookies、LocalStorage 等
    // ses.clearStorageData({
    //   storages: ["filesystem", "indexdb", "localstorage", "shadercache", "websql", "serviceworkers", "cachestorage"]
    // }).then(() => {
    //   console.log('所有存储数据已清理');
    // });
    // ses.cookies.set({
    //   url: 'https://chatgpt.com',
    //   name: 'cf_clearance',
    //   value: 'L_v9JpEHQIqc_67rTr3.6I3WjXQhCbX0Ry8CEhEO_4I-1728131342-1.2.1.1-4nuPoUfRrJV9c2wMNH61FVQu1p40XeOECzf8KgZXDyfmmwXfIhdyfV53_UGAPw_ft1uss8ptzgvRedtgK._wM3I6KFOdK894fUxech.JCDlNaOV2L.4N7aUvyymdDNoRdc7twfs3yFzvPgOTanaEaZQ2RCxW7dwpamI.lX5R9t3_QTa6Ah1EYDobucTx8fwiFLRJVLnd5KwKR6w3pgg72vhuVMN0UoJaykWAj2aGC6DzZKxlXQRe_5bouBjnpltDweRo1OxMt7wqWg9whoFgz2Uz4ggrqzkjZLv3hFOYQ2FtgaHYoRVTr7R6yz82Er7H2g.qOncbQQnGb5Zurf_k5P_NU2MYQUW_3_M5fDqm3YDdNbN9J9FPXB4W8UpoTIbEvsyqnp9SUYB4wirHGkMrqkXadXmfSQuAYY.MN9uHXmzxFwlsu3E9djx7hrCSr9Ve' // 将浏览器中的有效 cf_clearance Cookie 值填入
    // }).then(() => {
    //   console.log('Cloudflare clearance cookie 已设置');
    // });

    ses.webRequest.onHeadersReceived((details, callback) => {
      delete details.responseHeaders['content-security-policy']
      callback({ responseHeaders: details.responseHeaders });
    })

    ses.setProxy({
      proxyRules: 'http://127.0.0.1:3001',  // 代理地址
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
    });
  }
  // 加载窗口函数
  loadingWindow(loadingURL: string) {
    this.loadWindow = new BrowserWindow({
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
export default MainInit;
