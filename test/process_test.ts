import { spawn } from "cross-spawn";
import path from "path";
import VirtualWindow, { debug } from "../libs/virtual-window/src";

const dir = path.join("C:\\Users\\tja41\\AppData\\Roaming\\electron\\plugins\\default.executor.python", "script");
const js_file = path.join(dir, `30e0ed98-a25c-466b-bc55-2b778fcb214f.py`);
const virtualWindow = new VirtualWindow();
virtualWindow.onRender(content => {
    console.log(debug(content))
})
const childProcess = spawn("npm", ["i cross-spawn"], {//[`${js_file}`],
    stdio: ["pipe", "pipe", "pipe"],
    shell: true,
    env: {
        ...process.env,
        TERM: 'xterm-256color',
        FORCE_COLOR: '1', // 强制启用颜色输出
        PYTHONIOENCODING: "utf-8", // 强制 Python 使用 UTF-8
    }
});

childProcess.stdout?.setEncoding("utf8");
childProcess.stdout?.on("data", (data) => {
    virtualWindow.write(data);
    console.log(`子进程输出: ${data}`);
});
childProcess.stdout?.on("error", (data) => {
    console.log(`子进程输出: ${data}`);
});
childProcess.stderr?.setEncoding("utf8");
childProcess.stderr?.on("data", (data) => {
    virtualWindow.write(data);
    console.error(`子进程错误: `, data);
});
childProcess.on("exit", (code) => {
    console.error(`子进程退出: `, code);
})
childProcess.stderr?.on("error", (data) => {
    console.log(`子进程输出: ${data}`);
});