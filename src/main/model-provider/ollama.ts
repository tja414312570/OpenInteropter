import { AbortableAsyncIterator, Ollama } from 'ollama'
import { ChatResponse, ModelProvider, Message as Msg } from './ModelType';
import { Message } from '@main/prisma/generated/client';

const ModelType = {
    chat: "chat",
    embding: "embding"
};

const ollama = new Ollama({ host: 'http://192.168.3.200:11434' });

export class OllamaModel implements ModelProvider {
    name: "ollama";
    type = ModelType.chat;
    model = 'deepseek-r1:latest';
    private response: AbortableAsyncIterator<ChatResponse>;

    // chat 方法的重载
    async chat(message: { messages: Msg[], stream: true }): Promise<AsyncIterableIterator<ChatResponse>>;
    async chat(message: { messages: Msg[], stream: false }): Promise<ChatResponse>;

    // 实现方法
    async chat(message: { messages: Msg[], stream: boolean }): Promise<ChatResponse | AsyncIterableIterator<ChatResponse>> {
        console.log(message);

        if (!message.stream) {
            return await ollama.chat({
                model: this.model,
                messages: message.messages,
            });
        }

        return this.chatStream(message);
    }

    private async *chatStream(message: { messages: Msg[], stream: boolean }): AsyncIterableIterator<ChatResponse> {
        this.response = await ollama.chat({
            model: this.model,
            messages: message.messages,
            stream: true,
        });

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
