<template>
    <v-progress-linear v-show="loading" color="teal" indeterminate stream></v-progress-linear>
    <webview ref="webviews" :src="url" partition="persist:your-partition2"
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36"
        class="webview" @did-start-loading="onStartLoading" @did-finish-load="onLoad"></webview>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();

// 获取 URL 中的查询参数
const queryParams = route.query;

console.log(queryParams); // 打印所有查询参数
const url = ref(queryParams.path)
const loading = ref(false); // 加载状态

// 加载页面时设置 loading 状态
function onStartLoading() {
    loading.value = true;
}
const webviews = ref()

// 页面加载完成时更新按钮状态，并停止 loading 状态
function onLoad() {
    if (!webviews.value.isDevToolsOpened()) { // 检查开发者工具是否已打开
        webviews.value.openDevTools(); // 如果没有打开，则打开开发者工具
    }
    loading.value = false;
    if (webviews.value) {
    }
}
</script>

<style scoped>
.webview {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
}
</style>