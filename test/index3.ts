import VirtualWindow from '../plugins/ssh_executor/src/virtual-window';

let isDebug = true;
function debug(data: string) {
    return isDebug ? data.replace(/[\x00-\x1F\x7F]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\x${hex}`;
    }) : data;
}

function testVirtualWindowWithColors() {
    const vw = new VirtualWindow();

    // 测试1：基本文本渲染
    vw.write('Hello, World!');
    console.log('=== Test 1: Write and render basic text ===');
    console.log(debug(vw.render()));

    // 测试2：加入颜色转义符号
    vw.write('\x1b[31m'); // 红色文本
    vw.write('Red Text');
    vw.write('\x1b[0m');  // 重置颜色
    console.log('=== Test 2: Render text with red color (expect ANSI color codes to be present) ===');
    console.log(debug(vw.render()));

    // 测试3：加入背景颜色和加粗
    vw.write('\x1b[44m'); // 蓝色背景
    vw.write('\x1b[1m');  // 加粗文本
    vw.write('Bold Text on Blue Background');
    vw.write('\x1b[0m');  // 重置所有属性
    console.log('=== Test 3: Render bold text with blue background (expect ANSI style codes to be present) ===');
    console.log(debug(vw.render()));

    // 测试4：复杂样式组合
    vw.write('\x1b[32m\x1b[4m'); // 绿色下划线文本
    vw.write('Green Underlined Text');
    vw.write('\x1b[0m');  // 重置样式
    console.log('=== Test 4: Render green underlined text (expect ANSI underline and color codes) ===');
    console.log(debug(vw.render()));

    // 测试5：背景色和文本色组合
    vw.write('\x1b[43m\x1b[34m'); // 黄色背景，蓝色文本
    vw.write('Blue Text on Yellow Background');
    vw.write('\x1b[0m');  // 重置样式
    console.log('=== Test 5: Render blue text on yellow background (expect ANSI background and text color codes) ===');
    console.log(debug(vw.render()));

    // 测试6：不支持的转义符按原样输出
    vw.write('\x1b[99m'); // 不存在的 ANSI 序列，应该原样保留
    vw.write('Unsupported ANSI Code');
    console.log('=== Test 6: Render unsupported ANSI code (expect unsupported code to be output as-is) ===');
    console.log(debug(vw.render()));
}

testVirtualWindowWithColors();
