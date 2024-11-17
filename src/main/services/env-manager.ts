import path from 'path'
import settingManager from './service-setting'
import { v4 as uuid } from 'uuid'
import appContext from './app-context'
import fs from 'fs/promises'
import { showErrorDialog } from '@main/utils/dialog'
import EventEmitter from 'events'
import { EnvEventMap } from '@lib/main'

export type EnvVariable = {
    id?: string
    name: string
    value: string
    source: string
    path: boolean
    status?: 'enable' | 'disable'
}
const Env_Setting_Key = 'general.env';

export const ENV_PATH_KEY = Object.keys(process.env).find(key => key.toLowerCase() === 'path') || 'PATH';

class EnvManager extends EventEmitter<EnvEventMap> {
    getAll() {
        return settingManager.get<Array<EnvVariable>>(Env_Setting_Key);
    }
    getEnv() {
        const envs = this.getAll() || [];;
        const result: Record<string, string> = {};
        let env_path = '';
        for (const env of envs) {
            if (env.status === 'disable') {
                continue;
            }
            if (env.path !== false) {
                env_path += `${env.value}${path.delimiter}`;
            }
            result[env.name] = env.value;
        }
        result[ENV_PATH_KEY] = env_path;
        return result;
    }
    getProcessEnv() {
        const env = this.getEnv();
        if (!env) return process.env;
        const env_path = env[ENV_PATH_KEY] || '';;
        delete env[ENV_PATH_KEY];
        process.env = {
            ...process.env,
            ...env,
            [ENV_PATH_KEY]: `${env_path}${path.delimiter}${process.env[ENV_PATH_KEY] || ''}`
        };
        return process.env;
    }
    foundEnv(name: string, envs = this.getAll()) {
        if (envs) {
            for (const env of envs) {
                if (env.name === name) {
                    return env;
                }
            }
        }
    }
    foundEnvById(id: string, envs = this.getAll()) {
        if (envs) {
            for (const env of envs) {
                if (env.id === id) {
                    return env;
                }
            }
        }
    }
    get(name: string) {
        return this.foundEnv(name)
    }
    getValue(name: string) {
        return this.get(name)?.value
    }
    async setEnv(env: EnvVariable | string, value?: string, path = true) {
        if (typeof env === 'object') {
            if (!env.name || !env.value || !env.source) {
                throw new Error('环境名称、值、创建者必填!')
            }
        } else {
            if (!env || !value) {
                throw new Error('环境名称、值必填!')
            }
            env = {
                name: env,
                value,
                path,
                source: 'Default'
            }
        }
        if (!Object.hasOwn(env, 'path')) {
            env.path = path;
        }
        env.status = env.status || 'enable'
        const envs = this.getAll();
        const exist_env = env.id ? this.foundEnvById(env.id, envs) : this.foundEnv(env.name, envs);
        if (exist_env) {
            Object.assign(exist_env, env);
        } else {
            env.id = env.id || uuid();
            envs.push(env);
        }
        // 保存更新后的环境变量列表，捕获保存错误
        try {
            await settingManager.save(Env_Setting_Key, envs);
        } catch (error) {
            throw new Error('无法保存环境变量，请重试！', { cause: error });
        }
    }
    async disable(name: string) {
        await this.setStatus(name, 'disable')
    }
    async enable(name: string) {
        await this.setStatus(name, 'enable')
    }
    async setStatus(name: string, status: EnvVariable['status']) {
        const envs = this.getAll();
        const exist_env = this.foundEnv(name, envs);
        if (!exist_env) {
            throw new Error(`没有找到环境变量${name}`)
        }
        exist_env.status = status;
        // 保存更新后的环境变量列表，捕获保存错误
        await this.save(envs);
    }

    async delete(...names: string[]) {
        const envs = this.getAll();
        for (const name of names) {
            const index = envs.findIndex(item => item.name === name);
            if (index < 0) {
                throw new Error(`没有找到环境变量${name}`)
            }
            envs.splice(index, 1);
        }
        await this.save(envs)
    }

    private async save(envs: EnvVariable[]) {
        try {
            await settingManager.save(Env_Setting_Key, envs);
        } catch (error) {
            throw new Error('无法保存环境变量，请重试！', { cause: error });
        }
    }

}

const envManager = new EnvManager();
export default envManager;
settingManager.onValueChange(Env_Setting_Key, vallue => {
    const env = envManager.getEnv();
    envManager.emit('change')
})
settingManager.register({
    name: "环境设置",
    key: "env",
    default: [],
}, 'general')