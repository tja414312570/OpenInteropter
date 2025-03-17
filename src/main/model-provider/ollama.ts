import ollama, { AbortableAsyncIterator } from 'ollama'
import { ChatResponse, ModelProvider, Message as Msg } from './ModelType';
import { Message } from '@main/prisma/generated/client';
const ModelType = {
    chat: "chat",
    embding: "embding"
}
export class OllamaModel implements ModelProvider {
    name: "ollama";
    type = ModelType.chat;
    model = 'deepseek-r1:latest'
    private response: AbortableAsyncIterator<ChatResponse>;
    // 修改后的 chat 方法，返回 AsyncIterator 类型
    async *chat(messages?: Message[]): AsyncIterableIterator<ChatResponse> {
        console.log(messages);
        // 调用 Ollama API 获取响应
        this.response = await ollama.chat({
            model: this.model,
            messages,
            stream: true
        });

        // 逐步返回数据
        for await (const part of this.response) {
            yield {
                model: part.model,
                message: part.message,
                done: part.done,
                done_reason: part.done_reason,
            };
        }
    }
    abort() {
        this.response.abort();
    }
}
