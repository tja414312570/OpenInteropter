import * as fs from 'fs';
import * as path from 'path';
import { PluginManifest, PluginProxy, PluginStatus, PluginType } from '@lib/main';
import { v4 as uuidv4 } from 'uuid';
import { MapSet } from '../utils/MapSet';
import assert from 'assert';
import { PluginInfo, PluginContext } from './plugin-context'
import '../ipc-bind/plugin-ipc-bind'
import { showErrorDialog } from '@main/utils/dialog';
import EventEmitter from 'events';
import { initBind } from '../ipc-bind/plugin-ipc-bind';
import '../ipc-bind/plugin-window-core-ipc'

const manifest_keys: Array<string> = ['name', 'main', 'version', 'description', 'author', 'appId']
// 定义常见的特殊属性集合
const special_key_props = new Set(["toString", "valueOf", "then", "toJSON", "onMounted", "_init__"]);
// 插件管理类
export interface PluginEventMap {
    /**
     * 添加目录
     */
    scan: [string];
    /**
     * 加载
     */
    load: [PluginInfo];

    /**
     * 加载完成
     */
    loaded: [PluginInfo];
    /**
     * 卸载
     */
    unload: [PluginInfo]
    /**
     * 卸载完成
     */
    unloaded: [PluginInfo];
    /**
    * 重新加载
    */
    reload: [PluginInfo]
    /**
    * 重新加载完成
    */
    reloaded: [PluginInfo]
    /**
     * 移除
     */
    remove: [string];
    error: [keyof PluginEventMap, PluginInfo | string, Error]
    // [event: string]: any[];
}
class PluginManager extends EventEmitter<PluginEventMap> {
    private pluginDirs: Set<string> = new Set();           // 插件目录
    private pluginSet: Set<PluginInfo> = new Set(); // 已加载的插件列表
    private idMapping: Map<string, PluginInfo> = new Map();
    private typeMapping: MapSet<PluginInfo> = new MapSet();
    constructor() {
        super();
    }
    add(pluginInfo: PluginInfo) {
        this.idMapping.set(pluginInfo.appId, pluginInfo);
        this.pluginSet.add(pluginInfo);
        this.typeMapping.add(pluginInfo.type, pluginInfo)
    }
    remove(pluginInfo: PluginInfo) {
        this.pluginSet.delete(pluginInfo)
        this.idMapping.delete(pluginInfo.appId);
        this.typeMapping.remove(pluginInfo.type, pluginInfo)
    }
    public getPluginsFromType(type: PluginType): Array<PluginInfo> | undefined | null {
        return Array.from(this.typeMapping.get(type));
    }
    public getAllPlugins(): Array<PluginInfo> {
        return Array.from(this.pluginSet);
    }

    public filtePlugins(condition: PluginInfo): PluginInfo[] {
        let allPlugins = Array.from(this.getAllPlugins());
        if (condition) {
            for (let key in condition) {
                if (condition.hasOwnProperty(key)) {
                    const conditionValue = condition[key];
                    if (conditionValue) {
                        allPlugins = allPlugins.filter((plugin) => {
                            if (typeof conditionValue === 'function') {
                                return conditionValue(plugin[key]);
                            } else {
                                return conditionValue === plugin[key];
                            }
                        });
                    }
                }
            }
        }
        return allPlugins;
    }
    public getPluginFromId(id: string): PluginInfo {
        return this.idMapping.get(id);
    }

