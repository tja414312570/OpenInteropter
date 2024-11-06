import { ExtensionContext } from "../../../lib/src/main/plugin";
import { _setContext } from "./plugin-context";

export class AbstractPlugin {
    _init__(ctx: ExtensionContext) {
        _setContext(ctx)
    }
}