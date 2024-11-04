type EscapeSequence = {
    params: string[];
    command: string;
    fullLength: number;
    dec: boolean;
    text: string;
};

function debug(data: string) {
    return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\x${hex}`;
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

    constructor() {
        this.buffer = ['']; // 初始化时至少有一行
        this.cursorX = 0;
        this.cursorY = 0;
        this.savedCursorX = 0;
        this.savedCursorY = 0;
        this.cursorVisible = true; // 默认显示光标
        this.bel = false;
    }

    write(text: string): void {
        let remainingText = text;

        while (remainingText) {
            const char = remainingText.charAt(0);
            remainingText = remainingText.slice(1);

            if (char === '\n') {
                this.cursorY++;
                this.cursorX = 0;
                this.ensureLineExists(this.cursorY);
            } else if (char === '\r') {
                this.cursorX = 0; // 回车符重置光标到行首
            } else if (char === '\x1b') {
                const seq = this.parseEscapeSequence('\x1b' + remainingText);
                if (seq && this.handleEscapeSequence(seq)) {
                    remainingText = remainingText.substring(seq.fullLength - 1);
                    continue; // 确保处理过的控制字符不被保留
                } else {
                    console.log(`未识别的控制序列1: ${debug(seq ? seq.text : '?' + char + remainingText)}`);
                    this.addCharToBuffer(char);
                }
            } else if (char === '\x07') {
                this.bel = true;
            } else if (char === '\x08') {
                this.cursorX > 0 && this.cursorX--;
            } else {
                this.addCharToBuffer(char);
            }
        }
    }

    private addCharToBuffer(char: string): void {
        this.ensureLineExists(this.cursorY);

        if (this.cursorX < this.buffer[this.cursorY].length) {
            this.buffer[this.cursorY] =
                this.buffer[this.cursorY].substring(0, this.cursorX) +
                char +
                this.buffer[this.cursorY].substring(this.cursorX + 1);
        } else {
            this.buffer[this.cursorY] = this.buffer[this.cursorY].padEnd(this.cursorX) + char;
        }
        this.cursorX++;
    }

    private parseEscapeSequence(text: string): EscapeSequence | null {
        // 尝试匹配标准ANSI控制序列
        // const match = text.match(/^\x1b\[(\d*(;\d*)*)([A-Za-z])/);
        // const match = text.match(/^\x1b[\[\(P\]?[0-9;]*[A-Za-z]/);
        const match = text.match(/^\x1b[\[\(P\]](\?*)([0-9;]*)([A-Za-z])/);

        if (match) {
            return {
                params: match[2].split(';'),
                command: match[3],
                dec: match[1] === '?',
                fullLength: match[0].length,
                text: match[0]
            };
        }

        return null;
    }

    private handleEscapeSequence(seq: EscapeSequence): boolean {
        const command = seq.command;
        const [param1, param2] = seq.params.map(p => parseInt(p) || 0);
        let support = true;
        switch (command) {
            case 'H': // 光标移动到指定位置 (row, col)
            case 'f': // 与 'H' 功能相同
                this.cursorY = Math.max(0, param1 - 1);
                this.ensureLineExists(this.cursorY);
                this.cursorX = Math.max(0, param2 - 1);
                this.ensureLineLength(this.cursorY, this.cursorX);
                break;
            case 'A': // 光标上移
                this.cursorY = Math.max(0, this.cursorY - (param1 ? param1 : 1));
                this.ensureLineExists(this.cursorY);
                break;
            case 'B': // 光标下移
                this.cursorY = this.cursorY + (param1 ? param1 : 1);
                this.ensureLineExists(this.cursorY);
                break;
            case 'C': // 光标右移
                this.cursorX = this.cursorX + (param1 ? param1 : 1);
                this.ensureLineLength(this.cursorY, this.cursorX);
                break;
            case 'D': // 光标左移
                this.cursorX = Math.max(0, this.cursorX - (param1 ? param1 : 1));
                break;
            case 'G': // 光标移到当前行的指定列
                this.cursorX = param1 - 1;
                this.ensureLineLength(this.cursorY, this.cursorX);
                break;
            case 's': // 保存光标位置
                this.savedCursorX = this.cursorX;
                this.savedCursorY = this.cursorY;
                break;
            case 'u': // 恢复光标位置
                this.cursorY = Math.max(0, Math.min(this.savedCursorY, this.buffer.length - 1));
                this.cursorX = Math.max(0, Math.min(this.savedCursorX, this.buffer[this.cursorY].length));
                this.ensureLineExists(this.cursorY);
                this.ensureLineLength(this.cursorY, this.cursorX);
                break;
            case 'J': // 清屏
                if (param1 === 0) {
                    // 清除光标到屏幕末尾
                    this.ensureLineExists(this.cursorY);
                    this.buffer[this.cursorY] = this.buffer[this.cursorY].substring(0, this.cursorX);
                    for (let i = this.cursorY + 1; i < this.buffer.length; i++) {
                        this.buffer[i] = '';
                    }
                } else if (param1 === 1) {
                    // 清除屏幕开头到光标
                    for (let i = 0; i < this.cursorY; i++) {
                        this.buffer[i] = '';
                    }
                    this.buffer[this.cursorY] = ''.padEnd(this.cursorX, ' ');
                } else if (param1 === 2) {
                    // 清除整个屏幕并重置光标位置
                    this.clear();
                }
                break;
            case 'K': // 清除当前行光标后的内容
                this.ensureLineExists(this.cursorY);
                if (param1 === 0) {
                    // 清除从光标到行尾
                    this.buffer[this.cursorY] = this.buffer[this.cursorY].substring(0, this.cursorX);
                } else if (param1 === 1) {
                    // 清除从行首到光标
                    this.buffer[this.cursorY] = ''.padEnd(this.cursorX, ' ');
                } else if (param1 === 2) {
                    // 清除整行
                    this.buffer[this.cursorY] = '';
                }
                break;
            case 'h': // 设置模式 (例如 ?25h 显示光标)
                if (parseInt(seq.params[0]) === 25) {
                    this.cursorVisible = true;
                } else {
                    support = false;
                }
                break;
            case 'l': // 重置模式 (例如 ?25l 隐藏光标)
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
        const renderedBuffer = this.buffer.join('\n');
        // const cursorState = `[Cursor Visible: ${this.cursorVisible}, Cursor Position: (${this.cursorY + 1}, ${this.cursorX + 1})]`;
        // const belState = `[BEL:${this.bel}]`;
        if (this.bel) {
            this.bel = false;
        }
        return `${renderedBuffer}`;
    }

    private ensureLineExists(lineIndex: number): void {
        while (this.buffer.length <= lineIndex) {
            this.buffer.push('');
        }
    }

    private ensureLineLength(lineIndex: number, minLength: number): void {
        if (this.buffer[lineIndex].length < minLength) {
            this.buffer[lineIndex] = this.buffer[lineIndex].padEnd(minLength, ' ');
        }
    }

    clear(): void {
        this.buffer = [''];  // 清空屏幕内容，只留一行
        this.cursorX = 0;    // 重置光标到屏幕左上角
        this.cursorY = 0;
    }
}

export default VirtualWindow;
