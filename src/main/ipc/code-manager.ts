import { v4 as uuidV4 } from 'uuid'
import { getIpcApi } from './ipc-wrapper'
export type InstructContent = {
    code: string,
    language: string,
    executor?: string,
    id: string,
}
export type ExecuteResult = {
    code: string,
    language: string,
    result: string
}
export const wrapperInstruct = (instruction: string, content: string): InstructContent => {
    return { language: instruction, code: content, id: uuidV4() }
}
const api = getIpcApi('code-view-api')
export const previewCode = (code: Array<InstructContent>) => {
    console.error("执行错误:", new Error())
    api.send('code', code)
}

export const executeCodeCompleted = (code: ExecuteResult) => {
    api.send('code.executed', code)
}