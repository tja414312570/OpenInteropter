export class MapSet<V, K = string | number | symbol> extends Map<K, Set<V>> {

    // 添加值到指定 key 的 Set 中
    public add(key: K, value: V) {
        let values = this.get(key);
        if (!values) {
            values = new Set<V>();
            this.set(key, values);
        }
        values.add(value);
    }

    // 移除指定 key 中的某个值
    public remove(key: K, value: V) {
        const values = this.get(key);
        if (values) {
            values.delete(value);
            // 如果 Set 为空，则删除这个 key
            if (values.size === 0) {
                this.delete(key);
            }
        }
    }

    // 完全移除某个 key 和其对应的 Set
    public removeKey(key: K) {
        this.delete(key);
    }
}
