import { VirtualTerminalAdapter } from './virtual-window-stream-adapter'
import { DataView } from "./ansi-data-view";
import { WindowGroup } from "./virtual-window-group";
//@ts-ignore
import stringWidth from 'string-width';

type EscapeSequence = {
  params: string[];
  command: string;
  fullLength: number;
  type: "default" | "dec" | "osc" | "bel" | "sort";
  text: string;
};
export function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}
export function restore(data: string) {
  return data.replace(/\\x([0-9a-fA-F]{2})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
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
  private ansiBuffer: DataView; // ansi缓冲区
  private renderCache: string | undefined;
  private _destory: boolean;
  private _group: WindowGroup | undefined;
  private _close: boolean = false;
  private cols: number = -1;
  private rows: number = -1;
  renderCallback: ((content: string) => void | undefined) | undefined;
  private _creator: Error;
  private scrollTop: number | undefined;
  private scrollBottom: number | undefined;
  setCols(cols: number) {
    this.cols = cols;
  }
  destory() {
    this.close();
    if (this._destory) {
      this._clear()
      this._destory = true;
    }
  }
  isClose() {
    return this._close;
  }
  close() {
    this._close = true;
  }
  isDestory() {
    return this._destory
  }
  private _checkStatus() {
    if (this.isDestory()) {
      throw new Error('当前窗口已被销毁', { cause: this._creator })
    }
    if (this.isClose()) {
      throw new Error('当前窗口已被关闭', { cause: this._creator })
    }
  }
  getWindowGroup() {
    this._checkStatus()
    if (this._group && !this._group.isClose) {
      throw new Error('一个组正在被使用中', { cause: this._group.getCreator() })
    } else {
      this._group = new WindowGroup(this);
      return this._group;
    }
  }
  constructor(callback?: (content: string) => void) {
    this._creator = new Error('Creator Recoder');
    this._destory = false;
    this.buffer = [""]; // 初始化时至少有一行
    this.cursorX = 0;
    this.cursorY = 0;
    this.savedCursorX = 0;
    this.savedCursorY = 0;
    this.cursorVisible = true; // 默认显示光标
    this.bel = false;
    this.ansiBuffer = new DataView();
    this.renderCallback = callback;
  }
  onRender(callback: (content: string) => void) {
    this.renderCallback = callback;
  }
  getCursor() {
    return { x: this.cursorX, y: this.cursorY, visible: this.cursorVisible }
  }
  getStream() {
    this._checkStatus()
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
    this._checkStatus()
    const i = this.i++;
    // console.log("处理:" + `[${i}]，序列:` + debug(text));
    if (text.length > 0) {
      this.renderCache = undefined;
    }
    let remainingText = text;
    while (remainingText) {
      const char = remainingText.charAt(0);
      remainingText = remainingText.slice(1);
      if (char === "\n") {
        if (this.scrollBottom && this.cursorY >= this.scrollBottom) {
          this.scrollUp(1);
        }
        this.cursorY++;
        this.cursorX = 0;
        this.ensureLineLength(this.cursorY, this.cursorX);
      } else if (char === "\r") {
        this.cursorX = 0; // 回车符重置光标到行首
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
            this.ansiBuffer.add(this.cursorY, this.cursorX, seq.text);
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
          this.ansiBuffer.add(this.cursorY, this.cursorX, seq.text);
        }
        continue;
      } else if (char === "\x07") {
        this.bel = true;
      } else if (char === "\x08") {
        this.cursorX > 0 && this.cursorX--;
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
          this.ansiBuffer.reset(this.cursorY, this.cursorX);
          support = true;
        }
        break;
    }
    return support;
  }
  private addCharToBuffer(char: string): void {
    const chWidth = stringWidth(char)
    if (this.cols > 0 && stringWidth(this.buffer[this.cursorY]) + chWidth > this.cols) {
      this.cursorY++;
      this.cursorX = 0;
    }
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

        this.ensureLineLength(this.cursorY, this.cursorX);
        break;
      case "J": // 清屏
        this.ansiBuffer.clearJ(this.cursorY, this.cursorX, param1);
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
        this.ansiBuffer.clearK(this.cursorY, this.cursorX, param1);
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
      case "L":
        const line = param1 || 1;
        const LSaveTop = this.scrollTop;
        this.scrollTop = this.cursorY;
        if (this.scrollBottom) {
          this.scrollDown(line)
        }
        this.scrollTop = LSaveTop;
        break;
      case "M":
        const deleteLine = param1 || 1;
        const mSaveTop = this.scrollTop;
        this.scrollTop = this.cursorY;
        this.scrollUp(deleteLine)
        this.scrollTop = mSaveTop
        break;
      case "@": { // 插入空格
        const insertCol = param1 || 1; // 插入的空格数，默认为 1
        const currentLine = this.buffer[this.cursorY] || ''; // 当前行内容
        const beforeCursor = currentLine.slice(0, this.cursorX); // 光标前的内容
        const afterCursor = currentLine.slice(this.cursorX); // 光标后的内容
        // 在光标处插入空格
        this.buffer[this.cursorY] = beforeCursor + ' '.repeat(insertCol) + afterCursor;
        break;
      }
      case "P": { // 删除字符
        const deleteCol = param1 || 1; // 删除的字符数，默认为 1
        const currentLine = this.buffer[this.cursorY] || ''; // 当前行内容
        const beforeCursor = currentLine.slice(0, this.cursorX); // 光标前的内容
        const afterCursor = currentLine.slice(this.cursorX + deleteCol); // 光标后的内容，跳过删除的部分
        // 删除字符并更新当前行
        this.buffer[this.cursorY] = beforeCursor + afterCursor;
        break;
      }
      // \x1b[{n}@	插入 n 个空格	\x1b[5@
      //   \x1b[{n}P	删除 n 个字符	\x1b[5P
      case "r": // 设置滚动区域
        const top = param1 > 0 ? param1 - 1 : undefined;
        const bottom = param2 > 0 ? param2 - 1 : undefined;
        // 参数有效性检查
        if (top === undefined && bottom === undefined) {
          // 默认全屏滚动区域
          this.scrollTop = undefined;
          this.scrollBottom = undefined;
          break;
        }

        if (
          top === undefined ||
          bottom === undefined ||
          top < 0 ||
          top > bottom
        ) {
          throw new Error(`Invalid scroll area: [${top}, ${bottom}]. Buffer length: ${this.buffer.length}`);
        }
        this.ensureLineExists(bottom);
        // 设置滚动区域
        this.scrollTop = top;
        this.scrollBottom = bottom;
        break;
      case "S": // 向上滚动
        this.scrollUp(param1 || 1);
        break;
      case "T": // 向下滚动
        this.scrollDown(param1 || 1);
        break;
      default:
        support = false;
        break;
    }

    // 确保光标位置与缓冲区行的长度一致
    this.ensureLineLength(this.cursorY, this.cursorX);
    return support;
  }
  /**
   * 1    1
   * 2 -- 3
   * 3 -- 
   * 4    4
   * @param lines 
   */
  private scrollUp(lines: number): void {
    const { top, bottom } = this.getScrollArea();
    const delat = bottom - lines;
    for (let i = top; i <= bottom; i++) {
      if (i <= delat) {
        this.buffer[i] = this.buffer[i + lines];
        this.ansiBuffer.switchRow(i + lines, i)
      } else {
        this.buffer[i] = ''
        this.ansiBuffer.delete(i)
      }
    }
  }
  private getScrollArea() {
    let top = this.scrollTop;
    let bottom = this.scrollBottom;
    if (top === undefined) {
      top = 0;
    }
    if (bottom === undefined) {
      bottom = this.buffer.length - 1;
    }
    return { top, bottom }
  }
  /**
   * 1    1
   * 2 -- 
   * 3 -- 2
   * 4    4
   * 
   * @param lines 
   */
  private scrollDown(lines: number): void {
    const { top, bottom } = this.getScrollArea();
    const delat = lines - top;
    for (let i = bottom; i >= top; i--) {
      if (i >= delat) {
        this.buffer[i] = this.buffer[i - lines];
        this.ansiBuffer.switchRow(i - lines, i)
      } else {
        this.buffer[i] = ''
        this.ansiBuffer.delete(i)
      }
    }
  }
  render(): string {
    if (!this.renderCache) {
      let y = 0;
      let result = "";
      for (const line of this.buffer) {
        let x = 0;
        for (const char of line) {
          const ansi = this.ansiBuffer.get(y, x);
          if (ansi) {
            const ansiString = ansi.join("");
            result += ansiString;
          }
          result += char;
          x++;
        }
        const ansi = this.ansiBuffer.getLineRemain(y, x);
        if (ansi) {
          const ansiString = ansi.join("");
          result += ansiString;
        }
        y++;
        if (y < this.buffer.length) {
          result += '\n'
        }
      }
      result += restore(`\x1b[${this.cursorY + 1};${this.cursorX + 1}H`);
      result += restore(`\x1b[?25${this.cursorVisible ? 'h' : 'l'}`)
      if (this.bel) {
        result += restore(`\x07`)
      }
      this.renderCache = result;
    }
    return this.renderCache;
  }

  private ensureLineExists(lineIndex: number): void {
    while (this.buffer.length <= lineIndex) {
      this.buffer.push("");
    }
  }

  private ensureLineLength(lineIndex: number, minLength: number): void {
    this.ensureLineExists(lineIndex);
    if (this.buffer[lineIndex].length < minLength) {
      this.buffer[lineIndex] = this.buffer[lineIndex].padEnd(minLength, " ");
    }
  }
  _clear(): void {
    this.renderCache = undefined;
    this.ansiBuffer.clear();
    this.buffer = [""]; // 清空屏幕内容，只留一行
    this.cursorX = 0; // 重置光标到屏幕左上角
    this.cursorY = 0;
  }
  clear(): void {
    this._checkStatus()
    this._clear();
  }
}

export default VirtualWindow;