    private wrapperModule(pluginInfo: PluginInfo) {
        const proxyHandler: ProxyHandler<any> | any = {
            _plugin: pluginInfo,
            get(target: any, prop: string) {
                if (prop === '_plugin') {
                    return this._plugin;
                }
                // // 1. 直接处理特殊属性和 Symbol
                if (special_key_props.has(prop) || typeof prop === "symbol") {
                    return target[prop];
                }
                // 2. 检查插件状态
                if (!target || !pluginInfo.module || pluginInfo.status !== PluginStatus.load) {// || pluginInfo.status !== PluginStatus.load
                    throw new Error(`插件 ${pluginInfo.name} 当前状态：${pluginInfo.status}，无法访问属性或方法 ${String(prop)}`);
                }
                if (prop in target) {
                    // 如果方法存在，则调用原始对象的方法
                    return target[prop];
                } else {
                    throw new Error(`组件${pluginInfo.name}不存在方法或属性'${String(prop)}'`)
                }
            }
        }
        return new Proxy(pluginInfo.module, proxyHandler);
    }
    resolvePluginModule<T>(type: PluginType, filter?: (pluginsOfType: Array<PluginInfo>) => PluginInfo | Array<PluginInfo> | undefined): Promise<T> {
        return new Promise<T>(async (resolve, rejects) => {
            let pluginsOfType: Array<PluginInfo> | PluginInfo | undefined = await this.getPluginsFromType(type);
            if (!pluginsOfType || pluginsOfType.length === 0) {
                rejects(`类型${type}没有相关注册插件!`)
                return;
            }
            if (filter && typeof filter === 'function') {
                try {
                    pluginsOfType = filter(pluginsOfType);
                } catch (err) {
                    rejects(err)
                }
            }
            if (!pluginsOfType) {
                rejects(`类型${type}没有合适的注册插件!`)
            }
            if (!(pluginsOfType instanceof Set) && typeof pluginsOfType === 'object') {
                resolve(await this.getModule(pluginsOfType as PluginInfo & PluginProxy))
            }
            else if ((pluginsOfType instanceof Set)) {
                if (pluginsOfType.size === 1) {
                    const pluginInfo = pluginsOfType.values().next().value;
                    const module = await this.getModule(pluginInfo as any);
                    resolve(module)
                } else {
                    //等待选择

                }
            }
        })
    }
    public async load(pluginInfo: PluginInfo & PluginProxy) {
        try {
            this.emit('load', pluginInfo)
            assert.ok(pluginInfo.status === PluginStatus.ready || pluginInfo.status === PluginStatus.unload, `插件${pluginInfo.manifest.name}状态不正常：${pluginInfo.status}，不允许加载`)
            const orgin = pluginInfo.main.endsWith('mjs') ? await import('file://' + pluginInfo.main) : require(pluginInfo.main)
            const instance = orgin.default || orgin;
            assert.ok(instance, `插件${pluginInfo.manifest.name}的入口文件没有提供默认导出,文件位置:${pluginInfo.manifest.main}`)
            assert.ok(typeof instance === 'object' && instance !== null, `插件${pluginInfo.manifest.name}的入口文件导出非对象,文件位置:${pluginInfo.manifest.main}`)
            pluginInfo.module = instance; // 或使用 import(pluginEntryPath) 来加载模块
            pluginInfo.proxy = await this.wrapperModule(pluginInfo);
            const pluginContext = new PluginContext(pluginInfo);
            pluginContext.create();
            pluginInfo.context = pluginContext;
            if (!fs.existsSync(pluginContext.workPath)) {
                fs.mkdirSync(pluginContext.workPath)
            }
            if ('_init__' in pluginInfo.module) {
                (pluginInfo.module as any)['_init__'](pluginContext)
            }
            await pluginInfo.module.onMounted(pluginContext);
            pluginInfo.status = PluginStatus.load;
            this.emit('loaded', pluginInfo)
        } catch (err) {
            pluginInfo?.context?.destory();
            this.emit('error', 'load', pluginInfo, err)
            throw err;
        }

    }
    public unloadFromId(id: string) {
        const pluginInfo = this.getPluginFromId(id);
        this.unload(pluginInfo);
    }
    public async unload(pluginInfo: PluginInfo) {
        try {
            this.emit('unload', pluginInfo)
            if (!pluginInfo.module) {
                return;
            }
            await pluginInfo.module.onUnmounted();
            pluginInfo.context?.destory();
            pluginInfo.status = PluginStatus.unload;
            // this.remove(pluginInfo)
            // 清除 require.cache 中的模块缓存
            delete require.cache[require.resolve(pluginInfo.main)];
            delete pluginInfo.module;
            delete pluginInfo.context;
            this.emit('unloaded', pluginInfo)
            // pluginInfo.onUnloadCallback.forEach(callbackfn => callbackfn())
            console.log(`插件 ${pluginInfo.manifest.name} 已卸载`);
        } catch (err) {
            this.emit('error', 'unload', pluginInfo, err as any)
            throw err;
        }
    }
    public async reload(pluginInfo: PluginInfo) {
        try {
            this.emit('reload', pluginInfo)
            if (pluginInfo.status === PluginStatus.load) {
                await this.unload(pluginInfo)
            }
            await this.load(pluginInfo as any)
            this.emit('reloaded', pluginInfo)
            return pluginInfo;
        } catch (err) {
            this.emit('error', 'reload', pluginInfo, err as any)
            throw err;
        }
    }
    public async getModule(pluginInfo: PluginInfo & PluginProxy) {
        if (!pluginInfo.module) {
            await this.load(pluginInfo)
        }
        return pluginInfo.proxy;
    }
    public getPluginFromDir(plugin_path: string) {
        for (const value of this.idMapping.values()) {
            if (value.dir === plugin_path) {
                return value;
            }
        }
        return;
    }
    public async loadPlugin(plugin_path: string, strict = true) {
        try {
            this.emit('scan', plugin_path)
            assert.ok(fs.existsSync(plugin_path), `插件目录不存在:${plugin_path}`)
            const exist = this.getPluginFromDir(plugin_path);
            if (exist) {
                return exist;
            }
            const manifestPath = path.join(plugin_path, 'manifest.json');
            if (!strict) {
                if (!fs.existsSync(manifestPath)) {
                    console.warn(`插件清单文件不存在，请检查此目录是否为插件目录:${manifestPath}`)
                    return;
                }
            } else {
                assert.ok(fs.existsSync(manifestPath), `插件清单文件不存在，请检查此目录是否为插件目录:${plugin_path}`)
            }
            const manifest = await this.loadManifest(manifestPath);
            console.log(`加载插件:${manifest.appId}`)
            const fromAppid = this.getPluginFromId(manifest.appId)
            if (fromAppid) {
                if (fromAppid.dir !== plugin_path) {
                    throw new Error(`组件id[${manifest.appId}]已经存在且不属于同一个插件,已加载位置${fromAppid.dir},加载位置${plugin_path}`)
                }
                return fromAppid;
            }
            const pluginMain = path.join(plugin_path, manifest.main);
            assert.ok(fs.existsSync(plugin_path), `插件入口文件不存在: ${pluginMain}`)
            // 动态加载插件入口文件
            const pluginInfo: PluginInfo & PluginProxy = {
                appId: manifest.appId,
                id: manifest.appId,
                manifest: manifest,
                name: manifest.name,
                main: pluginMain,
                dir: plugin_path,
                version: manifest.version,
                description: manifest.description,
                module: null,
                proxy: null,
                type: manifest.type as any,
                match: manifest.match,
                instruct: manifest.instruct,
                status: PluginStatus.ready,
                context: null,
                getModule() {
                    pluginInfo.proxy;
                },
            };
            this.add(pluginInfo)
            if (pluginInfo.type === PluginType.executor) {
                await this.load(pluginInfo)
            }
            console.log(`已加载插件信息,名称：${pluginInfo.name}，类型：${pluginInfo.type},位置:${pluginInfo.dir},主程序文件：${manifest.main}`)
            return pluginInfo;
        } catch (err) {
            this.emit('error', 'scan', plugin_path, err as any)
            throw err;
        }
    }

