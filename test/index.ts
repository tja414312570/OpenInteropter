import VirtualWindow from '../plugins/ssh_executor/src/virtual-window';

let isDebug = false;
export function debug(data: string) {
    return isDebug ? data.replace(/[\x00-\x1F\x7F]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\x${hex}`;
    }) : data;
}

function testVirtualWindow() {
    const vw = new VirtualWindow();

    // 测试1：写入基础文本
    vw.write('Hello, World!');
    console.log('=== Test 1: Write and render basic text ===');
    console.log(debug(vw.render()));

    // 测试2：移动光标
    vw.write('\x1b[2;5H'); // 移动到第2行，第5列
    vw.write('X');
    console.log('=== Test 2: Move cursor to row 2, column 5 and add "X" ===');
    console.log(debug(vw.render()));

    // 测试3：清除光标所在行的内容
    vw.write('\x1b[2K'); // 清除当前行
    console.log('=== Test 3: Clear line where cursor is located (row 2) ===');
    console.log(debug(vw.render()));

    // 测试4：移动光标并添加文本
    vw.write('\x1b[3;1H'); // 移动到第3行，第1列
    vw.write('More Text');
    console.log('=== Test 4: Move cursor to row 3, column 1 and add "More Text" ===');
    console.log(debug(vw.render()));

    // 测试5：清除屏幕
    vw.write('\x1b[2J'); // 清除整个屏幕
    console.log('=== Test 5: Clear entire screen ===');
    console.log(debug(vw.render()));

    // 测试6：保存和恢复光标位置
    vw.write('Text at position (1, 1)');
    vw.write('\x1b[s'); // 保存光标位置
    vw.write('\x1b[5;10H'); // 移动光标到第5行，第10列
    vw.write('Inserted at (5, 10)');
    vw.write('\x1b[u'); // 恢复光标位置
    vw.write(' Restored text');
    console.log('=== Test 6: Save and restore cursor position ===');
    console.log(debug(vw.render()));

    // 测试7：隐藏光标
    vw.write('\x1b[?25l'); // 隐藏光标
    console.log('=== Test 7: Hide cursor ===');
    console.log(debug(vw.render()));

    // 测试8：显示光标
    vw.write('\x1b[?25h'); // 显示光标
    console.log('=== Test 8: Show cursor ===');
    console.log(debug(vw.render()));

    // 扩展测试9：光标向上移动
    vw.write('\x1b[A'); // 光标向上移动1行
    vw.write(' Up one line');
    console.log('=== Test 9: Cursor move up one line ===');
    console.log(debug(vw.render()));

    // 扩展测试10：光标向右移动
    vw.write('\x1b[C'); // 光标向右移动1列
    vw.write(' Right one column');
    console.log('=== Test 10: Cursor move right one column ===');
    console.log(debug(vw.render()));

    // 扩展测试11：清除光标到行尾
    vw.write('\x1b[K'); // 清除当前行光标后的内容
    console.log('=== Test 11: Clear from cursor to end of line ===');
    console.log(debug(vw.render()));

    // 扩展测试12：光标移到当前行的指定列
    vw.write('\x1b[G'); // 光标移到当前行的指定列，默认1
    console.log('=== Test 12: Move cursor to specified column (1) ===');
    console.log(debug(vw.render()));

    // 扩展测试13：光标向下移动
    vw.write('\x1b[B'); // 光标向下移动1行
    vw.write(' Down one line');
    console.log('=== Test 13: Cursor move down one line ===');
    console.log(debug(vw.render()));

    // 扩展测试14：清除屏幕开头到光标
    vw.write('\x1b[1J'); // 清除屏幕开头到光标
    console.log('=== Test 14: Clear screen from beginning to cursor ===');
    console.log(debug(vw.render()));
}

testVirtualWindow();
