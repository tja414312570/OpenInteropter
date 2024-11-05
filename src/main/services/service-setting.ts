import { app } from "electron";
import path from "path";
import { access, constants, readFile, writeFile } from "fs/promises";
import assert from "assert";
import _ from 'lodash';
import '../ipc-bind/setting-ipc-bind'
import EventEmitter from "events";
import { ISetting, ISettingManager } from "@lib/main";
import { accessSync, readFileSync } from "fs";
import { showErrorDialog } from "@main/utils/dialog";

const userDataPath = app.getPath('userData');
const configPath = path.join(userDataPath, 'settings.json')
console.log("配置地址", configPath)

const settins_menu: Array<ISetting> = [
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

class SettingManager implements ISettingManager {
    private eventer = new EventEmitter();
    private cache: any;
    private state: 'read' | 'write' | 'empty' = 'empty'
    private lock = 0;
    constructor() { }
    onSettingChange(path: string, callback: (value: any) => void) {
        this.eventer.on("SettingChange", callback);
    };
    registeSetting(menus: ISetting | Array<ISetting>, path_?: string) {
        if (!menus || (Array.isArray(menus) && menus.length === 0)) {
            throw new Error("空菜单项")
        }
        if (!Array.isArray(menus)) {
            menus = [menus];
        }
        let _target_menus = settins_menu;
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
        }
    }
    getSettingValue = (key: string) => {
        const config = this.getSettingConfig();
        const value = _.get(config, key)
        return value;
    }
    saveSettingValue = (key: string | object, value?: any) => {
        const config = this.getSettingConfig();
        if (typeof key === 'string') {
            const currentValue = _.get(config, key);
            if (_.isEqual(currentValue, value)) { // 值相同时跳过写入
                return Promise.resolve();
            }
            _.set(config, key, value);
            this.eventer.emit("SettingChange", value);
        } else {
            let hasNews = false;
            for (const path in key) {
                const currentValue = _.get(config, path);
                value = key[path];
                if (!_.isEqual(currentValue, value)) { // 值相同时跳过写入
                    _.set(config, path, value);
                    this.eventer.emit("SettingChange", value);
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
        if (this.lock > 1) return; // 只允许首次进入写操作，后续重复调用无效
        const configStr = JSON.stringify(this.cache, null, 2);
        try {
            while (this.lock > 0) {
                await writeFile(configPath, configStr, 'utf8');
                this.lock = 0; // 重置锁
            }
        } catch (err) {
            showErrorDialog("写入设置文件异常，当前设置未保存成功!" + err);
            throw err;
        }
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
        return path ? foundSetting(path) : settins_menu;
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
generateMenuPath(settins_menu);
function foundSetting(target: string, _menus = settins_menu): ISetting | null {
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
