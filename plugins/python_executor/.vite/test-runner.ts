import minimist from 'minimist';
import { execSync } from 'child_process';
import { sync as globSync } from 'glob';  // 直接导入 sync 函数
import path from 'path';

// 获取命令行参数
const args = minimist(process.argv.slice(2));
const testFile = args._[0];  // 获取第一个非命令选项参数，假设它是测试文件路径

// 定义一个运行测试的函数
const runTest = (file: string) => {
    const ts_file = path.join('./test/', file)
    console.log(`Running tests in file: ${ts_file}`);
    execSync(`tsx ${ts_file}`, { stdio: 'inherit' });
};

// 同步执行测试文件
const runAllTests = () => {
    try {
        const files = globSync('./test/**/*.ts');  // 使用 globSync 同步获取文件
        if (files.length === 0) {
            console.log('No test files found.');
            return;
        }

        // 遍历找到的文件，逐个运行
        files.forEach((file) => {
            runTest(file);
        });
    } catch (err) {
        console.error('Error finding test files:', err);
        process.exit(1);
    }
};

// 如果提供了文件路径，运行指定的文件，否则运行所有测试
if (testFile) {
    runTest(testFile);
} else {
    console.log('Running all tests in ./test directory');
    runAllTests();
}
