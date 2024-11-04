const fieldMap = [["channel", "c"], ["path", "p"], ["op", "o"], ["value", "v"]];
import { produce } from "immer"
import { createParser } from 'eventsource-parser';

import util from 'util'

const StreamEncoding = {
    V1: 'v1',
    V1_TEST: 'v1_test'
}
type Delta = {
    channel: number,
    op: string,
    path: string,
    value: any,
    [key: string]: any; // 允许其他任意属性，比如 __root
};
class DeltaProcessor {
    prevObjByChannel: any[];
    prevDelta: { channel: number; op: string; path: string; value: undefined; };
    constructor() {
        this.prevObjByChannel = [];
        this.prevDelta = {
            channel: 0,
            op: "add",
            path: "",
            value: undefined
        };
    }

    // 应用增量到对象上
    applyDelta(delta: Delta) {
        try {
            const decodedDelta = this.decodeDelta(delta);
            const channelId = decodedDelta.channel;
            const previousObj = this.prevObjByChannel[channelId];
            const updatedObj = applyChangesWithDelta(previousObj, decodedDelta);
            this.prevObjByChannel[channelId] = updatedObj;
            return updatedObj;
        } catch (error) {
            logError(`Error applying delta: ${error}`, error);
        }
    }

    // 解码增量
    decodeDelta(delta: Delta) {
        validateDelta(delta);
        const newDelta = mergeDeltas(delta, this.prevDelta);
        const result = expandDelta(newDelta);
        this.prevDelta = result;
        return result;
    }

    // 将增量应用到对象
    applyDeltaToObject(targetObject: Delta, delta: Delta) {
        return traverseObject({
            __root: targetObject
        }, (root: any) => applyOperation(root, delta)).__root;
    }
}
// 辅助函数：解析路径
function parsePath(path: string) {
    const pathArray: any[] = ["__root"];
    if (path === "") return pathArray;
    if (path[0] === "/") path = path.substring(1);

    for (const part of path.split("/")) {
        const isIndex = /^(?:0|[1-9]\d*)$/d.test(part);
        pathArray.push(isIndex ? parseInt(part, 10) : decodePath(part));
    }

    return pathArray;
}

// 辅助函数：处理路径中的转义字符
function decodePath(part: string) {
    return part.replace(/~1/g, "/").replace(/~0/g, "~");
}
function applyChangesWithDelta(target: any, delta: any): any {
    return produce({ __root: target }, r => applyOperation(r, delta)).__root;
}

// 将增量应用到对象的方法
function applyOperation(obj: any, delta: Delta) {
    const pathArray = parsePath(delta.path ?? "");
    for (let i = 0; i < pathArray.length - 1; i++) {
        if (obj[pathArray[i]] === void 0) {
            obj[pathArray[i]] = typeof pathArray[i + 1] === "number" ? [] : {};
        }
        obj = obj[pathArray[i]];
    }

    const lastKey = pathArray[pathArray.length - 1];

    switch (delta.op) {
        case "patch":
            for (const subDelta of delta.value) {
                const temp = { __root: obj[lastKey] };
                applyOperation(temp, subDelta);
                obj[lastKey] = temp.__root;
            }
            break;
        case "add":
            Array.isArray(obj) ? obj.splice(lastKey, 0, delta.value) : obj[lastKey] = delta.value;
            break;
        case "remove":
            Array.isArray(obj) ? obj.splice(lastKey, 1) : delete obj[lastKey];
            break;
        case "replace":
            obj[lastKey] = delta.value;
            break;
        case "append":
            if (typeof obj[lastKey] === "string") {
                obj[lastKey] += delta.value;
            } else if (Array.isArray(obj[lastKey])) {
                obj[lastKey].push(...expandArray(delta.value));
            } else if (isPlainObject(obj[lastKey]) && isPlainObject(delta.value)) {
                for (let o in delta.value)
                    obj[lastKey][o] = delta.value[o];
            } else {
                obj[lastKey] = delta.value;
            }
            break;
        case "truncate":
            if (typeof obj[lastKey] === "string") {
                obj[lastKey] = obj[lastKey].substring(0, delta.value);
            } else if (Array.isArray(obj[lastKey])) {
                obj[lastKey].length = delta.value;
            }
            break;
        default:
            throw new Error("Unknown json delta operation");
    }
}

