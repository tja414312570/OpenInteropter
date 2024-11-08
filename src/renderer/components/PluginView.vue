<template>
    <div style="overflow: scroll;"><!-- 插件列表 -->
        <v-progress-linear v-show="loading" color="teal" indeterminate stream></v-progress-linear>
        <v-list>
            <v-list-item v-for="plugin in plugins" :key="plugin.id" class="plugin-item">
                <v-list-item-content>
                    <v-list-item-title>{{ plugin.manifest.name }}</v-list-item-title>
                    <v-list-item-subtitle>版本: {{ plugin.manifest.version }} | 作者: {{ plugin.manifest.author
                        }}</v-list-item-subtitle>
                </v-list-item-content>
                <!-- 插件类型和操作按钮区域 -->
                <v-list-item-action class="action-buttons">
                    <!-- 显示插件类型 -->
                    <v-chip class="plugin-type" small>{{ plugin.manifest.type }}</v-chip>
                    <v-chip class="plugin-type" small>{{ plugin.status }}</v-chip>
                    <div style="flex:1" class="action-group">
                        <!-- 查看详情按钮 -->
                        <v-tooltip bottom>
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" color="yellow" small @click="showDetails(plugin)">
                                    mdi-information-outline
                                </v-icon>
                            </template>
                            <span>{{ plugin.event }}</span>
                        </v-tooltip>
                        <v-tooltip bottom>
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" color="yellow" small @click="showDetails(plugin)">
                                    mdi-information-outline
                                </v-icon>
                            </template>
                            <span>查看详情</span>
                        </v-tooltip>

                        <!-- 禁用启用切换 -->
                        <v-tooltip bottom>
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" small @click="togglePlugin(plugin)"
                                    :color="plugin.enable ? 'green' : 'grey'">
                                    {{ plugin.enable ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off' }}
                                </v-icon>
                            </template>
                            <span>{{ plugin.enable ? '禁用' : '启用' }}</span>
                        </v-tooltip>
                        <v-tooltip bottom>
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" color="red" small @click="reload(plugin)">
                                    mdi-reload
                                </v-icon>
                            </template>
                            <span>重新加载</span>
                        </v-tooltip>
                        <!-- 卸载按钮 -->
                        <v-tooltip bottom>
                            <template v-slot:activator="{ props }">
                                <v-icon v-bind="props" color="gray" small @click="unloadPlugin(plugin)">
                                    mdi-delete-outline
                                </v-icon>
                            </template>
                            <span>卸载插件</span>
                        </v-tooltip>
                    </div>
                </v-list-item-action>
            </v-list-item>
        </v-list>

        <!-- 插件详情对话框 -->
        <v-dialog v-model="dialog" max-width="600px">
            <v-card>
                <v-card-title>
                    <span class="headline">{{ selectedPlugin?.manifest.name }} 详细信息</span>
                </v-card-title>
                <v-card-text>
                    <v-list dense>
                        <v-list-item>
                            <v-list-item-content>版本: {{ selectedPlugin?.manifest.version }}</v-list-item-content>
                        </v-list-item>
                        <v-list-item>
                            <v-list-item-content>AppId: {{ selectedPlugin?.manifest.appId }}</v-list-item-content>
                        </v-list-item>
                        <v-list-item>
                            <v-list-item-content>作者: {{ selectedPlugin?.manifest.author }}</v-list-item-content>
                        </v-list-item>
                        <v-list-item>
                            <v-list-item-content>许可证: {{ selectedPlugin?.manifest.license || '无许可证'
                                }}</v-list-item-content>
                        </v-list-item>
                        <v-list-item>
                            <v-list-item-content>类型: {{ selectedPlugin?.manifest.type }}</v-list-item-content>
                        </v-list-item>
                        <v-list-item v-if="selectedPlugin?.manifest.supportedHooks">
                            <v-list-item-content>支持钩子:
                                <v-chip v-for="hook in selectedPlugin?.manifest.supportedHooks" :key="hook">{{ hook
                                    }}</v-chip>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item v-if="selectedPlugin?.manifest.match">
                            <v-list-item-content>适用域名:
                                <v-chip v-for="domain in selectedPlugin?.manifest.match" :key="domain">{{ domain
                                    }}</v-chip>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item v-if="selectedPlugin?.manifest.instruct">
                            <v-list-item-content>适用指令:
                                <v-chip v-for="domain in selectedPlugin?.manifest.instruct" :key="domain">{{ domain
                                    }}</v-chip>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn @click="dialog = false">关闭</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, vShow } from 'vue';
import { PluginManifest } from '@lib/main';


import { getIpcApi } from '@preload/lib/ipc-api';

const pluginViewApi: any = getIpcApi('plugin-view-api', onUnmounted);
const loading = ref(true);

interface PluginInfo {
    id: string;
    manifest: PluginManifest;
    status: string;
    enable: boolean;
    event: string;
}

const dialog = ref(false);
const selectedPlugin = ref<PluginInfo | null>(null);

const plugins = ref<PluginInfo[]>([]);
const found = (id: string) => {
    for (const [pos, plugin] of plugins.value.entries()) {
        if (plugin.id === id) {
            return { plugin, pos };
        }
    }
    return {};
}
const sync = (event: string, plugin_: PluginInfo) => {
    plugin_['event'] = event;
    const { plugin } = found(plugin_.id);
    if (plugin) {
        Object.assign(plugin, plugin_);
    } else {
        plugins.value.push(plugin_)
    }
}
onMounted(() => {
    pluginViewApi.on('load', (event, plugin: PluginInfo) => {
        sync('load', plugin)
    })
    pluginViewApi.on('loaded', (event, plugin: PluginInfo) => {
        sync('loaded', plugin)
    })
    pluginViewApi.on('reload', (event, plugin: PluginInfo) => {
        sync('reload', plugin)
    })
    pluginViewApi.on('reloaded', (event, plugin: PluginInfo) => {
        sync('reloaded', plugin)
    })
    pluginViewApi.on('unload', (event, plugin: PluginInfo) => {
        sync('unload', plugin)
    })
    pluginViewApi.on('unloaded', (event, plugin: PluginInfo) => {
        sync('unloaded', plugin)
    })
    pluginViewApi.on('remove', (event, plugin_: PluginInfo) => {
        const { pos } = found(plugin_.id);
        if (pos) {
            plugins.value.splice(pos, 1);
        }
    })
    pluginViewApi.invoke('get-plugin-list').then(pluginList => {
        console.log("获取到插件列表", pluginList)
        plugins.value = pluginList
        loading.value = false
    }).catch(err => {
        console.error("获取到插件失败", err)
    })
})


// 方法：切换插件启用/禁用状态
const togglePlugin = (plugin: PluginInfo) => {
    plugin.enable = !plugin.enable;
    console.log(`${plugin.manifest.name} 已切换到 ${plugin.enable ? '启用' : '禁用'}`);
};
const reload = (plugin: PluginInfo) => {
    pluginViewApi.invoke('plugin-reload', plugin.id).then(plugin => {
        alert(`插件加载成功${plugin.manifest.name}`)
    }).catch(err => {
        console.error(err)
        alert("插件加载失败")
    })
}
// 方法：卸载插件
const unloadPlugin = (plugin: PluginInfo) => {
    console.log(`${plugin.manifest.name} 已卸载`);
    // 此处可以触发插件卸载逻辑
};

// 方法：显示详情对话框
const showDetails = (plugin: PluginInfo) => {
    selectedPlugin.value = plugin;
    dialog.value = true;
};
</script>

<style scoped>
.headline {
    font-size: 1.5rem;
    font-weight: bold;
}

.v-icon {
    font-size: 23px;
    /* 设置图标大小为23px */
}

.v-btn {
    /* 按钮最小宽度 */
    padding: 0 !important;
    /* 缩小按钮的内边距 */
}

.action-buttons {
    display: flex;
    justify-content: flex-end;
    /* 将按钮对齐到最右边 */
    align-items: center;
    /* 确保内容垂直居中 */
}

.plugin-type {
    margin-right: 8px;
    /* 插件类型和操作按钮之间的间距 */
}

.action-group {
    flex: 1 1 0%;
    justify-content: end;
    display: flex;
}
</style>
