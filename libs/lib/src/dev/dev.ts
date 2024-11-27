import fs from 'fs';
import path from 'path';
import { pluginContext } from '../main';
export const watcher = (path_?: string) => {
    const filePath = path_ || path.resolve(__filename);
    function fileChangeHandler(curr: { mtime: any; }, prev: { mtime: any; }) {
        if (curr.mtime !== prev.mtime) {
            console.log(`${filePath} 文件已更新`);
            pluginContext.reload()
            // 在这里可以根据需要取消监视
            fs.unwatchFile(filePath, fileChangeHandler);
            console.log(`已停止监视 ${filePath}`);
        }
    }
    // 开始监视文件
    fs.watchFile(filePath, fileChangeHandler);
    console.log(`正在监视 ${filePath}`);
}
