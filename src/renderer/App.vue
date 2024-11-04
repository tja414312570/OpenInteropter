<template>

  <!-- <CodeLayout /> -->
  <!-- <div>
      <button v-for="(file, index) in tsFiles" :key="index" @click="loadIframe(file)">{{ file }}</button>
     </div>
    <div>
      {{iframeContent}}
      <iframe :src="iframeContent"  style="height: 100vh;" width="100%" height="500px"></iframe>
    </div> -->
  <v-theme-provider theme="dark" style="height: 100vh;display: flex;flex-direction: column;" with-background>
    <title-bar />
    <div id="app-body-container" style="overflow: hidden;flex: 1;position: relative;">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </div>

    <!-- <CodeView style="height: 100vh;" /> -->
  </v-theme-provider>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import TitleBar from "@renderer/components/title-bar/title-bar.vue";
// import CodeView from './CodeView.vue';

// const modules = import.meta.glob('./ts/*.ts');

// console.log(modules)
// const tsFiles = Object.keys(modules)
// for (const path in modules) {
//   console.log(path);
// }
// const iframeContent = ref("")

// const loadIframe = (tsFile) => {
//   iframeContent.value = `./dockview.html?tsFile=${tsFile}`;
// }
// loadIframe(tsFiles[0])
</script>
<style scoped>
.vscode-layout {
  width: 100%;
  height: 100vh;
}

ul,
li {
  list-style: none
}
</style>
