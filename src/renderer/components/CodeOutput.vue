<template>
    <div class="container">
        <v-list :items="tasks" lines="three" item-props>
            <template v-slot:subtitle="{ subtitle }">
                <div v-html="subtitle"></div>
            </template>
        </v-list>
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
const tasks = ref([
])
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
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: auto;
}
</style>