import ollama from 'ollama'
import { PrismaClient, Message, Conversation } from './src/main/prisma/generated/client';
(async () => {
    const prisma = new PrismaClient();
    const response = await ollama.chat({
        model: 'deepseek-r1:latest',
        messages: [{ role: 'user', content: '查看我的操作系统版本' },
        {
            role: 'assistant', content: `你是一个金融方面的专家，现在需要你根据用户的输入的问题和提供的环境或则工具完成任务。
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
            用户上传的文件：["1.csv","2.csv","3.csv"]`}
        ], stream: true
    })
    for await (const part of response) {
        process.stdout.write('\n')
        process.stdout.write(JSON.stringify(part))
    }
})()