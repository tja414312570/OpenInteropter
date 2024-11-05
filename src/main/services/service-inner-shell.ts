import { send_ipc_render } from "@main/ipc/send_ipc";
import { app, ipcMain } from "electron";
import * as pty from 'node-pty';
import resourceManager from "@main/plugin/resource-manager";
import settingManager from "./service-setting";
import path from "path";
import appContext from "./app-context";
let isinit = false;
function init() {
    console.log(new Error(isinit + ''))
    if (isinit) {
        console.log("已经初始化")
        throw new Error("已经初始化")
    }
    isinit = true;
    const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'PATH';
    const env = {
        ...process.env,
        [pathKey]: `${appContext.envPath.replaceAll(' ', '\\ ')}${path.delimiter}${process.env[pathKey]}`
    };
    console.log("环境变量:", JSON.stringify(env, null, 2))
    try {
        // 创建 PTY 实例
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        console.log("启动shell:", shell);
        const _user_data = app.getPath('userData')
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env
        });
        resourceManager.put('pty', ptyProcess)
        // 监听输入事件
        ipcMain.on('pty.terminal-input', (event, input) => {
            ptyProcess.write(input);
        });
        // 监听终端数据输出
        ptyProcess.onData((data) => {
            send_ipc_render('pty.terminal-output', data);
        });

        ipcMain.on('pty.terminal-into', (event, data) => {
            ptyProcess.write(data);
        });

        // 调整终端大小
        ipcMain.on('pty.terminal-resize', (event, cols, rows) => {
            if (cols > 0 && rows > 0) {
                ptyProcess.resize(cols, rows);
            } else {
                console.warn('Invalid terminal size:', cols, rows);
            }
        });
    } catch (error) {
        console.error("Error initializing PTY:", error);
    }
}
export { init }