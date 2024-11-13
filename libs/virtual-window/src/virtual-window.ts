import { Writable } from "stream";

type EscapeSequence = {
  params: string[];
  command: string;
  fullLength: number;
  type: "default" | "dec" | "osc" | "bel" | "sort";
  text: string;
};

function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}
class VirtualTerminalAdapter extends Writable {
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
class DataView {
  private map: Map<number, Map<number, string[]>> = new Map();
  add(x: number, y: number, ansi: string) {
    let xData = this.map.get(x);
    if (!xData) {
      xData = new Map<number, []>();
      xData.set(y, []);
      this.map.set(x, xData);
    }
    let yData = xData.get(y);
    if (!yData) {
      yData = [];
      xData.set(y, yData);
    }
    yData.push(ansi);
  }
  delete(x: number, y?: number) {
    if (y === undefined) {
      this.map.delete(x);
    } else {
      const xData = this.map.get(x);
      if (xData) {
        xData.delete(y);
        if (xData.size === 0) {
          this.map.delete(x); // 删除空的x映射
        }
      }
    }
  }
  // 按行清除 (K 指令)
  deleteRow(x: number, y: number, mode: number) {
    for (const [col, colData] of this.map) {
      const rowData = colData.get(y);
      if (!rowData) continue;
      switch (mode) {
        case 0: // 清除从光标位置到行尾
          if (col >= x) {
            colData.delete(y);
          }
          break;
        case 1: // 清除从行首到光标位置
          if (col <= x) {
            colData.delete(y);
          }
          break;
        case 2: // 清除整行
          colData.delete(y);
          break;
        default:
          break;
      }
      if (colData.size === 0) {
        this.map.delete(col); // 删除空的列
      }
    }
  }
  // 清理空行
  private cleanupEmptyRows() {
    for (const [x, xData] of this.map) {
      if (xData.size === 0) {
        this.map.delete(x);
      }
    }
  }
  // 按行和列清除数据 j指令
  clear(x?: number, y?: number, mode: number = 0) {
    if (x === undefined || y === undefined || mode > 1) {
      // 如果 x 或 y 未定义，清除整个结构
      this.map.clear();
      return;
    }
    switch (mode) {
      case 0: // 清除从光标位置到屏幕底部
        for (const [col, colData] of this.map) {
          const rows = Array.from(colData.keys());
          for (const row of rows) {
            if (row >= y) {
              if (row === y && col >= x) {
                colData.delete(row);
              } else if (row > y) {
                colData.delete(row);
              }
            }
          }
          if (colData.size === 0) {
            this.map.delete(col); // 删除空的列
          }
        }
        break;
      case 1: // 清除从屏幕顶部到光标位置
        for (const [col, colData] of this.map) {
          const rows = Array.from(colData.keys());
          for (const row of rows) {
            if (row <= y) {
              if (row === y && col <= x) {
                colData.delete(row);
              } else if (row < y) {
                colData.delete(row);
              }
            }
          }
          if (colData.size === 0) {
            this.map.delete(col); // 删除空的列
          }
        }
        break;
    }
  }
  get(x: number, y: number) {
    const xData = this.map.get(x);
    if (xData) {
      return xData.get(y);
    }
    return null;
  }
}

class ZDataView {
  private map: Map<number, string[]> = new Map();

  // Z-order 交织编码，将 (x, y) 转换为一个唯一的 z 值
  private encodeZ(x: number, y: number): number {
    let z = 0;
    for (let i = 0; i < 16; i++) {
      z |= ((x >> i) & 1) << (2 * i + 1) | ((y >> i) & 1) << (2 * i);
    }
    return z;
  }

  // 将 Z-order 编码还原为 (x, y) 坐标
  private decodeZ(z: number): [number, number] {
    let x = 0, y = 0;
    for (let i = 0; i < 16; i++) {
      x |= ((z >> (2 * i + 1)) & 1) << i;
      y |= ((z >> (2 * i)) & 1) << i;
    }
    return [x, y];
  }

  add(x: number, y: number, ansi: string) {
    const z = this.encodeZ(x, y);
    if (!this.map.has(z)) {
      this.map.set(z, []);
    }
    this.map.get(z)!.push(ansi);
  }

