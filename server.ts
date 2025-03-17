import express, { Request, Response } from 'express';
import { PrismaClient, Message, Conversation } from './src/main/prisma/generated/client';
import ollama from 'ollama'
import { time } from 'console';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.post('/start-conversation', async (req: Request, res: Response) => {
    try {
        // 创建会话
        const { userId, model } = req.body;
        const conversation = await prisma.conversation.create({
            data: {
                userId,
                model,
                startedAt: new Date(),
            },
        });
        res.status(201).json(conversation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to start conversation' });
    }
});

app.delete('/conversation', async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.body;
        await prisma.message.deleteMany({
            where: { conversationId: { equals: conversationId } }
        })
        res.status(200).json({ result: "ok" });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start conversation' });
    }
})
app.get('/conversation/:id', async (req: Request, res: Response) => {
    try {
        const conversationId = req.params.id;
        let messages = await prisma.message.findMany({
            where: { conversationId: { equals: parseInt(conversationId) } },
        })
        for (let message of messages) {
            console.log(message.content);
        }
        res.status(200).json({ result: "ok", messages });
    } catch (error) {
        res.status(500).json({ error: 'Failed to query conversation' });
    }
})
app.post('/send-message', async (req: Request, res: Response) => {
    const { conversationId, role, content } = req.body;
    try {

        let messages = await prisma.message.findMany({
            where: { conversationId: { equals: conversationId } },
        })
        console.log("是否新的会话:" + (messages.length === 0))
        if (messages.length === 0) {
            const tip = {
                conversationId,
                role: 'user',
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
        const message = {
            conversationId,
            role,
            done: true,
            totalDuration: 10,
            content,
            createdAt: new Date(),
        };
        await prisma.message.create({
            data: message,
        });
        messages.push(message as any);
        console.log(messages)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // 与 Ollama 交互，获取回复
        const response = await ollama.chat({
            model: 'deepseek-r1:latest',
            messages, stream: true
        })
        let data = '';
        // 定期发送事件
        const sendEvent = (data, done: boolean, done_reason: string) => {
            // 发送消息
            if (done) {
                res.write("done\n\n")
                res.end()
            } else {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            }
        };
        res.status(200);
        for await (const part of response) {
            process.stdout.write('\n')
            process.stdout.write(JSON.stringify(part))
            sendEvent(part.message.content, part.done, part.done_reason)
            data += part.message.content;
        }
        console.log("执行完成")
        console.log(data);
        // // 将系统的回复添加到消息
        await prisma.message.create({
            data: {
                conversationId,
                role: 'assistant',
                content: data,
                done: true,
                totalDuration: 100,
                createdAt: new Date(),
            },
        });

        // res.status(200).json({ message: 'Message sent', response: data });
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Failed to send message' + error });
    }
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env['ARK_API_KEY'],
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

async function main() {
    // Non-streaming:
    console.log('----- standard request -----')
    const completion = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: '你是人工智能助手' },
            { role: 'user', content: '常见的十字花科植物有哪些？' },
        ],
        model: 'deepseek-r1-250120',
    });
    console.log(completion.choices[0]?.message?.content);

    // Streaming:
    console.log('----- streaming request -----')
    const stream = await openai.chat.completions.create({
        messages: [
            { role: 'system', content: '你是人工智能助手' },
            { role: 'user', content: '常见的十字花科植物有哪些？' },
        ],
        model: 'deepseek-r1-250120',
        stream: true,
    });
    for await (const part of stream) {
        process.stdout.write(part.choices[0]?.delta?.content || '');
    }
    process.stdout.write('\n');
}

main();
