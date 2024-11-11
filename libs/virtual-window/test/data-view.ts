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
                    // 修改后的代码
                    const rows = Array.from(colData.keys()); // 将 `Array.from(colData.keys())` 提取到外部，避免重复调用
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
                    // 修改后的代码
                    const rows = Array.from(colData.keys()); // 将 `Array.from(colData.keys())` 提取到外部，避免重复调用
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

import Benchmark from 'benchmark';

const suite = new Benchmark.Suite();

// 初始化测试数据
const dataView = new DataView();
for (let i = 0; i < 1000; i++) {
    dataView.add(i, i, `style-${i}`);
}

// 辅助函数：记录内存使用情况
const getMemoryUsage = () => {
    const { heapUsed } = process.memoryUsage();
    return heapUsed / 1024 / 1024; // 转换为 MB
};

// 添加基准测试
suite
    .add('随机读取', () => {
        const x = Math.floor(Math.random() * 1000);
        const y = Math.floor(Math.random() * 1000);
        dataView.get(x, y);
    })
    .add('顺序读取', () => {
        for (let i = 0; i < 1000; i++) {
            dataView.get(i, i);
        }
    })
    .add('添加新条目', () => {
        const x = Math.floor(Math.random() * 1000);
        const y = Math.floor(Math.random() * 1000);
        dataView.add(x, y, 'new-style');
    })
    .add('删除条目', () => {
        const x = Math.floor(Math.random() * 1000);
        const y = Math.floor(Math.random() * 1000);
        dataView.delete(x, y);
    })
    .add('删除整行', () => {
        const y = Math.floor(Math.random() * 1000);
        dataView.deleteRow(0, y, 2);
    })
    .add('清空数据', () => {
        dataView.clear();
    })
    .on('cycle', (event) => {
        const memoryUsed = getMemoryUsage();
        console.log(`${event.target.name} - 每秒操作次数: ${event.target.hz.toFixed(2)}, 内存使用：${memoryUsed.toFixed(4)} MB`);
    })
    .on('complete', function () {
        console.log(`最快的是 ${this.filter('fastest').map('name')}`);
    })
    .run({ async: true });
