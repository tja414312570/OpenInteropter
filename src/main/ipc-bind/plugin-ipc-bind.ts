import _ from 'lodash';  // 使用 ES6 import 语法
import { Bridge, InstructExecutor, PluginInfo, PluginType } from '@lib/main';
import pluginManager, { PluginEventMap } from "@main/plugin/plugin-manager";
import { getAgentFromUrl } from "@main/services/proxy";
import { getIpcApi } from "@main/ipc/ipc-wrapper";

const api = getIpcApi('plugin-view-api')
const bind = (event: keyof PluginEventMap) => {
    pluginManager.on(event, (plugin: PluginInfo) => {
        api.trySend(event, copy(plugin))
    })
}
export const initBind = () => {
    bind('load')
    bind('loaded')
    bind('reload')
    bind('reloaded')
    bind('unload')
    bind('unloaded')
    bind('remove')
}

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
    return _.omit(pluginInfo, ['getModule', 'proxy', 'module', 'context'])
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

api.handle('get-plugin-list', (event, args) => {
    const cloneObj = copy(pluginManager.filtePlugins(args));
    return cloneObj;
})

api.handle('get-plugin-tasks', async (event, args) => {
    const plugin = pluginManager.filtePlugins(args);
    const instance = await pluginManager.getModule(plugin[0] as any) as InstructExecutor;
    return instance.currentTask();
})

api.handle('plugin-reload', async (event, id: string) => {
    return copy(await pluginManager.reload(pluginManager.getPluginFromId(id)));
})

api.handle('load-render-script', (event, url) => {
    return new Promise<string>(async (resolve, reject) => {
        try {
            const agent = await getAgentFromUrl(url);
            if (agent) {
                resolve(agent.renderScript() as any)
            }
            resolve('')
        } catch (err) {
            reject(err)
        }
    })
});

api.handle('load-preload-script', (event, url) => {
    return new Promise<any>(async (resolve, reject) => {
        try {
            const agent = await getAgentFromUrl(url);
            if (agent) {
                const result = { appId: pluginManager.getPluginInfoFromInstance(agent).appId, script: await agent.preloadScript() as any };
                resolve(result)
            }
            resolve('')
        } catch (err) {
            reject(err)
        }
    })
});