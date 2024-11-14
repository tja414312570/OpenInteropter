<template>
  <!-- <v-progress-linear
      style="position: absolute; top: 0; z-index: 111"
      buffer-value="0"
      color="deep-purple-accent-4"
      stream
      indeterminate
    ></v-progress-linear> -->
  <v-card class="installer-card">
    <!-- 标题 -->
    <v-card-title class="installer-title">
      Python安装器：修复程序
    </v-card-title>

    <v-divider></v-divider>
    <v-card-text
      style="flex: 1; overflow: hidden; display: flex; flex-direction: column"
    >
      <div>
        <div>
          当前系统信息
          <div class="split" />
          <b>平台 : </b>{{ platInfo.platform }},<b>架构 : </b
          >{{ platInfo.arch }}
        </div>
      </div>
      <div class="out-render" ref="renderlContainer" v-html="output"></div>
    </v-card-text>
    <v-divider></v-divider>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        v-show="completed"
        depressed
        @click="completedInstall"
      >
        完成
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts" setup>
import { onUnmounted, reactive, ref, toRaw, watch } from "vue";
import { getIpcApi } from "extlib/render";
import { AnsiUp } from "ansi-up";
const output = ref("");
const completed = ref(false);
const ansiUp = new AnsiUp();
const platApi = getIpcApi("process", onUnmounted) as any;
const platInfo = {
  arch: platApi.arch,
  platform: platApi.platform,
};
const renderlContainer = ref<HTMLElement>();
const scrollToBottom = () => {
  if (renderlContainer.value) {
    renderlContainer.value.scrollTop = renderlContainer.value.scrollHeight;
  }
};
// 监听 `htmlContent` 的变化并自动滚动到底部
watch(output, scrollToBottom);
const ipc = getIpcApi("installer", onUnmounted);
ipc.on("render", (event, data) => {
  output.value = ansiUp.ansi_to_html(data).replace(/\n/g, "<br>");
});
ipc.on("installer-completed", (event, data) => {
  completed.value = true;
});
const completedInstall = () => {
  ipc
    .invoke("close-window")
    .then((result) => {
      console.log("下载完成？", result);
    })
    .catch((err) => {
      alert("窗口关闭失败:" + err.message);
    });
};
</script>
<style scoped>
.installer-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #e0e0e0;
}
.split {
  display: inline-block;
  width: 12px;
}
.installer-card {
  height: 100%;
  display: flex;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  flex-direction: column;
  width: 100%;
  border: 1px solid #b0b0b0;
  background-color: #f5f5f5;
  box-shadow: none;
}

.installer-title {
  font-size: 20px;
  font-weight: bold;
  color: #333333;
}

.version-dropdown {
  width: 100%;
}

.step {
  margin-bottom: 16px;
}

.step-title {
  font-size: 16px;
  font-weight: 500;
  height: 30px;
  margin-right: 16px;
  align-content: end;
  color: #333333;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.v-btn {
  min-width: 80px;
  margin-right: 8px;
}
.error {
  color: #f00;
}
.out-render {
  flex: 1;
  overflow: scroll;
}
</style>
