import { registerObserverElementAdapter } from "@lib/render/observer-manager";
import { Ref, watch } from "vue";

registerObserverElementAdapter((target: Ref<Element>) => {
    return new Promise<Element>((resolve, reject) => {
        if (target.value) {
            resolve(target.value);
        } else {
            if (!isRef(target)) {
                reject(new Error(`目标元素不是Ref引用`, target));
            }
            const stopWatch = watch(
                target,
                (newValue) => {
                    if (newValue) {
                        resolve(newValue); // 解析目标元素
                        stopWatch(); // 停止监听，确保只执行一次
                    }
                },
                { immediate: true } // 立即检查，适用于 ref 一开始就有值的情况
            );
        }
    })
})
/**
 * 判断一个对象是否是 Vue 的 ref
 * @param obj - 要检查的对象
 * @returns 如果对象是 ref 则返回 true，否则返回 false
 */
function isRef<T>(obj: any): obj is Ref<T> {
    return obj && typeof obj === 'object' && 'value' in obj;
}