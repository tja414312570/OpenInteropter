import { IBrowserWindowOptions } from "@lib/main";
import { getIpcApi } from "@main/ipc/ipc-wrapper";
import { BrowserWindow } from "electron";

const api = getIpcApi('ipc-core')
// 最大化窗口
api.handle('window.maximize', (event, opts: Electron.MessageBoxOptions) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.maximize();
    }
});

// 最小化窗口
api.handle('window.minimize', (event, opts: Electron.MessageBoxOptions) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.minimize();
    }
});

// 还原窗口（恢复为默认大小）
api.handle('window.restore', (event, opts: Electron.MessageBoxOptions) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        if (window.isMaximized()) {
            window.unmaximize();
        } else {
            window.restore();
        }
    }
});

// 关闭窗口
api.handle('window.close', (event, opts: Electron.MessageBoxOptions) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.close();
    }
});
// 判断窗口是否最大化
api.handle('window.status', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return {
        status: window.isMinimized() ? '0' : window.isMaximized() ? '2' : '1',
        btn: [window.isMinimizable(), window.isResizable(), window.isClosable()]
    };
});
// 判断窗口是否最小化
api.handle('window.isMinimized', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMinimized() : false;
});

// 判断窗口是否全屏
api.handle('window.isFullScreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isFullScreen() : false;
});

api.handle('window.title', (event, id: string) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    return currentWindow.title;
});