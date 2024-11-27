import { IContext } from 'http-mitm-proxy'; // 导入 CommonJS 模块
export interface Bridge {
    send(input: any): Promise<void> | void;
    onRequest(ctx: IContext): Promise<string | void>
    onResponse(ctx: IContext): Promise<string | void>
    renderScript(): Promise<string | void>
    preloadScript(): Promise<string | void>
}

export const  enum InstructResultType {
    executing = "executing",
    completed = "completed",
    failed = "failed",
    abort = "abort"
}
export type InstructResult = {
    id: string,
    std?: string,
    ret?: string,
    type: InstructResultType
    execId: string,
}
export interface InstructExecutor {
    currentTask(): string[];
    execute(instruct: InstructContent): Promise<InstructResult | void>
    abort(instruct: InstructContent): Promise<InstructResult | void>
}

export type InstructContent = {
    id: string,
    code: string,
    language: string
}
export type ExecuteResult = {
    code: string,
    language: string,
    result: string
}