  delete(x: number, y?: number) {
    if (y === undefined) {
      // 删除所有列与行等于 x 的位置
      for (const key of this.map.keys()) {
        const [decodedX] = this.decodeZ(key);
        if (decodedX === x) this.map.delete(key);
      }
    } else {
      const z = this.encodeZ(x, y);
      this.map.delete(z);
    }
  }

  // 按行清除 (K 指令)
  deleteRow(x: number, y: number, mode: number) {
    for (const key of Array.from(this.map.keys())) {
      const [decodedX, decodedY] = this.decodeZ(key);
      if (decodedY === y) {
        switch (mode) {
          case 0: // 清除从光标位置到行尾
            if (decodedX >= x) this.map.delete(key);
            break;
          case 1: // 清除从行首到光标位置
            if (decodedX <= x) this.map.delete(key);
            break;
          case 2: // 清除整行
            this.map.delete(key);
            break;
        }
      }
    }
  }

  // 按行和列清除数据 j指令
  clear(x?: number, y?: number, mode: number = 0) {
    if (x === undefined || y === undefined || mode > 1) {
      this.map.clear();
      return;
    }
    for (const key of Array.from(this.map.keys())) {
      const [decodedX, decodedY] = this.decodeZ(key);
      switch (mode) {
        case 0: // 清除从光标位置到屏幕底部
          if ((decodedY > y) || (decodedY === y && decodedX >= x)) {
            this.map.delete(key);
          }
          break;
        case 1: // 清除从屏幕顶部到光标位置
          if ((decodedY < y) || (decodedY === y && decodedX <= x)) {
            this.map.delete(key);
          }
          break;
      }
    }
  }

  get(x: number, y: number): string[] | null {
    return this.map.get(this.encodeZ(x, y)) || null;
  }
}
class VirtualWindow {
  private buffer: string[]; // 行缓冲区
  private cursorX: number;
  private cursorY: number;
  private savedCursorX: number;
  private savedCursorY: number;
  private cursorVisible: boolean;
  private bel: boolean;
  private stream: VirtualTerminalAdapter | undefined;
  private debug: boolean = false;
  private ansiBuffer: DataView; // 行缓冲区
  renderCallback: ((content: string) => void | undefined) | undefined;

  constructor() {
    this.buffer = [""]; // 初始化时至少有一行
    this.cursorX = 0;
    this.cursorY = 0;
    this.savedCursorX = 0;
    this.savedCursorY = 0;
    this.cursorVisible = true; // 默认显示光标
    this.bel = false;
    this.ansiBuffer = new DataView();
  }
  onRender(callback: (content: string) => void) {
    this.renderCallback = callback;
  }
  getStream() {
    if (!this.stream) {
      this.stream = new VirtualTerminalAdapter(this);
    }
    return this.stream;
  }
  setDebug(debug: boolean) {
    this.debug = debug;
  }
  i = 0;
  write(text: string): void {
    const i = this.i++;
    // console.log("处理:" + `[${i}]，序列:` + debug(text));
    let remainingText = text;

    while (remainingText) {
      const char = remainingText.charAt(0);
      remainingText = remainingText.slice(1);

      if (char === "\n") {
        this.cursorY++;
        this.cursorX = 0;
        this.ensureLineExists(this.cursorY);
      } else if (char === "\r") {
        this.cursorX = 0; // 回车符重置光标到行首
        this.ansiBuffer.delete(this.cursorX);
      } else if (char === "\x1b") {
        if (remainingText.charAt(0) === "c") {
          remainingText = remainingText.substring(1);
          this.clear();
          this.ansiBuffer.clear();
          continue;
        }
        const seq = this.parseEscapeSequence("\x1b" + remainingText);
        remainingText = remainingText.substring(seq.fullLength - 1);
        if (
          this.handleEscapeSequence(seq) ||
          this.handleStyleEscapeSequence(seq)
        ) {
          // remainingText = remainingText.substring(seq.fullLength - 1);
          // 确保处理过的控制字符不被保留
          if (seq.command === "m") {
            this.ansiBuffer.add(this.cursorX, this.cursorY, seq.text);
          }
        } else {
          if (seq.command)
            if (this.debug) {
              console.log(
                `未识别的控制序列: ${debug(
                  seq ? seq.text : "?" + char + remainingText
                )}`
              );
            }
          this.ansiBuffer.add(this.cursorX, this.cursorY, seq.text);
        }
        continue;
      } else if (char === "\x07") {
        this.bel = true;
      } else if (char === "\x08") {
        this.cursorX > 0 && this.cursorX--;
        this.ansiBuffer.delete(this.cursorX, this.cursorY);
      } else {
        this.addCharToBuffer(char);
      }
    }
    if (this.renderCallback) {
      this.renderCallback(this.render());
    }
  }

