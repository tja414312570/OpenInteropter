<template>
    <div style="display: flex;flex-direction: column;height: 100%;position: relative;">
        <v-progress-linear color="yellow-darken-2" indeterminate v-show="loading"
            style="position: absolute;z-index: 10;"></v-progress-linear>
        <splitpanes style="flex: 1;overflow-y: hidden;">
            <pane min-size="20" size="30" max-size="40" class="menu-area">
                <div style="display:block;" class='seach-box'>
                    <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" single-line
                        clear-icon="mdi-close-circle-outline" label="搜索" clearable dark flat hide-details
                        solo-inverted></v-text-field>
                </div>
                <v-treeview :open-all="openAll" @update:activated="onActivated" :activated="selected"
                    :active-class="'no-selected'" :custom-filter="filterFn" :items="settingMenus" :search="search"
                    activatable slim :return-object="true" open-on-click item-value="id" item-title="name"
                    item-children="subs">
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
                        <keep-alive>
                            <component :is="currentComponent" v-bind="currentProps" />

                        </keep-alive>
                        <!-- <proxyView /> -->
                    </div>
                </div>
            </pane>
        </splitpanes>
        <v-divider></v-divider>
        <div class="box-buttom text-end">
            <v-btn variant="outlined" class="text-none ms-4 text-white" @click="close" flat>
                取消
            </v-btn>
            <v-btn variant="flat" :disabled="newSettingsValue.size == 0" class="text-none ms-4 text-white"
                color="blue-darken-4" @click="saveSetting" flat>
                <!-- prepend-icon="mdi-cog" -->
                应用
            </v-btn>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import proxyView from '../components/settings-proxy.vue';
import { onMounted, onUnmounted, reactive, ref, shallowRef, toRaw, watch, WatchHandle } from 'vue';
import { getIpcApi } from '@preload/lib/ipc-api';
import { settingCompents } from '@renderer/ts/setting-compents';
import { ISetting } from '@lib/main';
const coreApi = getIpcApi('ipc-core.window', onUnmounted);
const selected = ref([
])
const loading = ref(false)
const openAll = ref(false)
const temp = ref([]);
const activatedPath = ref<Array<any>>([]);
const currentComponent = shallowRef();
const currentProps = ref();
function foundSetting(target: string, path = [], _menus = settingMenus.value): ISetting[] | null {
    const index = target.indexOf(".");
    const current = target.substring(0, index > 1 ? index : target.length);
    const remain = index > 1 ? target.substring(index + 1, target.length) : null;
    for (const menu of _menus) {
        const currentPath = [...path, menu];
        if (menu.key === current) {
            if (remain) {
                if (menu.subs) {
                    return foundSetting(remain, currentPath, menu.subs);
                }
            } else {
                return currentPath;
            }
        }
    }
    return [];
}
const findPath = (targetKey, path = [], nodes = settingMenus.value) => {
    for (let node of nodes) {
        const currentPath = [...path, { id: node.key, title: node.name }];
        if (node.key === targetKey) {
            return currentPath;
        }
        if (node.subs) {
            const foundPath = findPath(targetKey, currentPath, node.subs);
            if (foundPath && foundPath.length > 0) {
                return foundPath;
            }
        }
    }
    return [];
}
const settingMenus = ref<Array<ISetting>>([])
const settingApi = getIpcApi('ipc-settings', onUnmounted);
loading.value = true;
const filterItems = (items: ISetting[]): ISetting[] => {
    return items
        .map(item => {
            // 只保留匹配的节点0
            if (item.hide !== true) {
                if (item.subs) {
                    item.subs = filterItems(item.subs);
                }
                return item;
            }
        })
        .filter(Boolean) as ISetting[]; // 过滤掉 undefined
};

settingApi.invoke('get-settings').then((data: Array<ISetting>) => {
    settingMenus.value = filterItems(data);
    loading.value = false;
})
const close = () => {
    if (newSettingsValue.size > 0) {
        const result = confirm("当前设置尚未应用，是否确认退出!");
        if (result) {
            coreApi.invoke('close');
        }
    } else {
        coreApi.invoke('close');
    }
}
const newSettingsValue = reactive(new Map<string, any>());
let unwatch: WatchHandle;
const watchValue = new Map<string, any>();
const onActivated = (item: Array<ISetting>) => {
    if (item.length === 0) {
        selected.value = temp.value;
    } else {
        if (selected.value?.[0]?.path !== item[0].path) {
            loading.value = true;
            const current = item[0];
            activatedPath.value = foundSetting(item[0].path);
            const key = current.page || current.path;
            const compent = settingCompents[key];
            if (newSettingsValue.size > 0) {
                const result = confirm("当前设置尚未应用，是否确认保存当前更改!");
                if (result) {
                    saveSetting();
                }
            }
            newSettingsValue.clear()
            if (!compent) {
                console.error("没有找到组件", new Error(`没有找到组件:${key}`))
                alert(`没有配置设置界面[${current.name}]`)
            } else {
                settingApi.invoke('get-setting-value', current.path).then(value => {
                    currentComponent.value = compent;
                    let wValue = watchValue.get(current.path);
                    if (!wValue) {
                        wValue = reactive(value || {});
                        watchValue.set(current.path, wValue);
                    } else {
                        Object.keys(wValue).forEach(key => {
                            delete wValue[key];
                        });
                        Object.assign(wValue, value || {})
                    }
                    currentProps.value = { menu: current, value: wValue };
                    if (unwatch) {
                        unwatch();
                    }
                    unwatch = watch(wValue, newValue => {
                        newSettingsValue.set(current.path, toRaw(newValue))
                    })
                    loading.value = false;
                })
            }
        }
        temp.value = selected.value = item;
    }
}

const saveSetting = () => {
    if (newSettingsValue.size > 0) {
        const json = Object.fromEntries(toRaw(newSettingsValue));
        settingApi.invoke('save-setting-value', json).then(() => {
            alert("保存成功");
            newSettingsValue.clear()
        }
        );
    }

}

const search = ref(null)
const caseSensitive = ref(false)
const filterFn = function (value: any, search, item) {
    openAll.value = true;
    if (value.children > 0) {
        return true;
    }
    return caseSensitive.value ? value.indexOf(search) > -1 : value.toLowerCase().indexOf(search.toLowerCase()) > -1
}
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