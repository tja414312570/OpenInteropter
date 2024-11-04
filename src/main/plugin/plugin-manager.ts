import * as fs from 'fs';
import * as path from 'path';
import { PluginInfo, PluginManifest, PluginProxy, PluginStatus, PluginType } from '@lib/main';
import { v4 as uuidv4 } from 'uuid';
import { MapSet } from '../utils/MapSet';
import assert from 'assert';
import { PluginContext } from './plugin-context'
import '../ipc-bind/plugin-ipc-bind'

const manifest_keys: Array<string> = ['name', 'main', 'version', 'description', 'author', 'appId']
// 定义常见的特殊属性集合
const special_key_props = new Set(["toString", "valueOf", "then", "toJSON", "onMounted", "_init__"]);
// 插件管理类
class PluginManager {
    private pluginDirs: Set<string> = new Set();           // 插件目录
    private pluginSet: Set<PluginInfo> = new Set(); // 已加载的插件列表
    private idMapping: { [key: string]: PluginInfo } = {}
    private typeMapping: MapSet<PluginInfo> = new MapSet();
    constructor() {

    }
    add(pluginInfo: PluginInfo) {
        this.idMapping[pluginInfo.id] = pluginInfo;
        this.pluginSet.add(pluginInfo);
        this.typeMapping.add(pluginInfo.type, pluginInfo)
    }
    remove(pluginInfo: PluginInfo) {
        this.pluginSet.delete(pluginInfo)
        delete this.idMapping[pluginInfo.id];
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
        return this.idMapping[id];
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
        return new Promise<T>((resolve, rejects) => {
            let pluginsOfType: Array<PluginInfo> | PluginInfo | undefined = this.getPluginsFromType(type);
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
                resolve(this.getModule(pluginsOfType as PluginInfo & PluginProxy))
            }
            else if ((pluginsOfType instanceof Set)) {
                if (pluginsOfType.size === 1) {
                    const pluginInfo = pluginsOfType.values().next().value;
                    const module = this.getModule(pluginInfo as any);
                    resolve(module)
                } else {
                    //等待选择

                }
            }
        })
    }
    public load(pluginInfo: PluginInfo & PluginProxy) {
        assert.ok(pluginInfo.status === PluginStatus.ready || pluginInfo.status === PluginStatus.unload, `插件${pluginInfo.manifest.name}状态不正常：${pluginInfo.status}，不允许加载`)
        const orgin = require(pluginInfo.main) as any;
        assert.ok(orgin.default, `插件${pluginInfo.manifest.name}的入口文件没有提供默认导出,文件位置:${pluginInfo.manifest.main}`)
        assert.ok(typeof orgin.default === 'object' && orgin.default !== null, `插件${pluginInfo.manifest.name}的入口文件导出非对象,文件位置:${pluginInfo.manifest.main}`)
        pluginInfo.module = orgin.default; // 或使用 import(pluginEntryPath) 来加载模块
        pluginInfo.proxy = this.wrapperModule(pluginInfo);
        const pluginContext = new PluginContext(pluginInfo);
        pluginContext.register(pluginInfo);
        if (!fs.existsSync(pluginContext.workPath)) {
            fs.mkdirSync(pluginContext.workPath)
        }
        if ('_init__' in pluginInfo.module) {
            pluginInfo.module['_init__'](pluginContext)
        }
        pluginInfo.module.onMounted(pluginContext);
        pluginInfo.status = PluginStatus.load;
    }
    public unloadFromId(id: string) {
        const pluginInfo = this.getPluginFromId(id);
        this.unload(pluginInfo);
    }
    public unload(pluginInfo: PluginInfo) {
        if (!pluginInfo.module) {
            return;
        }
        pluginInfo.module.onUnmounted();
        pluginInfo.status = PluginStatus.unload;
        // this.remove(pluginInfo)
        // 清除 require.cache 中的模块缓存
        delete require.cache[require.resolve(pluginInfo.main)];
        delete pluginInfo.module;
        // pluginInfo.onUnloadCallback.forEach(callbackfn => callbackfn())
        console.log(`插件 ${pluginInfo.manifest.name} 已卸载`);
    }
    public reload(pluginInfo: PluginInfo) {
        pluginInfo.module.onUnmounted();
        pluginInfo.status = PluginStatus.unload;
        delete require.cache[require.resolve(pluginInfo.main)];
        pluginInfo.status = PluginStatus.ready;
        this.load(pluginInfo as any)
        // pluginInfo.onUnloadCallback.forEach(callbackfn => callbackfn())
        return pluginInfo;
    }
    public getModule(pluginInfo: PluginInfo & PluginProxy): any {
        if (!pluginInfo.module) {
            this.load(pluginInfo)
        }
        return pluginInfo.proxy;
    }
    public loadPlugin(plugin_path: string, strict = true) {
        assert.ok(fs.existsSync(plugin_path), `插件目录不存在:${plugin_path}`)
        const manifestPath = path.join(plugin_path, 'manifest.json');
        if (!strict) {
            if (!fs.existsSync(manifestPath)) {
                console.warn(`插件清单文件不存在，请检查此目录是否为插件目录:${manifestPath}`)
                return;
            }
        } else {
            assert.ok(fs.existsSync(manifestPath), `插件清单文件不存在，请检查此目录是否为插件目录:${plugin_path}`)
        }
        const manifest = this.loadManifest(manifestPath);
        const pluginMain = path.join(plugin_path, manifest.main);
        assert.ok(fs.existsSync(plugin_path), `插件入口文件不存在: ${pluginMain}`)
        // 动态加载插件入口文件
        const pluginInfo: PluginInfo & PluginProxy = {
            appId: manifest.appId,
            id: uuidv4(),
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
            getModule() {
                pluginInfo.proxy;
            },
        };
        this.add(pluginInfo)
        if (pluginInfo.type === PluginType.executor) {
            this.load(pluginInfo)
        }
        console.log(`已加载插件信息,名称：${pluginInfo.name}，类型：${pluginInfo.type},位置:${pluginInfo.dir},主程序文件：${manifest.main}`)
        return pluginInfo;
    }

    // 加载所有插件
    public loadPluginFromDir(pluginsDir: string) {
        this.pluginDirs.add(pluginsDir);
        const pluginDirs = fs.readdirSync(pluginsDir);
        for (const childDir of pluginDirs) {
            this.loadPlugin(path.join(pluginsDir, childDir), false)
        }
    }
    // 加载插件清单文件
    private loadManifest(manifestPath: string): PluginManifest | null {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifestInfo = JSON.parse(content) as PluginManifest;
        // 检查 manifestInfo 中是否包含所有必需的键
        const missingKeys = manifest_keys.filter(key => !manifestInfo.hasOwnProperty(key));
        // 使用 assert 断言检查所有键是否存在
        assert.ok(missingKeys.length === 0, `清单文件至少包含 ${JSON.stringify(manifest_keys)} 属性，但缺少以下属性: ${JSON.stringify(missingKeys)}`);
        return manifestInfo;
    }

    // // 根据 URL 匹配插件
    // public getPluginsByURL(url: string): PluginInfo[] {
    //     return this.plugins.filter((plugin) => {
    //         if (!plugin.match || plugin.match.length === 0) return false;
    //         return plugin.match.some((pattern) => this.urlMatch(url, pattern));
    //     });
    // }

    // // 简单的 URL 匹配函数（支持简单通配符匹配）
    // private urlMatch(url: string, pattern: string): boolean {
    //     const regex = new RegExp(
    //         '^' +
    //         pattern
    //             .replace(/\*/g, '.*')
    //             .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&') + '$'
    //     );
    //     return regex.test(url);
    // }
}

export default new PluginManager();

