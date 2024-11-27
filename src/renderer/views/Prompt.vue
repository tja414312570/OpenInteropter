<template>
    <div style="display: flex;flex-direction: column;height: 100%;position: relative;">
        <v-progress-linear color="yellow-darken-2" indeterminate v-show="loading"
            style="position: absolute;z-index: 10;"></v-progress-linear>
        <splitpanes style="flex: 1;overflow-y: hidden;">
            <pane min-size="20" size="25" max-size="40" class="menu-area">
                <div style="display:block;" class='seach-box'>
                    <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" single-line
                        clear-icon="mdi-close-circle-outline" label="搜索" clearable dark flat hide-details
                        solo-inverted></v-text-field>
                </div>
                <v-treeview :activated="selected" :active-class="'no-selected'" @update:activated="onActivated"
                    :custom-filter="filterFn" :items="settingMenus" :search="search" activatable slim
                    :return-object="true" item-title="name">
                    <template v-slot:prepend="{ item }">
                        <!-- <v-icon v-if="item.subs"
                            :icon="`mdi-${item.key === 1 ? 'home-variant' : 'folder-network'}`"></v-icon> -->
                    </template>
                </v-treeview>
            </pane>
            <pane>
                <div style="display: flex;flex-direction: column;height: 100%;background: rgba(var(--v-theme-surface))">
                    <v-breadcrumbs :items="activatedPath">
                        <template v-slot:divider>
                            <v-icon icon="mdi-chevron-right"></v-icon>
                        </template>
                        <template v-slot:title="{ item }">
                            {{ (item as any).name }}
                        </template>
                    </v-breadcrumbs>
                    <v-divider></v-divider>
                    <div class="setting-area">
                        <!-- style="height: 100%;" -->
                        <!-- <MdEditor v-model="text" /> -->
                        <MdPreview :id="id" :modelValue="text" style="height: 100%;" />
                        <!-- <MdCatalog :editorId="id" :scrollElement="scrollElement" /> -->
                        <!-- <proxyView /> -->
                    </div>
                </div>
            </pane>
        </splitpanes>
        <!-- <v-divider></v-divider>
        <div class="box-buttom text-end">
            <v-btn variant="outlined" class="text-none ms-4 text-white" @click="close" flat>
                关闭
            </v-btn>
            <v-btn variant="flat" :disabled="newSettingsValue.size == 0" class="text-none ms-4 text-white"
                color="blue-darken-4" @click="saveSetting" flat>
               prepend-icon="mdi-cog"
            应用
            </v-btn>
        </div> -->
    </div>
</template>

<script lang="ts" setup>
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import { onMounted, onUnmounted, reactive, ref, shallowRef, toRaw, watch, WatchHandle } from 'vue';
import { getIpcApi } from '@preload/lib/ipc-api';
import { PluginInfo } from '@lib/main';
import { MdPreview, MdCatalog } from 'md-editor-v3';
// preview.css相比style.css少了编辑器那部分样式
import 'md-editor-v3/lib/preview.css';

const id = 'preview-only';
const text = ref('# Hello Editor');
const scrollElement = document.documentElement;
const pluginViewApi: any = getIpcApi('plugin-view-api', onUnmounted);
const selected = reactive([])
const loading = ref(false)
const activatedPath = ref<Array<any>>([]);
const settingMenus = ref<Array<PluginInfo>>([])
loading.value = true;
watch(selected, () => {
    console.log("选择改变:", selected)
    activatedPath.value[0] = selected[0]
    pluginViewApi.invoke('get-plugin-prompt', selected[0].id).then((prompt: string) => {
        text.value = prompt;
        console.log("获取到插件prompt", prompt)
    }).catch(err => {
        console.error("获取到插件失败", err)
    })
}, { deep: true })
onMounted(() => {
    pluginViewApi.invoke('get-plugin-list').then((pluginList: PluginInfo[]) => {
        console.log("获取到插件列表", pluginList)
        settingMenus.value = pluginList
        loading.value = false
        selected.push(pluginList[0])
    }).catch(err => {
        console.error("获取到插件失败", err)
    })
})
const onActivated = (item: Array<PluginInfo>) => {
    if (item.length > 0 && item[0] !== selected[0]) {
        // selected.value[0] = item[0];
        selected.length = 0
        selected.push(item[0])

        console.log('激活:', item)
    }
}
const search = ref(null)
const caseSensitive = ref(false)
const filterFn = function (value: any, search, item) {
    if (value.children > 0) {
        return true;
    }
    return caseSensitive.value ? value.indexOf(search) > -1 : value.toLowerCase().indexOf(search.toLowerCase()) > -1
}
const newSettingsValue = reactive(new Map<string, any>());
</script>

<style scoped>
:deep(.splitpanes__splitter) {
    width: 2px;
    background: #606060;
}

.v-breadcrumbs,
.seach-box {
    height: 57px
}


/* .splitpanes__pane {
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: Helvetica, Arial, sans-serif;
    color: rgba(255, 255, 255, 0.6);
    font-size: 5em;
} */

.box-buttom {
    padding: 5px;
    height: 50px;
}

.menu-area {
    display: flex;
    flex-direction: column;
}

.v-treeview {
    flex: 1;
    /* 占据剩余空间 */
    overflow-y: auto;
    /* 当内容超过高度时出现滚动条 */
}

.no-selected {
    user-select: none;
}

.setting-area {
    padding: 8px;
    flex: 1;
    overflow: auto;
}
</style>