function isPlainObject(e: any) {
    return typeof e == "object" && e != null && !Array.isArray(e);
}

// 合并当前增量和之前的增量数据
function mergeDeltas(currentDelta: Delta, previousDelta: Delta) {
    for (const [fullField, shortField] of fieldMap) {
        if (fullField !== "value" && !(shortField in currentDelta)) {
            currentDelta[shortField] = previousDelta[fullField];
        }
    }
    return currentDelta;
}

// 将简化字段转换为完整字段，并处理增量中的嵌套
function expandDelta(delta: Delta) {
    const expanded = { ...delta };
    for (const [fullField, shortField] of fieldMap) {
        if (shortField in delta) {
            expanded[fullField] = delta[shortField];
            delete delta[shortField];
        }
    }
    // 递归处理 patch 操作
    if (expanded.op === "patch") {
        expanded.value = expanded.value.map(expandDelta);
    }
    return expanded;
}

// 验证增量数据格式
function validateDelta(delta: Delta) {
    if (!delta || typeof delta !== "object") {
        throw new Error("Unexpected delta non-object");
    }
}
// 辅助函数：遍历对象并应用函数
function traverseObject(obj: any, callback: (arg: any) => void): any {
    return callback(obj);
}

// 辅助函数：将值扩展为数组
function expandArray(value: Delta) {
    return Array.isArray(value) ? value : [value];
}

// 辅助函数：记录错误
function logError(...args: any) {
    console.error(args);
}

// 判断是否为对象
function isObject(obj: any) {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
}

class CustomError extends Error {

}
function createErrorMessage(arg0: string, error: any) {
    throw new Error("Function not implemented.");
}

// function compareObjects(object1: any, object2: any) {
//     const differences: string[] = [];

//     // 检查是否是普通对象，非数组和非 null
//     const isPlainObject = (value: string | any[] | null) => typeof value == "object" && value != null && !Array.isArray(value);

//     // 返回值的类型描述
//     const getType = (value: null) => value === null ? "null" : Array.isArray(value) ? "array" : typeof value;

//     // 递归比较两个对象或数组
//     const compare = (path: string, value1: string | any[] | null, value2: string | any[] | null) => {
//         if (value1 !== value2) {
//             if (Array.isArray(value1) && Array.isArray(value2)) {
//                 // 比较两个数组
//                 for (let index = 0; index < Math.max(value1.length, value2.length); index++) {
//                     compare(`${path}/${index}`, value1[index], value2[index]);
//                 }
//             } else if (isPlainObject(value1) && isPlainObject(value2)) {
//                 // 比较两个对象
//                 for (const key of Object.keys({ ...value1 as any, ...value2 as any})) {
//                     compare(`${path}/${key}`, value1[key], value2[key]);
//                 }
//             } else {
//                 // 记录两个值的差异
//                 differences.push(`${getType(value1 as any)} != ${getType(value2 as any)} at ${path}`);
//             }
//         }
//     };

//     // 开始比较两个对象，从根路径开始
//     compare("", object1, object2);
//     return differences;
// }

const INACTIVITY_TIMEOUT_MS = 10000;

