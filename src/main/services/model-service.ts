
import { BindIpc, handle } from "@main/ipc/ipc-decorator";
import { Message } from '../prisma/generated/client';
import { ModelProvider, Message as Msg } from "@main/model-provider/ModelType";
import { getIpcApi, IpcApi, StreamIpcMainInvokeEvent } from "@main/ipc/ipc-wrapper";
import dbManager from "./db-manager";
import { v4 } from 'uuid';
const prisma = dbManager.getClient();
@BindIpc("chat-view")
class ModelService {
    private currentModel: ModelProvider;
    private modelList: ModelProvider[];
    private ipc: IpcApi
    constructor() {
        this.modelList = [];
        this.ipc = getIpcApi("chat-view")
    }
    set(model: ModelProvider) {
        this.currentModel = model
    }
    @handle()
    list(): ModelProvider[] {
        console.log("获取模型列表")
        return this.modelList;
    }
    @handle()
    current(): ModelProvider {
        return this.currentModel;
    }
    async generalTitle(conversationId: string) {
        const messages = await prisma.message.findMany({
            where: {
                conversationId: {
                    equals: conversationId
                }
            }
        })
        const messagesList = messages.map(item => { return { role: item.role, content: item.content } });
        let response = await this.currentModel.chat({
            messages: [{
                role: "user",
                content: `我希望你充当会话标题生成器。当我提供一段文本时，请根据该文本生成一个简洁、准确且吸引人的标题，标题长度不超过 15 个字。
                    请注意该文本的作用是作为和llm对话的用户的第一个文本。
                    如果你认为上下文不够，可以返回固定输出:Unknow，我将稍后提供更多的上下文。
                    请确保标题能够准确反映文本的主题和核心内容。提供的文本：\n${JSON.stringify(messagesList)}`,
            }]
        });
        const title = response.message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        if (title !== 'unknow') {
            console.log("更新标题:" + title)
            prisma.conversation.update({
                data: {
                    title: title
                },
                where: {
                    id: conversationId
                }
            })
        }

    }
    @handle()
    async chat(msg: { conversationId: string, content: string, tool: string[], attachment: string[] }, event: StreamIpcMainInvokeEvent): Promise<string> {
        const role = "user";
        const userId = '1';
        const model = this.currentModel.model;
        let conversationId = msg.conversationId;
        if (!conversationId) {
            conversationId = v4();
            console.log(process.env.DATABASE_URL);
            const conversation = await prisma.conversation.create({
                data: {
                    title: "Unknow",
                    id: conversationId,
                    userId,
                    model,
                    startedAt: new Date(),
                },
            });
        }
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId
            }
        });
        if (conversation && conversation.title === 'Unknow') {
            this.generalTitle(conversationId);
        }
        let messages = await prisma.message.findMany({
            where: { conversationId: { equals: conversationId } },
        })
        console.log("是否新的会话:" + (messages.length === 0))
        if (messages.length === 0) {
            const tip: Message = {
                id: v4(),
                conversationId: conversationId,
                role: 'system',
                done: true,
                totalDuration: 10,
                createdAt: new Date(),
                content: `你是一个金融方面和编程方面的专家，现在需要你根据用户的输入的问题和提供的环境和工具完成任务。
                系统提供的工具有：python 3.11.9，cmd
                系统架构是：用户输入->框架层->llm。框架层是一个中间框架，用于转发用户的输入、文件等转发给llm，以及当llm输出代码块时，会执行代码块，并将结果反馈个llm，
                如果llm输出的是普通响应，则会反馈给用户端。当你使用工具时，无需输出额外内容，只需要输出代码块就行,不需要示例输出
                工具使用方案:你可以使用python代码块的方式调用本地python环境，比如:
                \`\`\`python
                print("hello world")
                \`\`\`
                ,当系统反馈错误或则缺失某些依赖时，你可以通过cmd代码块安装需要的依赖，如:
                \`\`\`shell
                pip install xxx
                \`\`\`
                操作系统：windows 10。
                ### 你应该站在人类的解决问题的角度解决问题，提供给你的工具都是完整权限的,利用好提供给你的工具，这些工具是你的眼睛、嘴巴、手，可以让你看见，操作你想执行的操作
                ### 请确保你的流程和代码的逻辑性和准确性,不要使用示例代码和假设代码以及让用户填充修改的代码，代码不会和用户交互，是llm和框架层交互，除非你确定某种方案不能成功，请以普通消息的形式，框架层会转发消息给用户
                ### 对于你思考的流程，你应该每次回复只生成当前最开始的流程的代码，不要把所有流程的代码放到一起，确保获取真实情况后根据真实情况修正下一步操作，llm框架执行反馈给你后你根据返回结果执行下一个步骤
                ### 不要一次性写多个不确定和假设性代码，对于实际不能解决的，可以告知用户不能执行操作
                ### 如果用户提供的需求不明确，或则没有需求，你不要主动猜测用户的需求，要主动询问用户的需求是什么
            `} as Message; // 用户上传的文件：["1.csv","2.csv","3.csv"]  ### llm:开头的是框架层反馈，user：开头的是用户信息。
            messages.push(tip)
            await prisma.message.create({
                data: tip
            })
        }
        // 向会话中添加消息

        const message: Message = {
            conversationId: conversationId,
            role,
            id: v4(),
            done: true,
            totalDuration: 10,
            content: msg.content,
            doneReason: "user input",
            createdAt: new Date(),
        };
        await prisma.message.create({
            data: message,
        });
        messages.push(message);
        let data = "";
        const response = await this.currentModel.chat({ stream: true, messages });
        const messageId = v4();
        for await (const part of response) {
            process.stdout.write('\n')
            process.stdout.write(JSON.stringify(part));
            (part as any).id = messageId;
            (part as any).conversationId = conversationId
            event.stream.write(part);
            data += part.message.content;
        }
        event.stream.end('done');
        console.log("会话结束")
        await prisma.message.create({
            data: {
                id: messageId,
                conversationId: conversationId,
                role: 'assistant',
                content: data,
                done: true,
                totalDuration: 100,
                createdAt: new Date(),
            },
        });
        return conversationId;
    }
}
export default new ModelService();