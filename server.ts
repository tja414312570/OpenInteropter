import { Ollama } from 'ollama'
(async () => {

    const ollama = new Ollama({ host: 'http://192.168.3.200:11434' })
    const res = await ollama.chat({
        model: 'deepseek-r1:latest',
        messages: [{
            role: "user",
            content: `我希望你充当会话标题生成器。当我提供一段文本时，请根据该文本生成一个简洁、准确且吸引人的标题，标题长度不超过 15 个字。
            请注意该文本的作用是作为和llm对话的用户的第一个文本。
            如果你认为上下文不够，可以返回固定输出:None，我将稍后提供更多的上下文。
            请确保标题能够准确反映文本的主题和核心内容。用户提供的文本：\n你好}`,
        }]
    })
    console.log(res.message.content)
    console.log(res.message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim())
})()