import { BrowserWindow, ipcMain } from "electron";

// 最大化窗口
ipcMain.handle('ipc-core.window.maximize', (event, opts: Electron.MessageBoxOptions) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.maximize();
    }
});

// 最小化窗口
ipcMain.handle('ipc-core.window.minimize', (event, opts: Electron.MessageBoxOptions) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.minimize();
    }
});

// 还原窗口（恢复为默认大小）
ipcMain.handle('ipc-core.window.restore', (event, opts: Electron.MessageBoxOptions) => {
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
ipcMain.handle('ipc-core.window.close', (event, opts: Electron.MessageBoxOptions) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
        window.close();
    }
});
// 判断窗口是否最大化
ipcMain.handle('ipc-core.window.isMaximized', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMaximized() : false;
});

// 判断窗口是否最小化
ipcMain.handle('ipc-core.window.isMinimized', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isMinimized() : false;
});

// 判断窗口是否全屏
ipcMain.handle('ipc-core.window.isFullScreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.isFullScreen() : false;
});

ipcMain.handle('ipc-core.window.title', (event, id: string) => {
    const currentWindow = BrowserWindow.fromWebContents(event.sender);
    return currentWindow.title;
});