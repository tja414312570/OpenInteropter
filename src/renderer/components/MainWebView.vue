<template>
  <div class="browser-container">
    <!-- 浏览器控制栏 -->
    <div class="browser-controls">
      <v-btn icon @click="goBack" :disabled="!canGoBack">
        <v-icon>mdi-arrow-left</v-icon> <!-- 后退按钮 -->
      </v-btn>
      <v-btn icon @click="goForward" :disabled="!canGoForward">
        <v-icon>mdi-arrow-right</v-icon> <!-- 前进按钮 -->
      </v-btn>
      <v-btn icon @click="reloadPage">
        <v-icon>mdi-refresh</v-icon> <!-- 刷新按钮 -->
      </v-btn>
      <v-text-field v-model="tempUrl" dense density="compact" hide-details variant="outlined" class="url-bar"
        @keydown.enter="loadPage" @focus="isFocused = true" @blur="isFocused = false" />
      <v-btn icon @click="loadPage" v-if="!loading">
        <v-icon>mdi-arrow-right-bold-circle</v-icon> <!-- 地址栏加载按钮 -->
      </v-btn>
      <v-progress-circular v-if="loading" color="amber" indeterminate size="24"
        class="loading-indicator"></v-progress-circular>
      <button @click="toggleDevTools">打开开发者工具</button>
    </div>

    <!-- 主内容区域，加载 webview -->
    <div class="webview-container">
      <webview ref="webviews" :src="url" partition="persist:your-partition"
        useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36"
        class="webview" @did-start-loading="onStartLoading" @did-finish-load="onLoad"></webview>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { WebviewTag } from 'electron';

const url = ref('https://www.doubao.com/');
const tempUrl = ref(url.value);
const webviews = ref<WebviewTag | null>(null);
const isFocused = ref(false);
const canGoBack = ref(false);
const canGoForward = ref(false);
const loading = ref(false); // 加载状态

// 加载页面时设置 loading 状态
function onStartLoading() {
  loading.value = true;
}

const toggleDevTools = () => {
  const isOpen = webviews.value.isDevToolsOpened();
  if (isOpen) {
    webviews.value.closeDevTools();
  } else {
    webviews.value.openDevTools();
  }
}
// 页面加载完成时更新按钮状态，并停止 loading 状态
function onLoad() {
  webviews.value.openDevTools()
  loading.value = false;
  if (webviews.value) {
    canGoBack.value = webviews.value.canGoBack();
    canGoForward.value = webviews.value.canGoForward();
  }
}

onMounted(() => {
  const myWebview = webviews.value;

  if (myWebview) {
    myWebview.addEventListener('did-navigate', (event) => {
      if (!isFocused.value) {
        tempUrl.value = event.url;
      }
    });
    myWebview.addEventListener('did-navigate-in-page', (event) => {
      if (!isFocused.value) {
        tempUrl.value = event.url;
      }
    });
  }
});

// 加载新页面
function loadPage() {
  if (webviews.value) {
    url.value = tempUrl.value;
    webviews.value.src = url.value;
  }
}

// 前进
function goForward() {
  if (webviews.value && webviews.value.canGoForward()) {
    webviews.value.goForward();
  }
}

// 后退
function goBack() {
  if (webviews.value && webviews.value.canGoBack()) {
    webviews.value.goBack();
  }
}

// 刷新页面
function reloadPage() {
  if (webviews.value) {
    webviews.value.reload();
  }
}
</script>

<style scoped>
.browser-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.browser-controls {
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ccc;
}

.v-btn {
  width: 32px !important;
  height: 32px !important;
  margin: 0px 5px;
}

.url-bar {
  flex-grow: 1;
  margin: 0 8px;
}

.webview-container {
  flex-grow: 1;
  overflow: hidden;
}

.webview {
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.loading-indicator {
  margin-left: 8px;
}
</style>
