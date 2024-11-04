import { exec } from 'child_process';
import { keyboard, Key } from '@nut-tree/nut-js';

(async () => {
    // 打开 QQ 音乐（确保路径或名称正确）
    exec('open -a "/Applications/QQMusic.app"', (error) => {
        if (error) {
            console.error(`Error opening QQ Music: ${error}`);
            return;
        }
    });

    // 等待应用加载
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 输入刘德华并提交搜索
    await keyboard.type('刘德华');
    await keyboard.pressKey(Key.Enter); // 提交搜索
})();
