import { app } from "electron";
import path, { resolve } from "path";
import { access, constants, readFile, writeFile } from "fs/promises";
import assert from "assert";
import _ from 'lodash';
import '../ipc-bind/setting-ipc-bind'
import EventEmitter from "events";
import { ISetting, ISettingManager, SettingEventMap } from "@lib/main";
import { accessSync, readFileSync } from "fs";
import { showErrorDialog } from "@main/utils/dialog";

const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'settings.json')
console.log("配置地址", configPath)

const settins_list: Array<ISetting> = [
    {
        name: "通用",
        key: "general",
        subs: [
            {
                name: "测试",
                key: "test",
                hide: true,
            }
        ]
    },
    {
        name: "网络",
        key: "network",
    },
    {
        name: "外观",
        key: "appearance",
    },
    {
        name: "插件",
        key: "plugins",
    }
];
class SettingManager extends EventEmitter<SettingEventMap> implements ISettingManager {
    private cache: any;
    private state: 'read' | 'write' | 'empty' = 'empty'
    private lock = 0;
    constructor() {
        super();
    }
    onValueChange(key: string, listener: (value: any) => void) {
        this.on(`change.${key}`, listener)
        return () => this.off(`change.${key}`, listener);
    }
    offAllValueChange(key: string) {
        this.removeAllListeners(key)
    }
    removeSignale(target: string, menu_array = settins_list, path_: string = target) {
        const index = target.indexOf(".");
        const currentKey = index > 1 ? target.substring(0, index) : target;
        const remainingPath = index > 1 ? target.substring(index + 1) : null;
        for (let i = 0; i < menu_array.length; i++) {
            const menu = menu_array[i];
            if (menu.key === currentKey) {
                if (remainingPath) {
                    if (menu.subs) {
                        this.removeSignale(remainingPath, menu.subs, path_);
                    }
                } else {
                    menu_array.splice(i, 1);
                    this.emit('remove', path_, menu);
                    break;
                }
            }
        }
    }
    remove(menus: ISetting | ISetting[]): void {
        if (!Array.isArray(menus)) {
            menus = [menus];
        }
        for (const menu of menus) {
            assert.ok(menu.path, "菜单项必须有path")
            this.removeSignale(menu.path)
        }
    }
    async register(menus: ISetting | Array<ISetting>, path_?: string) {
        if (!menus || (Array.isArray(menus) && menus.length === 0)) {
            throw new Error("空菜单项")
        }
        if (!Array.isArray(menus)) {
            menus = [menus];
        }
        let _target_menus = settins_list;
        let foundMenu: ISetting;
        if (path_) {
            foundMenu = foundSetting(path_);
            assert.ok(foundMenu, `菜单路径[${path_}]没有找到`)
            if (!foundMenu.subs) {
                foundMenu.subs = [];
            }
            _target_menus = foundMenu.subs;
        }
        for (const menu of menus) {
            assert.ok(menu.key && menu.name, "菜单项必须有key和name")
            // assert.ok(!menu.subs && menu.page, `菜单[${menu}]必须设置界面`)
            for (const _exist_menu of _target_menus) {
                assert.ok(_exist_menu.name !== menu.name, `菜单名[${menu.name}]已被使用`)
                assert.ok(_exist_menu.key !== menu.key, `菜单名[${menu.name}]已被使用`)
            }
            generateMenuPath(menu, foundMenu?.path)
            _target_menus.push(menu);
            this.emit('add', foundMenu ? foundMenu.path : '', menu);
        }
        return menus;
    }
    get = (key: string) => {
        const config = this.getSettingConfig();
        const value = _.get(config, key)
        return value;
    }
    save = (key: string | Record<string, any>, value?: any) => {
        const config = this.getSettingConfig();
        if (typeof key === 'string') {
            const currentValue = _.get(config, key);
            if (_.isEqual(currentValue, value)) { // 值相同时跳过写入
                return Promise.resolve();
            }
            _.set(config, key, value);
            this.emit('change', key, value);
            this.emit(`change.${key}`, value)
        } else {
            let hasNews = false;
            for (const path in key) {
                const currentValue = _.get(config, path);
                value = key[path];
                if (!_.isEqual(currentValue, value)) { // 值相同时跳过写入
                    _.set(config, path, value);
                    this.emit('change', path, value);
                    this.emit(`change.${key}`, value)
                    hasNews = true;
                }
            }
            if (!hasNews) {
                return Promise.resolve();
            }
        }
        this.cache = config;
        return this.write();
    }
    write = async () => {
        this.lock++;
        if (this.state === 'write') {
            return;
        }
        this.state = 'write'
        const currentLock = this.lock;
        const configStr = JSON.stringify(this.cache, null, 2);
        writeFile(configPath, configStr, 'utf8').then(() => {
            this.state = 'empty'
            if (currentLock != this.lock) {
                this.write()
            }
        }).catch(err => {
            showErrorDialog("写入设置文件异常，当前设置未保存成功!" + err)
            throw err;
        });
    }
    getSettingConfig = () => {
        // 先检查文件是否存在
        if (!this.cache) {
            try {
                accessSync(configPath, constants.F_OK);
                const data = readFileSync(configPath, 'utf8');
                this.cache = JSON.parse(data);
            } catch (err) {
                // 如果文件不存在，创建文件并返回空对象
                if (err.code === 'ENOENT') {
                    return {};
                } else {
                    showErrorDialog('设置文件异常！请检查设置文件:' + configPath)
                    // 如果是其他错误，则抛出
                    throw new Error("读取文件时异常" + configPath, { cause: err });
                }
            }
        }
        return this.cache;
    }
    getSettings = (path?: string) => {
        return path ? foundSetting(path) : settins_list;
    }
}

/**
 * 为菜单项生成路径
 * @param menu - 单个菜单项或菜单项数组
 * @param parentPath - 可选的父路径，如果没有传入则默认空字符串
 */
function generateMenuPath(menu: ISetting | ISetting[], parentPath?: string): void {
    if (Array.isArray(menu)) {
        // 如果是数组，递归处理每个子菜单
        menu.forEach((item) => generateMenuPath(item, parentPath));
    } else {
        // 生成当前菜单的路径
        menu.path = parentPath ? `${parentPath}.${menu.key}` : menu.key;
        // 如果有子菜单，递归处理子菜单
        if (menu.subs && menu.subs.length > 0) {
            generateMenuPath(menu.subs, menu.path);
        }
    }
}
generateMenuPath(settins_list);
function foundSetting(target: string, _menus = settins_list): ISetting | null {
    const index = target.indexOf(".");
    const current = target.substring(0, index > 1 ? index : target.length);
    const remain = index > 1 ? target.substring(index + 1, target.length) : null;
    for (const menu of _menus) {
        if (menu.key === current) {
            if (remain) {
                if (menu.subs) {
                    return foundSetting(remain, menu.subs);
                }
            } else {
                return menu;
            }
        }
    }
    return null;
}

export default new SettingManager(); 
