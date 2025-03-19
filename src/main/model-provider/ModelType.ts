export interface ToolCall {
    function: {
        name: string;
        arguments: {
            [key: string]: any;
        };
    };
}
export interface Message {
    role: string;
    content: string;
    images?: Uint8Array[] | string[];
    tool_calls?: ToolCall[];
}
export interface ChatResponse {
    model: string;
    message: Message;
    done: boolean;
    done_reason: string;
}
export interface ModelProvider {
    name: string
    model: string
    chat(message: { messages: Message[], stream: true }): Promise<AsyncIterableIterator<ChatResponse>>
    chat(message: { messages: Message[], stream?: false }): Promise<ChatResponse>
}
