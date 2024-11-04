<template>
    <div class="container">
        <!-- 左侧：源代码区域 -->
        <div class="code-container">
            <div class="code-header">
                <h3>源代码:{{ codeType }}</h3>
            </div>

            <!-- 显示源代码 -->
            <div class="code-content">
                <pre>{{ sourceCode }}</pre>
            </div>
        </div>

        <!-- 右侧：输出区域 -->
        <div class="output-container">
            <div class="output-header">
                <h3>输出</h3>
            </div>
            <textarea class="output-content" disabled>{{ output }}</textarea>

        </div>
    </div>
</template>

<script lang="ts" setup>
import { getIpcApi } from '@lib/preload';
import { IpcEventHandler } from '@renderer/ts/default-ipc';
import { onMounted, ref, watch } from 'vue';
// 源代码
const sourceCode = ref(`console.log('Hello, world!');`);
// 代码类型
const codeType = ref('javascript');
// 输出结果列表
const output = ref<{ message: string; type: string }[]>([]);

const codeApi = getIpcApi<IpcEventHandler>('code-view-api');
onMounted(() => {
    codeApi.onCodeExecuted(result => {
        console.log("搜到代码执行结果:", result)
        sourceCode.value = result.code;
        codeType.value = result.language;
        output.value = result.result
    })
})
</script>

<style scoped>
/* 父容器，使用flexbox进行布局 */
.container {
    display: flex;
    flex-direction: row;
    height: 100%;
}

/* 源代码区域 */
.code-container {
    flex: 1;
    /* 左侧占据 50% 空间 */
    display: flex;
    flex-direction: column;
    border-right: 1px dashed #ccc;
}

.code-header {
    padding: 10px;
    border-bottom: 1px dashed #ccc;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.code-content {
    padding: 10px;
    flex-grow: 1;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
}

/* 输出区域 */
.output-container {
    flex: 1;
    /* 右侧占据 50% 空间 */
    display: flex;
    flex-direction: column;
}

.output-header {
    padding: 10px;
    border-bottom: 1px dashed #ccc;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.output-content {
    padding: 10px;
    flex-grow: 1;
    overflow-y: auto;
    background-color: #1e1e1e;
    color: #dcdcdc;
}
</style>