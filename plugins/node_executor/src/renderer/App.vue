<template>hello {{ test }}</template>

<script lang="ts" setup>
import { onUnmounted, ref } from "vue";
import { getIpcApi } from "extlib/render";

const test = ref("");
const ipc = getIpcApi("node", onUnmounted);
ipc.on("test", (event, data) => {
  test.value = data;
});
</script>
<style scoped>
.vscode-layout {
  width: 100%;
  height: 100vh;
}

ul,
li {
  list-style: none;
}
</style>
