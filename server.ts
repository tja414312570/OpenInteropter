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
                content: `你是一个金融方面的专家，现在需要你根据用户的输入的问题和提供的环境或则工具完成任务。
                系统提供的工具有：python 3.11.9
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
                操作系统：mac os。
                用户上传的文件：["1.csv","2.csv","3.csv"]`} as Message;

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
                console.log("执行完成2")
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
