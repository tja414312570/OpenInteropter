import fs from 'fs';
import { app } from "electron";
import path from "path";
import settingManager from './service-setting';

const appPath = app.getPath('userData');

interface FromSetting {
    key: string;
    default: string;
    before: (path: string) => void;
}

interface Context {
    appPath: string;
    pluginPath: FromSetting;
    envPath: FromSetting;
}

const context: Context = {
    appPath,
    pluginPath: {
        key: 'general.plugin-path',
        default: path.join(appPath, 'plugins'),
        before: (path: string) => {
            if (!fs.existsSync(path)) {
                console.log(`插件目录不存在，正在创建${path}`);
                fs.mkdirSync(path);
            }
        }
    },
    envPath: {
        key: 'general.env-path',
        default: path.join(appPath, 'bin'),
        before: (path: string) => {
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path, { recursive: true });
            }
        }
    }
};
const appContext = new Proxy(context, {
    get(target: any, prop: string | symbol, receiver: any): any {
        let value: any;
        if (prop in target && (value = target[prop]) !== undefined && value !== null) {
            if (typeof value === 'object' && 'key' in value && 'default' in value) {
                const settingKey = value['key'];
                let sValue = settingManager.getSettingValue(settingKey);
                sValue = (sValue === undefined ? value['default'] : sValue);
                if ('before' in value) {
                    value['before'](sValue);
                }
                value = sValue;
                settingManager.onSettingChange(settingKey, (value) => {
                    context[prop] = value
                })
                context[prop] = value
            }
            return value;
        } else {
            throw new Error(`属性[${String(prop)}]在上下文中未初始化`)
        }
    }
})
type IContext = {
    [K in keyof Context]: string;
};
export default appContext as IContext;