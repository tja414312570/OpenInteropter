import { ipcMain } from "electron";
import _ from 'lodash';  // 使用 ES6 import 语法
import { Bridge, InstructExecutor, PluginInfo, PluginType } from '@lib/main';
import pluginManager from "@main/plugin/plugin-manager";
import { getAgentFromUrl } from "@main/services/proxy";


const arrayPool = {
    pool: [],  // 存储空闲数组
    maxSize: 5,  // 最大池大小
    index: 0,
    current: 0,
    acquire() {
        if (arrayPool.index > arrayPool.maxSize - 1) {
            arrayPool.index = 0;
        }
        if (arrayPool.pool.length - 1 < arrayPool.index) {
            arrayPool.pool.push([])
        }
        console.log(`池化指针${arrayPool.index}`)
        arrayPool.current = arrayPool.index;
        arrayPool.index++;
        return arrayPool.pool[arrayPool.current];
    }
};

const _clone = (pluginInfo: PluginInfo) => {
    return _.omit(pluginInfo, ['getModule', 'proxy', 'module'])
}
const copy = (pluginList: undefined | null | PluginInfo | PluginInfo[]) => {
    if (!pluginList) {
        return null;
    }
    if (typeof pluginList === 'object' && !(pluginList instanceof Array)) {
        return _clone(pluginList);
    }
    const list = arrayPool.acquire();
    list.length = 0;  // 清空数组
    if (pluginList instanceof Array) {
        for (const plugin of pluginList) {
            list.push(_clone(plugin));
        }
        return list;
    }
    return list;
};

ipcMain.handle('plugin-view-api.get-plugin-list', (event, args) => {
    const cloneObj = copy(pluginManager.filtePlugins(args));
    return cloneObj;
})

ipcMain.handle('plugin-view-api.get-plugin-tasks', async (event, args) => {
    const plugin = pluginManager.filtePlugins(args);
    const instance = await pluginManager.getModule(plugin[0] as any) as InstructExecutor;
    return instance.currentTask();
})

ipcMain.handle('plugin-view-api.plugin-reload', async (event, id: string) => {
    return copy(await pluginManager.reload(pluginManager.getPluginFromId(id)));
})

ipcMain.handle('load-script', (event, url) => {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const agent = await getAgentFromUrl(url);
            if (agent) {
                resolve(agent.requireJs() as any)
            }
            resolve('')
        } catch (err) {
            reject(err)
        }
    })
});