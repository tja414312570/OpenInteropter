import { ExtensionContext } from "./plugin-defined";

let context = {} as any;
const extensionContext = new Proxy(context, {
    get(target: any, prop: string | symbol, receiver: any): any {
        let value;
        if (prop in context && (value = context[prop]) !== undefined && value !== null) {
            return context[prop];
        } else {
            throw new Error(`属性[${String(prop)}]在上下文中未初始化`)
        }
    }
})
const _setContext = (ctx: any) => {
    context = ctx;
}
export { _setContext }
export default extensionContext as ExtensionContext;