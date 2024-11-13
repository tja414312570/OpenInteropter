import fs from 'fs';
import { app } from "electron";
import path from "path";
import settingManager from './service-setting';

const appPath = app.getPath('userData');

interface FromSetting<T = string> {
    key: string;
    default: T;
    before: (path: T) => void;
}

interface Context {
    appPath: string;
    pluginPath: FromSetting;
    envPath: FromSetting;
    env: FromSetting<{ [key: string]: string }>;
}

const process_env = { ...process.env };

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
    },
    env: {
        key: 'general.env',
        default: {},
        before: (path: {}) => {
            Object.assign(path, process_env)
            process.env = path
        }
    }
};
const appContext = new Proxy(context, {
    get(target: any, prop: string | symbol, receiver: any): any {
        let value: any;
        if (prop in target && (value = target[prop]) !== undefined && value !== null) {
            if (typeof value === 'object' && 'key' in value && 'default' in value) {
                const settingKey = value['key'];
                let sValue = settingManager.get(settingKey);
                sValue = (sValue === undefined ? value['default'] : sValue);
                const before = value['before'];
                if (before) {
                    before(sValue);
                }
                value = sValue;
                settingManager.onValueChange(settingKey, (_value) => {
                    if (before) {
                        before(_value);
                    }
                    context[prop] = _value
                })
                context[prop] = value
            }
            return value;
        } else {
            throw new Error(`属性[${String(prop)}]在上下文中未初始化.`)
        }
    }
})
const pathKey = Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'PATH';
// context.env = { ...process.env, [pathKey]: `${appContext.envPath.replaceAll(' ', '\\ ')}${path.delimiter}${process.env[pathKey]}` };
process.env = appContext.env;
type IContext = {
    env: { [key: string]: string };
} & {
    [K in keyof Omit<Context, "env">]: string;
};
export default appContext as IContext;