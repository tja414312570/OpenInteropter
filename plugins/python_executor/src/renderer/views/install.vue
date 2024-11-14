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
      Python安装器 ：{{ title }}
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
        <div v-show="nodeList.list.length === 0">
          正在获取当前环境所有可用的版本
          <div class="split" />
          <v-progress-circular
            v-show="nodeList.list.length === 0 && !nodeList.error"
            size="14"
            width="2"
            color="primary"
            indeterminate
          ></v-progress-circular>
          <span class="error" v-show="nodeList.error">
            <v-btn
              class="ma-2"
              color="orange-darken-2"
              @click="refreshNodeList"
            >
              <v-icon icon="mdi-refresh" start></v-icon>
              重试
            </v-btn>
            {{ nodeList.error }}</span
          >
        </div>
      </div>

      <div v-show="nodeList.list.length > 0" style="display: flex">
        <div class="step-title">选择 Node.js 版本:</div>

        <v-select
          style="width: 250px"
          label="version"
          v-model="selectedVersion"
          :reduce="(option) => option.version"
          :options="nodeList.list"
        ></v-select>
      </div>
      <div class="out-render" ref="renderlContainer" v-html="output"></div>
    </v-card-text>
    <v-divider></v-divider>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="primary"
        :disabled="!selectedVersion || disableBtn"
        depressed
        @click="confirmSelection"
      >
        下一步
      </v-btn>
      <v-btn
        color="primary"
        v-show="completed"
        depressed
        @click="completedInstall"
      >
        完成
      </v-btn>
      <!-- <v-btn color="secondary" text @click="cancelSelection"> 取消 </v-btn> -->
    </v-card-actions>
  </v-card>
</template>

<script lang="ts" setup>
import { onUnmounted, reactive, ref, toRaw, watch } from "vue";
import { getIpcApi } from "extlib/render";
import { AnsiUp } from "ansi-up";
import Convert from "ansi-to-html";
var convert = new Convert();
const output = ref("");
const completed = ref(false);
const ansiUp = new AnsiUp();
// output.value = convert.toHtml("\x1b[30mblack\x1b[37mwhite");
// console.log(output.value);
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

const disableBtn = ref(false);
const title = ref("选择版本");
const nodeList = reactive({
  list: [],
  error: "",
});
const selectedVersion = ref(null);

const ipc = getIpcApi("installer", onUnmounted);
ipc.on("render", (event, data) => {
  output.value = ansiUp.ansi_to_html(data).replace(/\n/g, "<br>");
});
ipc.on("test", (event, data) => {
  selectedVersion.value = data;
});
const refreshNodeList = () => {
  nodeList.error = "";
  ipc
    .invoke("list-version")
    .then((result) => {
      nodeList.list = result;
      console.log(result);
      selectedVersion.value = result[0];
    })
    .catch((err) => {
      nodeList.error = err;
    });
};
refreshNodeList();
const confirmSelection = () => {
  const version = toRaw(selectedVersion.value);
  console.log(version);
  disableBtn.value = true;
  ipc
    .invoke("start-install", version)
    .then((result) => {
      console.log("下载完成？", result);
      completed.value = true;
    })
    .catch((err) => {
      disableBtn.value = false;
      output.value = ansiUp
        .ansi_to_html(`\x1b[31m下载失败:${err}\x1b[39m`)
        .replace(/\n/g, "<br>");
      console.log("下载失败:", err);
    });
};
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
