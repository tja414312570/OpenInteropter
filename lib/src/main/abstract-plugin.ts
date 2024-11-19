import { _setContext } from "./plugin-context";
import { ExtensionContext } from "./plugin-defined";

export class AbstractPlugin {
    _init__(ctx: ExtensionContext) {
        _setContext(ctx)
    }
}