export class MapSet<V> {
    private mapping: Map<string | number | symbol, Set<V>> = new Map();

    constructor() { }

    // 添加值到指定 key 的 Set 中
    public add(key: string | number | symbol, value: V) {
        let values = this.mapping.get(key);
        if (!values) {
            values = new Set<V>();
            this.mapping.set(key, values);
        }
        values.add(value);
    }

    // 获取指定 key 的 Set
    public get(key: string | number | symbol): Set<V> | undefined {
        return this.mapping.get(key);
    }

    // 移除指定 key 中的某个值
    public remove(key: string | number | symbol, value: V) {
        const values = this.mapping.get(key);
        if (values) {
            values.delete(value);
            // 如果 Set 为空，则删除这个 key
            if (values.size === 0) {
                this.mapping.delete(key);
            }
        }
    }

    // 完全移除某个 key 和其对应的 Set
    public removeKey(key: string | number | symbol) {
        this.mapping.delete(key);
    }
}
