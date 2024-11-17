import { app } from "electron";
import * as pty from 'node-pty';
import resourceManager from "@main/plugin/resource-manager";
import path from "path";
import appContext from "./app-context";
import { getIpcApi } from "@main/ipc/ipc-wrapper";
import envManager from "./env-manager";
import { platform } from "os";
import settingManager from "./service-setting";
import { buildProxy, Proxy } from "./global-agents";
import { debug } from '../../../libs/virtual-window/src/index'
const api = getIpcApi('pty')
let isinit = false;
function init() {
    console.log(new Error(isinit + ''))
    if (isinit) {
        console.log("已经初始化")
        throw new Error("已经初始化")
    }
    isinit = true;
    ;
    console.log("环境变量:", JSON.stringify(appContext.env, null, 2))
    try {
        // 创建 PTY 实例
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        console.log("启动shell:", shell);
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.env.HOME,
            env: appContext.env
        });
        resourceManager.put('pty', ptyProcess)
        // 监听输入事件
        api.on('terminal-input', (event, input) => {
            ptyProcess.write(input);
        });
        // 监听终端数据输出
        ptyProcess.onData((data) => {
            console.log('==>', debug(data))
            api.send('terminal-output', data);
        });
        (ptyProcess as any).getCursor = () => {
            return new Promise<{ x: Number, y: number }>((resolve, reject) => {
                try {
                    const TIMEOUT = 1000;
                    const timeout = setTimeout(() => {
                        reject(new Error('获取光标位置超时'));
                    }, TIMEOUT);
                    api.on('cursorX', (_event, cursor) => {
                        clearTimeout(timeout); // 在接收到事件后清除超时
                        resolve(cursor);
                    });
                    api.send('cursorX');
                } catch (err) {
                    reject(err)
                }
            });
        }
        const setProxy = (proxy: Proxy) => {
            const url = proxy.http || proxy.https
            let cmd: string;
            if (platform() === 'win32') {
                cmd = url
                    ? `
                    $env:https_proxy = "${url}"
                    $env:http_proxy = "${url}"
                    `
                    : `
                    Remove-Item Env:https_proxy -ErrorAction SilentlyContinue
                    Remove-Item Env:http_proxy -ErrorAction SilentlyContinue
                    `;
            } else {
                cmd = url
                    ? `
                    export https_proxy=${url} http_proxy=${url}
                    `
                    : `
                    unset https_proxy http_proxy
                    `;
            }

            ptyProcess.write(cmd + '\n')
        }
        settingManager.onValueChange('network.proxy', (value) => {
            const proxy = buildProxy(value);
            setProxy(proxy)
        })
        const clearEnv = () => {
            if (process.platform === 'win32') {
                ptyProcess.write(`Get-ChildItem env: | ForEach-Object { Remove-Item env:\\$_ }\n`);
            } else {
                ptyProcess.write('unset $(compgen -v)\n'); // 使用 `unset` 清除所有环境变量
            }
        }
        envManager.on('change', () => {
            const envs = envManager.getEnv();
            // clearEnv();
            for (const key in envs) {
                const value = envs[key];
                if (process.platform === 'win32') {
                    ptyProcess.write(`[Environment]::SetEnvironmentVariable('${key}', '${value}', 'Process')\n`);
                } else {
                    ptyProcess.write(`export ${key}="${value}"\n`);
                }
            }
        })
        api.on('terminal-into', (event, data) => {
            ptyProcess.write(data);
        });

        // 调整终端大小
        api.on('terminal-resize', (event, cols, rows) => {
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