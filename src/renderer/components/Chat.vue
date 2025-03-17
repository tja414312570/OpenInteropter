<template>
    <v-container fluid>
        <!-- 聊天记录列表 -->
        <v-list class="chat-list" two-line>
            <v-list-item v-for="(msg, index) in messages" :key="index">
                <v-card class="mb-2" outlined>
                    <!-- 消息内容：利用 v-html 渲染 markdown 转换后的 HTML -->
                    <v-card-text v-html="renderMarkdown(msg.content)" @click="handleMarkdownClick"></v-card-text>
                    <!-- 显示附件（如果存在） -->
                    <v-card-actions v-if="msg.attachment">
                        <v-btn text color="primary" @click="handleOpenAction(msg.attachment)">
                            查看附件：{{ msg.attachment.name || '附件' }}
                        </v-btn>
                    </v-card-actions>
                </v-card>
            </v-list-item>
        </v-list>

        <!-- 输入区域 -->
        <div class="input-box">
            <div class="input-box-input">
                <v-textarea label="请输入消息" rows="1" auto-grow v-model="inputMessage" variant="solo"></v-textarea>
            </div>
            <div style="display:flex;padding: 8px;">
                <div style="flex-grow: 1;">
                    <v-btn icon="mdi-paperclip" style=""></v-btn>
                    <v-btn v-for="tool in tools" :key="tool.id" class="mr-2" outlined @click="selectTool(tool)">
                        {{ tool.name }}
                    </v-btn>
                </div>
                <v-btn style="" color="primary" @click="sendMessage">发送</v-btn>
            </div>
        </div>
    </v-container>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import { getIpcApi } from '@preload/lib/ipc-api';


let chatViewApi = getIpcApi("chat-view", onUnmounted);
(async () => {
    const list = await chatViewApi.invoke("list")
    console.log("模型列表:", list)
})()
// 定义消息和工具的数据类型
interface ChatMessage {
    content: string
    attachment?: File | { name: string } | null
}

interface Tool {
    id: string
    name: string
}

// 定义响应式变量
const messages = ref<ChatMessage[]>([])
const inputMessage = ref<string>('')
const attachment = ref<File | null>(null)
const tools = ref<Tool[]>([
    { id: 'tool1', name: '工具1' },
    { id: 'tool2', name: '工具2' },
])

// 初始化 markdown-it 实例，允许 HTML 标签
const md = new MarkdownIt({
    html: true,
})
chatViewApi.on('onMessage', (event, message) => {
    console.log("搜到响应:", event, message)
})
// 发送消息：将消息和附件加入消息列表，并重置输入框和附件
function sendMessage(): void {
    if (!inputMessage.value.trim() && !attachment.value) return
    // messages.value.push({
    //     content: inputMessage.value,
    //     attachment: attachment.value,
    // })
    chatViewApi.invoke('chat', null, inputMessage.value)
    inputMessage.value = ''
    attachment.value = null
    // TODO: 若需要将消息发送到后端处理，可在此处添加 API 调用
}

// 渲染 Markdown，同时替换特殊标记 (open:xxx) 为可点击的元素
function renderMarkdown(content: string): string {
    let rendered = md.render(content)
    rendered = rendered.replace(
        /\(open:([^)]+)\)/g,
        '<span class="open-link" data-open="$1" style="color: blue; cursor: pointer;">$1</span>'
    )
    return rendered
}

// 通过事件委托处理 markdown 渲染区域中点击的特殊标记
function handleMarkdownClick(event: MouseEvent): void {
    const target = event.target as HTMLElement
    if (target.classList.contains('open-link')) {
        const openValue = target.getAttribute('data-open')
        if (openValue) {
            handleOpenAction(openValue)
        }
    }
}

// 处理 (open:xxx) 类型的点击事件，依据实际需求实现逻辑
function handleOpenAction(value: any): void {
    console.log('触发 open 事件，参数为：', value)
    // 示例：根据返回的数据决定是预览文件还是跳转页面
}

// 工具选择的点击事件
function selectTool(tool: Tool): void {
    console.log('选择工具：', tool)
    // 根据业务逻辑处理不同工具的调用，例如切换输入模式或发送特定指令
}
</script>

<style scoped>
/* 自定义样式：鼠标悬停时添加下划线 */
.open-link:hover {
    text-decoration: underline;
}

.input-box {
    margin-top: 16px;
}

.input-box-input {
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
}

.chat-list {
    flex-grow: 1;
}

.v-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

:deep(.v-input .v-field__outline) {
    display: none !important;
}

:deep(.v-input .v-field--variant-solo) {
    box-shadow: none;
}

:deep(.v-input .v-input__details) {
    display: none;
}

:deep(.v-btn--icon.v-btn--density-default) {
    width: calc(var(--v-btn-height) + 4px);
    height: calc(var(--v-btn-height) + 4px);
}
</style>