interface ModelProvider {
    name: string
    chat(content: string): void
}
// IPC 全局注册表
const ipcRegistry = new Map<string, Map<string, Function>>();

function getIpc(channel: string) {
    return {
        invoke: async (method: string, ...args: any[]) => {
            const methodMap = ipcRegistry.get(channel);
            if (methodMap && methodMap.has(method)) {
                return methodMap.get(method)!(...args);
            } else {
                throw new Error(`Method '${method}' not found in IPC channel '${channel}'`);
            }
        }
    };
}

// 方法装饰器：注册 IPC 方法（只存到 `prototype` 上）
function Channel(method_name?: string): any {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (!target.__ipc_methods) {
            target.__ipc_methods = new Map();
        }
        console.log("channel:", target, method_name || propertyKey, descriptor.value)
        target.__ipc_methods.set(method_name || propertyKey, descriptor.value);
    };
}

// 类装饰器：自动绑定 IPC 通道并注册方法
function BindIpc(ipc_channel: string) {
    return function <T extends { new(...args: any[]): {} }>(constructor: T) {
        return class extends constructor {
            constructor(...args: any[]) {
                super(...args);

                if (!ipcRegistry.has(ipc_channel)) {
                    ipcRegistry.set(ipc_channel, new Map());
                }
                const methodMap = ipcRegistry.get(ipc_channel)!;
                const methods = (constructor.prototype as any).__ipc_methods;

                methods.forEach((method: Function, name: string) => {
                    console.log(method, name, this)
                    methodMap.set(name, method.bind(this));
                });
            }
        };
    };
}

@BindIpc("chat-view")
class ModelService {
    private currentModel: ModelProvider;

    constructor(currentModel: ModelProvider) {
        this.currentModel = currentModel;
    }

    @Channel()
    list(): ModelProvider[] {
        return [this.currentModel];
    }
}

@BindIpc("chat-view2")
class ModelService2 {
    private currentModel: ModelProvider;

    constructor(currentModel: ModelProvider) {
        this.currentModel = currentModel;
    }

    @Channel("list2")
    list(): ModelProvider[] {
        return [this.currentModel];
    }
}
// 测试调用
(async () => {
    const service = new ModelService({ name: "hello world" } as any);
    const result = await getIpc("chat-view").invoke("list");
    console.log(result);
})();
(async () => {
    const service = new ModelService2({ name: "hello world2" } as any);
    const result = await getIpc("chat-view2").invoke("list2");
    console.log(result);
})();
(async () => {
    const service = new ModelService({ name: "hello world" } as any);
    const result = await getIpc("chat-view").invoke("list");
    console.log(result);
})();