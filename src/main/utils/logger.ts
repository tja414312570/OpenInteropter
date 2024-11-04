import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';


// 获取当前文件的路径
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// 日志文件路径
const logFilePath = path.join(__dirname, 'proxy_logs.txt');

// 写日志到文件的辅助函数
export function info(data) {
  // console.log(data)
  fs.appendFile(logFilePath, data + '\n', (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}
