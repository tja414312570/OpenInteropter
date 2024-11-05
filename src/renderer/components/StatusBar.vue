<template>
    <div class="status-bar">
        <div class="status-bar-left">
            <!-- 扩展区域插槽 -->
            <slot name="extension"></slot>
        </div>

        <div class="status-bar-center">
            <!-- 中间区域，显示其他信息 -->
            <span v-show="task.name">{{ task.name }}：{{ task.content }}</span>
            <span v-show="task.progress > -2" style="margin-left: 12px;">
                <v-progress-circular color="green" :size="16" :width="2" :model-value="task.progress"
                    :indeterminate='task.progress === -1'></v-progress-circular>
            </span>
        </div>

        <div class="status-bar-right" @click="openSnackbar">
            <!-- 始终显示通知内容和图标 -->
            <div v-if="notification" :class="['notification-text', { 'error': notification.is_error }]">
                {{ notification.message }}
            </div>
            <v-icon small>mdi-bell</v-icon>
            <!-- <button v-if="notification" @click="clearNotification">清除通知</button> -->
        </div>
    </div>
    <div class="snackbar-container">
        <div v-for="(snackbar, index) in snackbars" :key="index" class="snackbar" @click="closeSnackbar(index)">
            <v-alert type="info" v-model="snackbar.show" dismissible>
                {{ snackbar.text }}
            </v-alert>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { getIpcApi } from '@lib/preload';
import { ref, onMounted, onUnmounted, reactive } from 'vue';

type TaskType = {
    name: string,
    id: string,
    progress: undefined | number,
    content: string
}

const snackbars = ref([])

const openSnackbar = () => {
    snackbars.value.push({
        show: true,
        text: `通知飒飒飒试试 ${snackbars.value.length + 1}`,
    })
}

const closeSnackbar = index => {
    console.log("关闭", index)
    snackbars.value.splice(index, 1)
}
// 使用 ref 定义响应式数据
const task = reactive<TaskType>({
    name: '',
    id: '',
    progress: -1,
    content: ''
});
const notification = ref<{ message: string; is_error: boolean } | null>(null);
const api = getIpcApi('ipc-notify') as any;
// 监听来自预加载脚本的通知
onMounted(() => {
    // 监听通知事件
    api.onReady();
    api.onNotify((notifyData) => {
        console.log(`收到通知：`, notifyData)
        notification.value = notifyData;
        // task.name = notifyData.name;
        // task.id = notifyData.id;
        // task.content = notifyData.message;
        // task.progress = notifyData.progress;
    });
    api.on('show-task', (event, taskParam) => {
        console.log(`收到任务：`, taskParam)
        task.name = taskParam.name;
        task.id = taskParam.id;
        task.content = taskParam.content;
        task.progress = taskParam.progress || -2;
    })
    // 监听清理通知事件
    api.onClearNotification(() => {
        notification.value = null;
    });
});


// 清除通知方法
const clearNotification = () => {
    api.clearNotification();
};
</script>

<style scoped>
.status-bar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0 5px;
    height: 20px;
}

.status-bar-left {
    flex: 1;
    display: flex;
    align-items: center;
}

.status-bar-center {
    flex: 2;
    cursor: pointer;
    text-align: center;
    display: flex;
    font-size: 12px;
    justify-content: flex-end;
    align-items: center;
}

.status-bar-right {
    flex: 1;
    display: flex;
    cursor: pointer;
    justify-content: flex-end;
    align-items: center;
    overflow: hidden;
}

.notification-text {

    font-size: 12px;
    overflow: hidden;
    /* 隐藏超出容器的内容 */
    text-overflow: ellipsis;
    /* 当内容溢出时显示省略号 */
    white-space: nowrap;
    /* 强制内容在一行显示，禁止换行 */
    word-break: break-all;
    /* 在单词内任意位置断行 */
    overflow-wrap: break-word;
    /* 优先在单词边界断行 */
}

.notification-text.error,
.mdi-bell.error {
    color: red;
    /* 错误通知显示为红色 */
}

.status-bar-right .v-icon {
    font-size: 14px;
    cursor: pointer;
}

button {
    margin-left: 10px;
    font-size: 12px;
}

.snackbar-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    /* 垂直排列 */
}

.snackbar {
    margin-bottom: 10px;
    /* 每个通知之间的间隔 */
}
</style>