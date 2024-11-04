import { PluginExtensionContext } from "./plugin"

/**
 * 插件生命周期
 */
export interface Pluginlifecycle {
    /**
     * 加载插件
     */
    onMounted(ctx: PluginExtensionContext): void
    /**
     * 卸载插件
     */
    onUnmounted(ctx: PluginExtensionContext): void
}