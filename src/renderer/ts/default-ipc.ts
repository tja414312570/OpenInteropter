export interface IpcEventHandler {
    on: (eventName: string, handler: (...args: any[]) => void) => void;
    invoke: (methodName: string, ...args: any[]) => any;
    [key: string]: any; // 支持任意其他属性
}
