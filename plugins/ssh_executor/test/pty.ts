import * as pty from "node-pty";
const shell = process.platform === "win32" ? "powershell.exe" : "bash";
import fs from "fs";
import VirtualWindow, { restore } from "virtual-window";
import path from "path";
const params =
  process.platform === "win32"
    ? ["-NoLogo ", "-NonInteractive", "-Command"]
    : ["-c", '"echo Hello, World!"'];
const ptyProcess = pty.spawn(shell, params, {
  name: "xterm-color",
  cwd: process.env.HOME,
  env: process.env,
  cols: 256,
  rows: 256,
});
const virtualWindow = new VirtualWindow();
virtualWindow.setCols(256);
virtualWindow.onRender((content) => {
  process.stdout.write("\x1b[2J\x1b[H 渲染器:\n" + content); //+ '\n' + JSON.stringify(virtualWindow.getCursor()))//+ '\n' + debug(content))
});
ptyProcess.on("data", (data) => {
  virtualWindow.write(data); // 将数据写入虚拟窗口
});

ptyProcess.on("error", (error) => {
  virtualWindow.write(error); // 将数据写入虚拟窗口
  // console.error('Error:', error);
});

ptyProcess.on("exit", (code, signal) => {
  console.log(`Process exited with code: ${code}, signal: ${signal}`);
  ptyProcess.kill();
  console.log("伪终端资源已清理");
});
// ptyProcess.write('clear\r'); // 发送隐藏光标序列
// ptyProcess.write(`npm list\r`);
// ptyProcess.write(restore('\n') + `\n`)
