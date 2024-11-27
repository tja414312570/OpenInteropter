import { getPreloadFile, getUrl } from "@main/config/static-path";
import { registeMenu } from "./service-menu";
import windowManager from "./window-manager";

const windowId = 'DEFAULT_PROMPT'

export const createWindow = () => {
    let mainWindow = windowManager.getWindow(windowId)
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        return;
    }
    const settingURL = getUrl('prompt');
    mainWindow = windowManager.createWindow(windowId, {
        title: "提示词查看",
        height: 720,
        useContentSize: true,
        width: 960,
        minWidth: 720,
        show: false,
        frame: false,
        webPreferences: {
            preload: getPreloadFile("prompt-ipc"),
        },
    });

    mainWindow.loadURL(settingURL);
    mainWindow.webContents.on('will-attach-webview', (e, webPreferences) => {
        // webPreferences.preload = getPreloadFile('webview')
    })
    mainWindow.once("ready-to-show", () => {
        mainWindow.show();
    })
}

registeMenu({
    label: '提示词',
    key: 'prompt',
    click: () => {
        createWindow();
    }
}, "general")