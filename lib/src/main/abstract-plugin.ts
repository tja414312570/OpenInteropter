import { PluginExtensionContext } from "../../../lib/src/main/plugin";
import { _setContext } from "./plugin-context";

export class AbstractPlugin {
    _init__(ctx: PluginExtensionContext) {
        _setContext(ctx)
    }
}