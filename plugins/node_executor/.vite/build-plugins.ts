import { execSync } from 'child_process';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

// 获取命令行参数
const args = process.argv.slice(2);
const npmCommand = args.length > 0 ? args.join(' ') : 'run build'; // 默认命令为 run build

const pluginsDir = join(__dirname, '../plugins');

// 读取插件目录
const plugins = readdirSync(pluginsDir);

// 遍历插件目录并运行指定命令
plugins.forEach((plugin) => {
    const pluginPath = join(pluginsDir, plugin);
    const packageJsonPath = join(pluginPath, 'package.json');

    // 检查 package.json 是否存在
    if (existsSync(packageJsonPath)) {
        console.log(`Running "npm ${npmCommand}" for plugin: ${plugin}`);
        try {
            // 在插件目录运行指定的 npm 命令
            execSync(`npm ${npmCommand}`, { cwd: pluginPath, stdio: 'inherit' });
        } catch (error) {
            console.error(`Failed to run "${npmCommand}" for plugin: ${plugin}`, error);
        }
    } else {
        console.log(`Skipping ${plugin}, no package.json found.`);
    }
});
