import VirtualWindow from '../plugins/ssh_executor/src/virtual-window';

let isDebug = false;
function debug(data: string) {
    return isDebug ? data.replace(/[\x00-\x1F\x7F]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\x${hex}`;
    }) : data;
}


function testVirtualWindow() {
    const vw = new VirtualWindow();

    // 测试1：基础测试案例 (保持不变)
    vw.write('Hello, World!');
    console.log('=== Test 1: Write and render basic text ===');
    console.log(debug(vw.render()));

    // 测试2：进度条模拟
    console.log('=== Test 2: Progress bar simulation ===');
    vw.write('\x1b[2J'); // 清屏
    vw.write('Progress: [          ]'); // 初始化进度条框架

    // 模拟进度条更新三次：25%、50%、100%
    const progressStages = [0.25, 0.5, 1.0];
    for (let i = 0; i < progressStages.length; i++) {
        vw.write(`\x1b[1;11H`); // 移动光标到进度条内部
        const fillLength = Math.floor(10 * progressStages[i]); // 根据阶段填充
        vw.write('='.repeat(fillLength));
        console.log(debug(vw.render())); // 渲染进度条更新
    }

    // 测试3：旋转符号动画
    console.log('=== Test 3: Loading spinner animation ===');
    vw.write('\x1b[2J'); // 清屏
    vw.write('Loading: '); // 初始化加载提示符
    const spinnerSymbols = ['|', '/', '-', '\\']; // 动画符号
    const spinnerStages = 6; // 动画循环次数

    for (let i = 0; i < spinnerStages; i++) {
        vw.write(`\x1b[1;9H`); // 移动光标到 "Loading:" 之后的位置
        vw.write(spinnerSymbols[i % spinnerSymbols.length]); // 显示动画符号
        console.log(debug(vw.render())); // 渲染动画
    }

    // 测试4：模拟命令行的操作符号和延迟
    console.log('=== Test 4: Simulate command line prompts and delay ===');
    vw.write('\x1b[2J'); // 清屏
    vw.write('Command: Processing...'); // 初始命令行状态
    console.log(debug(vw.render()));

    // 模拟处理完成后的反馈
    setTimeout(() => {
        vw.write('\x1b[1;1H'); // 光标移动到起始位置
        vw.write('Command: Done!       '); // 显示 "完成" 状态
        console.log(debug(vw.render())); // 渲染最终状态
    }, 1000); // 延迟模拟
}

testVirtualWindow();
