import { ExtensionContext } from "./plugin"

/**
 * 插件生命周期
 */
export interface Pluginlifecycle {
    /**
     * 加载插件
     */
    onMounted(ctx: ExtensionContext): Promise<void>
    /**
     * 卸载插件
     */
    onUnmounted(): void
}