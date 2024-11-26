import { spawn } from "child_process";
import path from "path";
import VirtualWindow, { debug } from "../libs/virtual-window/src";

const dir = path.join("C:\\Users\\tja41\\AppData\\Roaming\\electron\\plugins\\default.executor.python", "script");
const js_file = path.join(dir, `30e0ed98-a25c-466b-bc55-2b778fcb214f.py`);
const childProcess = spawn("python", [`${js_file}`], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
        PYTHONIOENCODING: "utf-8", // 强制 Python 使用 UTF-8
    }
});

const virtualWindow = new VirtualWindow();
virtualWindow.onRender(content => {
    console.log(debug(content))
})
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
childProcess.stderr?.on("error", (data) => {
    console.log(`子进程输出: ${data}`);
});