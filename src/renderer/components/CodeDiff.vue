<template>
    <div class="diff-content">

        <v-card-text>
            <div style="" v-html="view"></div>
        </v-card-text>
        <v-card-actions>
            <v-progress-circular v-show='!props.isCompleted.value' color="purple" :width="3" indeterminate
                size="16"></v-progress-circular>
            <v-btn class="text-none" :disabled="!isCompleted.value" prepend-icon="mdi-send-outline" @click="send"
                size="small" variant="tonal">
                发送结果
            </v-btn>
            <v-btn class="text-none" :disabled="!isCompleted.value" prepend-icon="mdi-close-outline" @click="del"
                size="small" variant="tonal">
                删除结果
            </v-btn>
            <v-btn class="text-none" prepend-icon="mdi-content-copy" @click="del" size="small" variant="tonal">
                复制结果
            </v-btn>
        </v-card-actions>
    </div>
</template>

<script lang="ts" setup>
import { AnsiUp } from 'ansi-up';
import { ref, Ref, toRaw, watch } from 'vue';

interface Props {
    content: Ref<string>;
    isCompleted: Ref<boolean>;
    del: () => void;
    send: () => void;
}

const copy = () => {
    const textToCopy = props.content.value; // 美化格式
    // 使用 Clipboard API 复制内容
    navigator.clipboard.writeText(textToCopy).then(() => {
        console.log('已复制内容: ' + textToCopy);
    }).catch(err => {
        console.error('复制失败:', err);
    });
}

const onMessage = (message) => {
    console.log("删除", message)
}
defineExpose({
    onMessage
})
const props = defineProps<Props>();

const ansiUp = new AnsiUp();
const view = ref(ansiUp.ansi_to_html(props.content.value))
console.log("渲染：", props.content.value)
watch(
    () => props.content,
    (newValue) => {
        view.value = ansiUp.ansi_to_html(newValue.value);
        console.log("渲染：", newValue.value)
    },
    { deep: true } // 深度监听对象
);

</script>

<style scoped>
.diff-content {
    background-color: #3b3f51;
    color: #ffffff;
    border: 1px solid #d19a66;
    white-space: pre-wrap;
    width: calc(100% - 16px);
    z-index: 10;
    /* 设置为较高值确保其显示在顶部 */
    position: relative;
    /* 相对定位以启用 z-index */
}

pre {
    user-select: text;
    white-space: pre-line;
}
</style>