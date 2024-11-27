// observerManager.ts
type OnDestroyCallback = (target: Element) => void;

const observerList = new WeakMap<Element, Set<OnDestroyCallback>>();

export type ObserverElementAdapter = (target: any) => Promise<Element>
let _elementAdapter__: ObserverElementAdapter | null = null;
export const registerObserverElementAdapter = (elementAdapter: ObserverElementAdapter) => {
    _elementAdapter__ = elementAdapter;
}

// 使用单例模式确保只创建一个 MutationObserver 实例
let observer: MutationObserver | null = null;

/**
 * 初始化 MutationObserver 并绑定到 document，监听整个文档树的变化
 */
function initObserver() {
    if (!observer) {
        observer = new MutationObserver((mutationsList: MutationRecord[]) => {
            for (const mutation of mutationsList) {
                mutation.removedNodes.forEach((node) => {
                    if (node instanceof Element && observerList.has(node)) {
                        const callbacks = observerList.get(node);
                        if (callbacks) {
                            callbacks.forEach(callback => callback(node)); // 执行所有解绑回调
                        }
                        observerList.delete(node); // 清除监听器
                        console.log(`Listener removed for node:`, node);
                    }
                });
            }
        });
        // 绑定到 document 上，监听整个子树的变化
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

/**
 * 检查元素是否在当前的 DOM 树中
 * @param element - 待检查的元素
 * @returns boolean - 是否在 DOM 树中
 */
function isElementInDOM(element: Element): boolean {
    return document.body.contains(element);
}

/**
 * 尝试观察注册元素
 * @param element - 待检查的元素
 * @param callback - 在节点销毁时执行的解绑回调函数
 */
const tryObserver = (target: Element, callback: OnDestroyCallback) => {
    console.log("全局观察:", target, callback);
    if (!isElementInDOM(target)) {
        // 如果解析后的元素已被移除，立即执行回调
        callback(target);
    } else {
        // 检查是否已有监听集，没有则创建
        if (!observerList.has(target)) {
            observerList.set(target, new Set());
        }
        // 添加回调到监听集
        observerList.get(target)?.add(callback);
    }
}

/**
 * 注册一个DOM元素的监听器，并在节点被销毁时自动解绑
 * @param targetElement - 需要监控的目标元素
 * @param callback - 在节点销毁时执行的解绑回调函数
 */
export const observe = async (target: any, callback: OnDestroyCallback) => {
    if (!target || !callback) {
        throw new Error("No target element or callback provided for listener.");
    }
    // 确保 MutationObserver 已经初始化
    initObserver();
    if (target instanceof Element) {
        // 将节点和对应的解绑回调存储在 WeakMap 中
        tryObserver(target, callback);
    } else {
        if (_elementAdapter__) {
            const maybeElement = await _elementAdapter__(target);
            if (maybeElement instanceof Element) {
                tryObserver(maybeElement, callback);
            } else {
                throw new Error("The resolved target is not an Element:", maybeElement);
            }
        } else {
            throw new Error(`Object-to-element adapter not registered for object: ${target}`);
        }
    }
    console.log(`Listener registered for node:`, target);
};
