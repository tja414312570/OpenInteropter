import * as pty from 'node-pty';
import fs from 'fs'
import VirtualWindow from '../plugins/ssh_executor/src/main/virtual-window'
import path from 'path';

let isDebug = true;
export function debug(data: string) {
    return isDebug ? data.replace(/[\x00-\x1F\x7F]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\x${hex}`;
    }) : data;
}
const restoredData = (data: string) => data.replace(/\\x([0-9A-Fa-f]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
});
const virtualWindow = new VirtualWindow;
// 将 PTY 输出发送到前端
let i = 0;
let frame = 0;
const path_ = path.join(__dirname, 'frames.txt')

const data = fs.readFileSync(path_, 'utf-8');
const lines = data.split(/\r?\n/);

let lineCount = 0;
for (const line of lines) {
    lineCount += 1;
    if (lineCount % 4 === 2) {
        // 恢复转义字符并输出原始帧内容
        const restoredLine = restoredData(line);
        // console.log(line)
        // console.log("=========----------------======")
        virtualWindow.write(restoredLine)
        console.log(virtualWindow.render())
        // console.log("===============")
    }
}