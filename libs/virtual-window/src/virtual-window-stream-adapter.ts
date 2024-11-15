import { Writable } from "stream";
import VirtualWindow from "./virtual-window";

export class VirtualTerminalAdapter extends Writable {
    virtualWindow: VirtualWindow;
    isTTY = true;
    constructor(virtualWindow: VirtualWindow) {
        super();
        this.virtualWindow = virtualWindow;
    }
    // 将光标移到指定位置
    // - `x` 和 `y` 均可选，`x` 指定列，`y` 指定行
    cursorTo(x = 0, y = null) {
        if (y === null) {
            // 如果只提供了 x，将光标移到当前行的指定列
            this.virtualWindow.write(`\x1b[${x + 1}G`);
        } else {
            // 如果同时提供了 x 和 y，将光标移到指定位置
            this.virtualWindow.write(`\x1b[${y + 1};${x + 1}H`);
        }
    }

    // 相对移动光标
    // - `dx` 和 `dy` 都是可选的
    // - 允许光标水平和垂直移动
    moveCursor(dx = 0, dy = 0) {
        if (dy < 0) {
            this.virtualWindow.write(`\x1b[${Math.abs(dy)}A`); // 上移
        } else if (dy > 0) {
            this.virtualWindow.write(`\x1b[${dy}B`); // 下移
        }
        if (dx > 0) {
            this.virtualWindow.write(`\x1b[${dx}C`); // 右移
        } else if (dx < 0) {
            this.virtualWindow.write(`\x1b[${Math.abs(dx)}D`); // 左移
        }
    }

    // 清除行内容
    // - `dir` 指定清除方向，默认从光标到行尾
    clearLine(dir = 0) {
        const ansiDir = { 0: "0", 1: "1", 2: "2" }[dir];
        if (ansiDir !== undefined) {
            this.virtualWindow.write(`\x1b[${ansiDir}K`);
        }
    }

    // 清除从光标到屏幕末尾的内容
    clearScreenDown() {
        this.virtualWindow.write(`\x1b[0J`);
    }
    // 写入数据
    _write(chunk: Buffer, encoding: any, callback: () => void) {
        // 将数据直接写入虚拟窗口
        this.virtualWindow.write(chunk.toString());
        callback();
    }
}