import VirtualWindow, { restore, debug } from "../src/index";
import pc from 'picocolors';

const virtualWindow = new VirtualWindow();
virtualWindow.setCols(15); // 设置窗口宽度为 3 列
// virtualWindow.setRows(5); // 设置窗口高度为 5 行

// 渲染回调：每次内容更新时输出到控制台
virtualWindow.onRender((content) => {
  process.stdout.write(
    '\x1b[2J\x1b[H' + content + '\n' + JSON.stringify(virtualWindow.getCursor()) + '\n' + debug(content) + '我在这')
});

// 初始内容填充
virtualWindow.write(pc.red("1") + "\r\n"); // 红色
virtualWindow.write(pc.green("2") + "\r\n"); // 绿色
virtualWindow.write(pc.yellow("3") + "\r\n"); // 黄色
virtualWindow.write(pc.blue("4") + "\r\n"); // 蓝色
virtualWindow.write(pc.magenta("5")); // 紫色

// virtualWindow.write(pc.red("6") + "\r\n"); // 红色
// virtualWindow.write(pc.green("7") + "\r\n"); // 绿色
// virtualWindow.write(pc.yellow("8") + "\r\n"); // 黄色
// virtualWindow.write(pc.blue("9") + "\r\n"); // 蓝色

// 向上滚动模拟
// console.log("\n--- Scroll Up Test ---\n");
virtualWindow.write(restore("\x1b[1;5r")); // 设置滚动区域为第 1-5 行
virtualWindow.write(restore("\x1b[1;1H")); // 向上滚动 1 行
virtualWindow.write(restore("\x0d\x0a"));
virtualWindow.write(restore("\x1b[1;6r"));
//\x1b[?25l\x1b[1;12r\x1b[1;1H\x1b[7M\x1b[1;13r\x1b[6;1Hdata: {"v": "！"}\x0d\x0a\x0d\x0aevent: delta\x0d\x0adata: {"v": "请"}\x0d\x0a\x0d\x0aevent: delta\x0d\x0adata: {"v": "问"}\x1b[6;1H\x1b[?25h

//\x1b[?25l  \x1b[1;12r \x1b[12;1H \x0d\x0a \x1b[1;13r \x1b[12;1H event: delta \x1b[13;1H \x1b[K \x1b[12;1H \x1b[?25h
virtualWindow.write(pc.cyan("\x1b[5;1Hevent: delta\x0d")); // 青色插入新内容到当前行


virtualWindow.write(restore("\x1b[1;5r")); // 设置滚动区域为第 1-5 行
virtualWindow.write(restore("\x1b[5;1H")); // 向上滚动 1 行
virtualWindow.write(restore("\x0d\x0a"));
virtualWindow.write(restore("\x1b[1;6r"));
//\x1b[?25l  \x1b[1;12r \x1b[12;1H \x0d\x0a \x1b[1;13r \x1b[12;1H event: delta \x1b[13;1H \x1b[K \x1b[12;1H \x1b[?25h
virtualWindow.write(pc.cyan("\x1b[5;1Hevent: delta\x0d"));
// // 向下滚动模拟
// console.log("\n--- Scroll Down Test ---\n");
// virtualWindow.write(restore("\x1b[1;5r")); // 确保滚动区域未变
// virtualWindow.write(restore("\x1b[1T")); // 向下滚动 1 行
// virtualWindow.write(restore("\x1b[1;1H"));
// virtualWindow.write(pc.red("abc")); // 红色插入新内容到当前行

// // 插入行测试
// // console.log("\n--- Insert Line Test ---\n");
// virtualWindow.write(restore("\x1b[1;5r")); // 确保滚动区域未变
// virtualWindow.write(restore("\x1b[3;1H")); // 将光标移动到第 3 行
// virtualWindow.write(restore("\x1b[L")); // 插入一行
// virtualWindow.write(pc.green("mno")); // 绿色插入新内容到插入的行

// // 清屏和重置测试
// // console.log("\n--- Clear and Reset Test ---\n");
// virtualWindow.write(restore("\x1b[2J")); // 清屏
// virtualWindow.write(pc.yellow("reset")); // 黄色插入新内容
// virtualWindow.write("\n" + pc.blue("new")); // 蓝色新的一行
