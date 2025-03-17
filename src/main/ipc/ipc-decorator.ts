import { getIpcApi } from "@main/ipc/ipc-wrapper";

/**
 * 监听 IPC 事件 (异步, 但不会等待返回)
 **/
export function on(method_name: string): MethodDecorator {
    return function (target, propertyKey, descriptor) {
        if (!target.hasOwnProperty("__ipc_on_methods")) {
            Object.defineProperty(target, "__ipc_on_methods", {
                value: new Map(),
                writable: false,
                enumerable: false,
            });
        }
        (target as any).__ipc_on_methods.set(method_name, descriptor.value);
    };
}

/**
 * 监听 IPC 事件 (同步, 需要返回值)
 **/
export function handle(method_name?: string): MethodDecorator {
    return function (target, propertyKey, descriptor) {
        if (!target.hasOwnProperty("__ipc_handle_methods")) {
            Object.defineProperty(target, "__ipc_handle_methods", {
                value: new Map(),
                writable: false,
                enumerable: false,
            });
        }
        (target as any).__ipc_handle_methods.set(method_name || propertyKey, descriptor.value);
    };
}

/**
 * 绑定 IPC 通道
 **/
export function BindIpc(ipc_channel: string) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            constructor(...args: any[]) {
                super(...args);

                const ipc = getIpcApi(ipc_channel);
                const instance = this as any; // 确保 `this` 是实例

                const onMethods = (constructor.prototype as any).__ipc_on_methods || new Map();
                onMethods.forEach((method: Function, name: string) => {
                    ipc.on(name, (event: any, ...args: any[]) => {
                        method.apply(instance, [...args, event]);
                    });
                });

                const handleMethods = (constructor.prototype as any).__ipc_handle_methods || new Map();
                handleMethods.forEach((method: Function, name: string) => {
                    ipc.handle(name, async (event: any, ...args: any[]) => {
                        return method.apply(instance, [...args, event]);
                    });
                });
            }
        };
    };
}
