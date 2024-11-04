import { PluginExtensionContext } from "./plugin";
import { Pluginlifecycle } from "./plugin-lifecycle";

const context = {
    register(plugin: Pluginlifecycle & any): void {
        console.log(`注册组件:${plugin.name}}`)
    },
    remove(plugin: Pluginlifecycle & any): void {
        console.log(`移除组件${plugin.name}}`)
    }
};
const extensionContext = new Proxy(context, {
    get(target: any, prop: string | symbol, receiver: any): any {
        let value;
        if (prop in target && (value = target[prop]) !== undefined && value !== null) {
            return target[prop];
        } else {
            throw new Error(`属性[${String(prop)}]在上下文中未初始化`)
        }
    }
})
export default extensionContext as PluginExtensionContext;