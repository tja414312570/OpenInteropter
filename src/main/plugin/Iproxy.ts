export const wrapper = <T>(target: any): T => {
    return new Proxy({ target }, {
        get(proxyTarget, props) {
            // 注意这里的 proxyTarget 是 { target }，所以需要访问 target.target
            return (...args: any) => proxyTarget.target[props](...args);
        }
    }) as T;
}
