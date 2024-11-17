import Spinner from "cli-spinners";
import VirtualWindow, { draw } from "../src/index";
const virtualWindow = new VirtualWindow();
virtualWindow.write("hello word\n");

function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}


virtualWindow.onRender(content => {
  process.stdout.write('\x1b[1J\x1b[H' + content + '\n' + JSON.stringify(virtualWindow.getCursor()) + '\n' + debug(content))
})
import { spawn } from 'child_process';
import readline from 'readline';

// 创建子进程
const child = spawn(process.platform === 'win32' ? 'cmd.exe' : 'script', ['-q', '-c', 'sudo ls'], {
  stdio: ['pipe', 'pipe', 'pipe'], // 使用管道处理输入/输出
});

// 监听子进程输出
child.stdout.setEncoding('utf-8')
child.stdout.on('data', (data) => {
  virtualWindow.write(data)
});

// 监听子进程错误输出
child.stderr.setEncoding('utf-8')
child.stderr.on('data', (data) => {
  virtualWindow.write(data)
});

// 监听子进程退出事件
child.on('exit', (code) => {
  console.log(`子进程退出，退出码: ${code}`);
});
child.on('error', (code) => {
  console.log(`子进程错误: ${code}`);
});

// 创建 readline 接口，用于从控制台读取输入
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ', // 设置提示符
});

// 提示用户输入命令
rl.prompt();

// 监听用户输入并将其写入子进程
rl.on('line', (line) => {
  if (line.trim().toLowerCase() === 'exit') {
    console.log('退出进程...');
    child.stdin.end(); // 关闭子进程输入
    rl.close(); // 关闭 readline
    return;
  }
  child.stdin.write(`${line}\n`); // 将用户输入写入子进程
  rl.prompt(); // 再次提示输入
});