  private handleStyleEscapeSequence(seq: EscapeSequence): boolean {
    const command = seq.command;
    const [param1, param2] = seq.params.map((p) => parseInt(p) || 0);
    let support = false;
    switch (command) {
      case "m": // 光标移动到指定位置 (row, col)
        if (param1 === 0) {
          this.ansiBuffer.clear(this.cursorX, this.cursorY);
          support = true;
        }
        break;
    }
    return support;
  }
  private addCharToBuffer(char: string): void {
    this.ensureLineExists(this.cursorY);

    if (this.cursorX < this.buffer[this.cursorY].length) {
      this.buffer[this.cursorY] =
        this.buffer[this.cursorY].substring(0, this.cursorX) +
        char +
        this.buffer[this.cursorY].substring(this.cursorX + 1);
    } else {
      this.buffer[this.cursorY] =
        this.buffer[this.cursorY].padEnd(this.cursorX) + char;
    }
    this.cursorX++;
  }

  private parseEscapeSequence(text: string): EscapeSequence {
    // 尝试匹配标准ANSI控制序列
    // const match = text.match(/^\x1b\[(\d*(;\d*)*)([A-Za-z])/);
    // const match = text.match(/^\x1b[\[\(P\]?[0-9;]*[A-Za-z]/);
    const match = text.match(/^\x1b[\[\(P\]](\?*)([0-9;]*)([A-Za-z])/);
    if (match) {
      return {
        params: match[2].split(";"),
        command: match[3],
        type: match[1] === "?" ? "dec" : "default",
        fullLength: match[0].length,
        text: match[0],
      };
    } else {
      if (text.charAt(1) === "]") {
        throw new Error("osc序列不支持");
      }
      return {
        params: [],
        command: text.charAt(1),
        type: "sort",
        fullLength: 2,
        text: text.substring(0, 2),
      };
    }
  }

  private handleEscapeSequence(seq: EscapeSequence): boolean {
    const command = seq.command;
    const [param1, param2] = seq.params.map((p) => parseInt(p) || 0);
    let support = true;
    switch (command) {
      case "H": // 光标移动到指定位置 (row, col)
      case "f": // 与 'H' 功能相同
        this.cursorY = Math.max(0, param1 - 1);
        this.ensureLineExists(this.cursorY);
        this.cursorX = Math.max(0, param2 - 1);
        this.ensureLineLength(this.cursorY, this.cursorX);
        break;
      case "A": // 光标上移
        this.cursorY = Math.max(0, this.cursorY - (param1 ? param1 : 1));
        this.ensureLineExists(this.cursorY);
        break;
      case "B": // 光标下移
        this.cursorY = this.cursorY + (param1 ? param1 : 1);
        this.ensureLineExists(this.cursorY);
        break;
      case "C": // 光标右移
        this.cursorX = this.cursorX + (param1 ? param1 : 1);
        this.ensureLineLength(this.cursorY, this.cursorX);
        break;
      case "D": // 光标左移
        this.ansiBuffer.delete(this.cursorX, this.cursorY);
        this.cursorX = Math.max(0, this.cursorX - (param1 ? param1 : 1));
        break;
      case "G": // 光标移到当前行的指定列
        this.cursorX = param1 - 1;
        this.ensureLineLength(this.cursorY, this.cursorX);
        break;
      case "s": // 保存光标位置
        this.savedCursorX = this.cursorX;
        this.savedCursorY = this.cursorY;
        break;
      case "u": // 恢复光标位置
        this.cursorY = Math.max(
          0,
          Math.min(this.savedCursorY, this.buffer.length - 1)
        );
        this.cursorX = Math.max(
          0,
          Math.min(this.savedCursorX, this.buffer[this.cursorY].length)
        );
        this.ensureLineExists(this.cursorY);
        this.ensureLineLength(this.cursorY, this.cursorX);
        break;
      case "J": // 清屏
        this.ansiBuffer.clear(this.cursorX, this.cursorY, param1);
        if (param1 === 0) {
          // 清除光标到屏幕末尾
          this.ensureLineExists(this.cursorY);

          this.buffer[this.cursorY] = this.buffer[this.cursorY].substring(
            0,
            this.cursorX
          );
          for (let i = this.cursorY + 1; i < this.buffer.length; i++) {
            this.buffer[i] = "";
          }
        } else if (param1 === 1) {
          // 清除屏幕开头到光标
          for (let i = 0; i < this.cursorY; i++) {
            this.buffer[i] = "";
          }
          this.buffer[this.cursorY] = "".padEnd(this.cursorX, " ");
        } else if (param1 === 2) {
          // 没有屏幕的功能，目前清除所有
          this.clear();
        } else if (param1 === 3) {
          // 清除整个屏幕并重置光标位置
          this.clear();
        }
        break;
      case "K": // 清除当前行光标后的内容
        this.ansiBuffer.deleteRow(this.cursorX, this.cursorY, param1);
        this.ensureLineExists(this.cursorY);
        if (param1 === 0) {
          // 清除从光标到行尾
          this.buffer[this.cursorY] = this.buffer[this.cursorY].substring(
            0,
            this.cursorX
          );
        } else if (param1 === 1) {
          // 清除从行首到光标
          this.buffer[this.cursorY] = "".padEnd(this.cursorX, " ");
        } else if (param1 === 2) {
          // 清除整行
          this.buffer[this.cursorY] = "";
        }
        break;
      case "h": // 设置模式 (例如 ?25h 显示光标)
        if (parseInt(seq.params[0]) === 25) {
          this.cursorVisible = true;
        } else {
          support = false;
        }
        break;
      case "l": // 重置模式 (例如 ?25l 隐藏光标)
        if (parseInt(seq.params[0]) === 25) {
          this.cursorVisible = false;
        } else {
          support = false;
        }
        break;
      default:
        support = false;
        break;
    }

    // 确保光标位置与缓冲区行的长度一致
    this.ensureLineLength(this.cursorY, this.cursorX);
    return support;
  }

  render(): string {
    let y = 0;
    let result = "";
    for (const line of this.buffer) {
      let x = 0;
      for (const char of line) {
        const ansi = this.ansiBuffer.get(x, y);
        if (ansi) {
          const ansiString = ansi.join("");
          result += ansiString;
        }
        result += char;
        x++;
      }
      const ansi = this.ansiBuffer.get(x, y);
      if (ansi) {
        const ansiString = ansi.join("");
        result += ansiString;
      }
      y++;
      result += "\n";
    }
    return result;
  }
  // render():string{
  //   const renderedBuffer = this.buffer.join("\n");
  //   // const cursorState = `[Cursor Visible: ${this.cursorVisible}, Cursor Position: (${this.cursorY + 1}, ${this.cursorX + 1})]`;
  //   // const belState = `[BEL:${this.bel}]`;
  //   if (this.bel) {
  //     this.bel = false;
  //   }
  //   const content = `${renderedBuffer}`;
  //   if (this.renderCallback) {
  //     this.renderCallback(content);
  //   }
  //   return content;
  // }

  private ensureLineExists(lineIndex: number): void {
    while (this.buffer.length <= lineIndex) {
      this.buffer.push("");
    }
  }

  private ensureLineLength(lineIndex: number, minLength: number): void {
    if (this.buffer[lineIndex].length < minLength) {
      this.buffer[lineIndex] = this.buffer[lineIndex].padEnd(minLength, " ");
    }
  }

  clear(): void {
    this.ansiBuffer.clear();
    this.buffer = [""]; // 清空屏幕内容，只留一行
    this.cursorX = 0; // 重置光标到屏幕左上角
    this.cursorY = 0;
  }
}

export default VirtualWindow;