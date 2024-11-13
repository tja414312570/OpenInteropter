import fs from 'fs';
import { app } from "electron";
import path from "path";
import settingManager from './service-setting';
import envManager from './env-manager';

const appPath = app.getPath('userData');

interface FromSetting<T = string> {
    key: string;
    default: T;
    before?: (value: T) => T | void;
}

interface Context {
    appPath: string;
    pluginPath: FromSetting;
    envPath: FromSetting;
    env: FromSetting<{ [key: string]: string }>;
    appEnv: FromSetting<{ [key: string]: string }>;
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
    },
    env: {
        key: 'general.env',
        default: {} as Record<string, string>,
        before: () => {
            return envManager.getProcessEnv();
        }
    },
    appEnv: {
        key: 'general.env',
        default: {} as Record<string, string>,
        before: () => {
            return envManager.getEnv();
        }
    }
};
const appContext = new Proxy(context, {
    get(target: any, prop: string | symbol, receiver: any): any {
        let value: any;
        if (prop in target && (value = target[prop]) !== undefined && value !== null) {
            if (typeof value === 'object' && 'key' in value && 'default' in value) {
                const settingKey = value['key'];
                let sValue = settingManager.get(settingKey) ?? value['default'];;
                const before = value['before'];
                if (before) {
                    sValue = before(sValue) || sValue;
                }
                value = sValue;
                settingManager.onValueChange(settingKey, (_value) => {
                    if (before) {
                        _value = before(_value) || _value;
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
process.env = appContext.env;
console.log(process.env)
type IContext = {
    [K in keyof Context]: Context[K] extends FromSetting<infer T> ? T : Context[K];
};
export default appContext as IContext;