export class SseHandler {
    private message: ((data: any) => void) | undefined;
    private end: ((data: any) => void) | undefined;
    private parser: any;
    private previousObject: any;
    private parsedData: any;
    private deltaProcessor: DeltaProcessor | null = null;
    private inactivityTimer: NodeJS.Timeout | null = null;
    private currentEncoding: string = '';
    private error: ((data: any) => void) | undefined;
    onMessage(callback: (data: any) => void) {
        this.message = callback;
        return this;
    }
    onEnd(callback: (data: any) => void) {
        this.end = callback;
        return this;
    }
    onError(callback: (data: any) => void) {
        this.error = callback;
        return this;
    }
    private triggerEvent(data: {}) {
        this.message?.(data);
    }
    private triggerEnd(data: {}) {
        this.end?.(data);
    }
    private triggerError(data: any) {
        if (!this.error) {
            throw new Error(`未绑定错误handler`, { cause: data })
        }
        this.error(data);
    }
    private resetTimer() {
        // 清除现有计时器
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }

        // 创建一个新的计时器来检测处理器是否长时间未接收事件
        this.inactivityTimer = setTimeout(() => {
            // 如果长时间没有新的事件进入 handleServerEvent，则抛出错误或触发错误事件
            console.error('Error: Inactivity timeout reached, no new events received.');
            this.triggerError(new Error('Inactivity timeout reached, no new events received.'));
        }, INACTIVITY_TIMEOUT_MS);
    }
    private cleanTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
    }
    private throwError(err: any) {
        if (err instanceof Error) {
            throw err
        }
        throw new Error(err);
    }
    handleServerEvent(event: any) {
        try {
            this.resetTimer();
            // 将接收到的数据传递给流追踪器
            // 如果事件流已结束（收到 "[DONE]"）
            console.log(`处理:`, util.inspect(event))
            if (event.data === "[DONE]") {
                // 中止当前的操作并结束流
                this.cleanTimer()
                this.triggerEnd(this.parsedData)
                return;
            }
            // 如果事件类型不是 "ping"，则处理其他事件
            if (event.event !== "ping") {
                // 尝试将事件数据解析为 JSON
                let originData
                try{
                   originData = JSON.parse(event.data);
                }catch(err){
                    console.warn(`处理json数据失败`)
                    return;
                }
               
                // 如果收到的是错误消息，触发错误事件
                if (originData.error) {
                    // const error = createErrorMessage("server", this.parsedData.error);
                    this.throwError(originData.error);
                }
                // 处理 "delta_encoding" 事件
                if (event.event === "delta_encoding") {
                    if (originData === StreamEncoding.V1 || originData === StreamEncoding.V1_TEST) {
                        this.currentEncoding = originData; // 保存当前的编码
                        this.deltaProcessor = new DeltaProcessor(); // 初始化增量处理器
                    } else {
                        this.throwError(`[completion-delta] 未知的增量编码: ${event}`);
                        return;
                    }
                }
                // 处理 "delta" 事件
                else if (event.event === "delta") {
                    if (!this.deltaProcessor) { // 检查是否有增量处理器
                        this.throwError("[completion-delta] delta 事件在 delta_encoding 之前触发");
                        return;
                    }
                    // 将增量应用到对象上
                    const updatedObject = this.deltaProcessor.applyDelta(originData);

                    // 如果是测试编码类型，进行一致性检查
                    if (this.currentEncoding === StreamEncoding.V1_TEST) {
                        // this.throwError("不支持对比操作")
                        // const result = compareObjects(updatedObject,this.previousObject)
                        return;
                    } else {
                        this.parsedData = updatedObject;
                    }
                    this.triggerEvent(this.parsedData);
                } else {
                    this.triggerEvent(originData);
                }
                // 保存当前对象以进行一致性检查
                // else if (this.currentEncoding === StreamEncoding.V1_TEST && !isConsistent) {
                //     this.previousObject = this.parsedData;
                // }
            }
        } catch (err: any) {
            throw new Error(`处理数据失败,${util.inspect(event)}`, { cause: err })
        }
    }
    handler(data: string) {
        try {
            this.parser = createParser((event) => {
                this.handleServerEvent(event);
            });
            this.parser.feed(data)
        } catch (error) {
            this.triggerError(error)
        }
    }
}
export const createHandler = () => new SseHandler(); 