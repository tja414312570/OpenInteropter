import * as pty from 'node-pty';
const shell = process.platform === 'win32' ? 'powershell.exe' : 'zsh';
import fs from 'fs'
import VirtualWindow from '../plugins/ssh_executor/src/main/virtual-window'
import path from 'path';

let isDebug = true;
const restoredData = (data: string) => data.replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
});
export function debug(data: string) {
    return isDebug ? data.replace(/[\x00-\x1F\x7F]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\x${hex}`;
    }) : data;
}
const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cwd: process.env.HOME,
    env: process.env,
    cols: 219,
    rows: 23,
});
const virtualWindow = new VirtualWindow;
// (async () => {
//     for (let i = 1; i <= 100; i++) {
//         virtualWindow.write(`\rProgress: ${i}%`);
//         console.log("=============================================")
//         console.log(virtualWindow.render());
//         await sleep(100); // 模拟延迟
//     }
// })()
// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// 将 PTY 输出发送到前端
let i = 0;
let frame = 0;
const path_ = path.join(__dirname, 'frames.txt')
ptyProcess.on('data', (data) => {
    virtualWindow.write(data); // 将数据写入虚拟窗口
    // console.clear()
    i++;
    console.log("----------------------------原始帧数据:" + i)
    console.log(debug(data))
    const output = virtualWindow.render();
    console.log("=============================虚拟窗口状态:" + i)
    // console.log(output)
    console.log(debug(output).replace(/\\x0a/g, '\n'))
    console.log('\n')
    //     fs.appendFileSync(path_, "\r\n=========================原始帧【" + (++frame) + '\r\n')
    //     fs.appendFileSync(path_, debug(data), 'utf-8')
    //     fs.appendFileSync(path_, "\r\n-------------------------渲染帧【" + (frame) + '\r\n')
    //     fs.appendFileSync(path_, debug(output), 'utf-8')
});

ptyProcess.on('error', (error) => {
    virtualWindow.write(error); // 将数据写入虚拟窗口
    console.error('Error:', error);
});

ptyProcess.on('exit', (code, signal) => {
    console.log(`Process exited with code: ${code}, signal: ${signal}`);
});
// ptyProcess.write('clear\r'); // 发送隐藏光标序列
ptyProcess.write('$max=3;for($i=0;$i-le $max;$i++){$p=($i/$max)*100;Write-Progress -Activity "正在处理数据..." -Status "$i% 完成" -PercentComplete $p;Start-Sleep -Milliseconds 100} ; echo "_5c784b30-58df-4cd7-9a8c-5308607f8b6a_$?"');
ptyProcess.write('\r')
// ptyProcess.write('try { $max=1;for($i=0;$i-le $max;$i++){$p=($i/$max)*100;Write-Progress -Activity "正在处理数据..." -Status "$i% 完成" -PercentComplete $p;Start-Sleep -Milliseconds 100} } catch { Write-Error $_.Exception.Message ;$_.ErrorRecord } finally {Write-Progress -Activity " " -Status " " -Completed; Write-Host "_57780437-7654-4a53-9bab-b91f9efe991a_$?" }\r')
// ptyProcess.write('ls ;for i in {1..100}; do printf "\\rProgress: %d%%" "$i"; sleep 0.1; done; echo "done";clear\n');
// ptyProcess.write('$max=3;for($i=0;$i-le $max;$i++){$p=($i/$max)*100;Write-Progress -Activity "正在处理数据..." -Status "$i% 完成" -PercentComplete $p;Start-Sleep -Milliseconds 500}\r');