import VirtualWindow, { restore } from "../src/index";

const virtualWindow = new VirtualWindow();
virtualWindow.setCols(3); // 设置窗口宽度为 3 列
// virtualWindow.setRows(5); // 设置窗口高度为 5 行

// 渲染回调：每次内容更新时输出到控制台
virtualWindow.onRender((content) => {
  process.stdout.write(
    '\x1b[1J\x1b[H' + content + '\n' + JSON.stringify(virtualWindow.getCursor())
  );
});

// 初始内容填充
virtualWindow.write("123");
virtualWindow.write("\n456");
virtualWindow.write("\n789");
virtualWindow.write("\nabc");
virtualWindow.write("\ndef");

// 向上滚动模拟
console.log("\n--- Scroll Up Test ---\n");
virtualWindow.write(restore("\x1b[1;5r")); // 设置滚动区域为第 1-5 行
virtualWindow.write(restore("\x1b[S")); // 向上滚动 1 行
virtualWindow.write("ghi"); // 插入新内容到当前行

// 向下滚动模拟
console.log("\n--- Scroll Down Test ---\n");
virtualWindow.write(restore("\x1b[1;5r")); // 确保滚动区域未变
virtualWindow.write(restore("\x1b[T")); // 向下滚动 1 行
virtualWindow.write("jkl"); // 插入新内容到当前行

// 插入行测试
console.log("\n--- Insert Line Test ---\n");
virtualWindow.write(restore("\x1b[1;5r")); // 确保滚动区域未变
virtualWindow.write(restore("\x1b[3;1H")); // 将光标移动到第 3 行
virtualWindow.write(restore("\x1b[L")); // 插入一行
virtualWindow.write("mno"); // 插入新内容到插入的行

// 清屏和重置测试
console.log("\n--- Clear and Reset Test ---\n");
virtualWindow.write(restore("\x1b[2J")); // 清屏
virtualWindow.write("reset"); // 插入新内容
virtualWindow.write("\nnew"); // 新的一行