    // 加载所有插件
    async loadPluginFromDir(pluginsDir: string, errorCallback: (err: string, path: string) => void = null) {
        this.pluginDirs.add(pluginsDir);
        const pluginDirs = fs.readdirSync(pluginsDir);
        // 创建Promise数组来收集所有异步的this.loadPlugin调用
        for (const childDir of pluginDirs) {
            try {
                await this.loadPlugin(path.join(pluginsDir, childDir), false);
            } catch (error) {
                console.error(`Failed to load plugin from ${childDir}:`, error);
                if (errorCallback) {
                    // 调用用户提供的回调函数来处理错误
                    errorCallback(error, childDir);
                }
            }
        }
    }

    // 加载插件清单文件
    private async loadManifest(manifestPath: string) {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifestInfo = JSON.parse(content) as PluginManifest;
        // 检查 manifestInfo 中是否包含所有必需的键
        const missingKeys = manifest_keys.filter(key => !manifestInfo.hasOwnProperty(key));
        // 使用 assert 断言检查所有键是否存在
        assert.ok(missingKeys.length === 0, `清单文件至少包含 ${JSON.stringify(manifest_keys)} 属性，但缺少以下属性: ${JSON.stringify(missingKeys)}`);
        return manifestInfo;
    }
}

export default new PluginManager();
initBind();

