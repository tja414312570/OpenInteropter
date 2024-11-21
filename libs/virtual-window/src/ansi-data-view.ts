
export class DataView {
    // row col ansi[]
    private map: Map<number, Map<number, string[]>> = new Map();
    add(row: number, col: number, ansi: string) {
        if (ansi === null || ansi === undefined) {
            return;
        }
        let rowData = this.map.get(row);
        if (!rowData) {
            rowData = new Map<number, []>();
            this.map.set(row, rowData);
        }
        let colData = rowData.get(col);
        if (!colData) {
            colData = [];
            rowData.set(col, colData);
        }
        if (ansi === '') {
            colData.length = 0;
        }
        colData.push(ansi);
    }
    delete(row: number, col?: number,) {
        if (col === undefined) {
            this.map.delete(row);
        } else {
            const rowData = this.map.get(row);
            if (rowData) {
                rowData.delete(col);
                if (rowData.size === 0) {
                    this.map.delete(row); // 删除空的x映射
                }
            }
        }
    }
    private deleteRow(row: number, condition: (col: number) => boolean) {
        const rowData = this.map.get(row);
        if (rowData) {
            for (const _col_key of rowData.keys()) {
                if ((condition(_col_key))) {
                    rowData.delete(_col_key);
                }
            }
            if (rowData.size === 0) {
                this.map.delete(row);
            }
        }
    }
    // 按行清除 (K 指令)
    reset(row: number, col: number) {
        this.deleteRow(row, _col_key => _col_key > col)
    }
    clearK(row: number, col: number, mode: number) {
        switch (mode) {
            case 0: // 清除从光标位置到行尾
                this.deleteRow(row, _col_key => _col_key >= col)
                break;
            case 1: // 清除从行首到光标位置
                this.deleteRow(row, _col_key => _col_key <= col)
                break;
            case 2: // 清除整行
                this.map.delete(row);
                break;
            default:
                break;
        }
    }
    switchRow(fromRow: number, toRow: number) {
        this.map.delete(toRow);
        const fromData = this.map.get(fromRow);
        if (fromData) {
            this.map.set(toRow, fromData);
        }
        this.map.delete(fromRow);
    }
    private deleteJ(row: number, rowConditionn: (_row_key: number) => boolean, colConditionn: (_col_key: number) => boolean) {
        for (const _row_key of this.map.keys()) {
            if (rowConditionn(_row_key)) {
                this.map.delete(_row_key);
            } else if (_row_key === row) {
                const rowData = this.map.get(_row_key);
                if (rowData) {
                    for (const _col_key of rowData.keys()) {
                        if (colConditionn(_col_key)) {
                            rowData.delete(_col_key);
                        }
                    }
                    if (rowData.size === 0) {
                        this.map.delete(row);
                    }
                }
            }
        }
    }
    clearJ(row: number, col: number, mode: number = 0) {
        if (mode > 1) {
            this.clear();
            return;
        } else if (mode === 0) {
            this.deleteJ(row, _row_key => _row_key > row, _col_key => _col_key >= col)
        } else if (mode === 1) {
            this.deleteJ(row, _row_key => _row_key < row, _col_key => _col_key <= col)
        }
    }
    // 按行和列清除数据 j指令
    clear() {
        this.map.clear()
    }
    get(row: number, col: number) {
        const xData = this.map.get(row);
        return xData?.get(col);
    }
    /**
     * 获取大于x的所有序列
     * @param x 
     * @param y 
     * @returns 
     */
    getLineRemain(row: number, col: number) {
        const lineRemain: string[] = []
        const rowData = this.map.get(row);
        if (rowData) {
            for (const [_col_key, colData] of rowData) {
                if (_col_key > col && colData.length > 0) {
                    lineRemain.push(...colData)
                }
            }
        }
        return lineRemain;
    }
}

export class ZDataView {
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