import { getIpcApi } from "@main/ipc/ipc-wrapper";
/**
 * 用于提供装饰器的ipc管理功能
 **/
export function on(method_name: string): any {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!target.__ipc_) {
            target.__ipc_on_methods = new Map();
        }
        target.__ipc_on_methods.set(method_name, descriptor.value);
    };
}
export function handle(method_name?: string): any {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!target.__ipc_) {
            target.__ipc_handle_methods = new Map();
        }
        target.__ipc_handle_methods.set(method_name || propertyKey, descriptor.value);
    };
}
export function BindIpc(ipc_channel: string) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            constructor(...args: any[]) {
                super(...args);
                const ipc = getIpcApi(ipc_channel)
                const __ipc_on_methods = (constructor.prototype as any).__ipc_on_methods;
                __ipc_on_methods?.forEach((method: Function, name: string) => {
                    ipc.on(name, (event: any, ...args: any[]) => {
                        return method.bind(this)!(...args, event)
                    })
                });
                const __ipc_handle_methods = (constructor.prototype as any).__ipc_handle_methods;
                __ipc_handle_methods?.forEach((method: Function, name: string) => {
                    ipc.handle(name, (event: any, ...args: any[]) => {
                        return method.bind(this)!(...args, event)
                    })
                });
            }
        };
    };
}
