import * as pty from 'node-pty';
const shell = process.platform === 'win32' ? 'powershell.exe' : 'zsh';
import fs from 'fs'
import VirtualWindow, { restore } from '../libs/virtual-window/src/index'
import path from 'path';
const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cwd: process.env.HOME,
    env: process.env,
    cols: 219,
    rows: 23,
});
const virtualWindow = new VirtualWindow;
virtualWindow.setCols(120)
virtualWindow.onRender(content => {
    process.stdout.write('\x1b[1J\x1b[H' + content)//+ '\n' + JSON.stringify(virtualWindow.getCursor()))//+ '\n' + debug(content))
})
ptyProcess.on('data', (data) => {
    virtualWindow.write(data); // 将数据写入虚拟窗口
});

ptyProcess.on('error', (error) => {
    virtualWindow.write(error); // 将数据写入虚拟窗口
    console.error('Error:', error);
});

ptyProcess.on('exit', (code, signal) => {
    console.log(`Process exited with code: ${code}, signal: ${signal}`);
});
// ptyProcess.write('clear\r'); // 发送隐藏光标序列
ptyProcess.write(`try { \`
    vim \"C:\\Users\\tja41\\Desktop\\test.txt\" \`
    } catch {\`
          Write-Error $_.Exception.Message ;$_.ErrorRecord \`
    } finally { Write-Host \"_07698a6d-9b50-4ef6-a1d9-8e5f755fd46f_$?\" }`);
// ptyProcess.write(restore('\n') + `\n`)