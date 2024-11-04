import { PluginExtensionContext } from "../../../lib/src/main/plugin";
import pluginContext from "./plugin-context";

export class AbstractPlugin {
    _init__(ctx: PluginExtensionContext) {
        for (const key in ctx) {
            (pluginContext as any)[key] = (ctx as any)[key];
        }
    }
}