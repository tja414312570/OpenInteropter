process.env.DEBUG = 'global-agent';
import { createGlobalProxyAgent, bootstrap, ProxyAgentConfigurationType } from "global-agent";
import settingManager from "./service-setting";
import '../ipc-bind/proxy-ipc-bind'
bootstrap();
settingManager.registeSetting({
  name: "代理设置",
  key: "proxy",
}, 'network')
export const globalProxyAgent: ProxyAgentConfigurationType = createGlobalProxyAgent({});
export type Proxy = {
  http?: string | undefined,
  https?: string | undefined,
  type?: 'none' | 'http' | 'https' | 'socket5' | undefined,
  noProxy?: string | undefined
}
interface ProxySettings {
  proxyType: 'none' | 'auto' | 'manual'
  autoProxyUrl: string
  manualProxyType: 'http' | 'socks' | 'https'
  hostname: string
  port: number
  noProxy: string
  useAuth: boolean
  username: string
  password: string
  remember: boolean
}

export const buildProxy = (proxy: ProxySettings): Proxy => {
  if (!proxy || proxy.proxyType === 'none') {
    return {};
  }
  const { noProxy } = proxy
  if (proxy.proxyType === 'auto') {
    return proxy.autoProxyUrl.startsWith('http') ?
      { http: proxy.autoProxyUrl, noProxy }
      : { https: proxy.autoProxyUrl, noProxy }
  }
  const url = assembleProxyUrl('http', proxy.hostname, proxy.port, proxy.username, proxy.password)
  return proxy.manualProxyType === 'http' ? { http: url, noProxy } : { https: url, noProxy }
}

function assembleProxyUrl(protocol: string, hostname: string, port: number, username: string, password: string) {
  let proxyUrl = `${protocol}://`;
  // 如果有用户名和密码，添加认证信息
  if (username && password) {
    proxyUrl += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  // 添加主机名和端口
  proxyUrl += `${hostname}:${port}`;

  return proxyUrl;
}

export const setProxy = (proxy: Proxy) => {
  if (proxy.http) {
    setHttpsProxy(proxy.http);
    setHttpProxy(proxy.http)
    setNoProxy(proxy.noProxy)
  } else if (proxy.https) {
    setHttpProxy(proxy.https);
    setHttpsProxy(proxy.https)
    setNoProxy(proxy.noProxy)
  } else {
    setHttpProxy('');
    setHttpsProxy('');
  }
}

(async () => {
  // await saveSettingValue('net.proxy', { http: 'http://127.0.0.1:7890', https: 'https://127.0.0.1:7890' });
  const proxySettings = await settingManager.getSettingValue('network.proxy') as ProxySettings;
  const proxy = buildProxy(proxySettings);
  setProxy(proxy)
  console.log("代理设置", proxySettings, proxy)
  settingManager.onSettingChange('network.proxy', (value: ProxySettings) => {
    const proxy = buildProxy(value);
    setProxy(proxy)
    console.log("代理设置", value, proxy, getProxy())
  })
})();

export const setHttpProxy = (proxy: String | null) => {
  if (proxy && proxy.length > 0) {
    (global as any).GLOBAL_AGENT.HTTP_PROXY = proxy;
  } else {
    delete (global as any).GLOBAL_AGENT.HTTP_PROXY
  }
}
export const setHttpsProxy = (proxy: String | null) => {
  if (proxy && proxy.length > 0) {
    (global as any).GLOBAL_AGENT.HTTPS_PROXY = proxy;
  } else {
    delete (global as any).GLOBAL_AGENT.HTTPS_PROXY
  }
}
export const setNoProxy = (urls: String | null) => {
  if (urls && urls.length > 0) {
    (global as any).GLOBAL_AGENT.NO_PROXY = urls;
  } else {
    delete (global as any).GLOBAL_AGENT.NO_PROXY
  }
}
export const getProxy = (): Proxy => {
  return {
    http: (global as any).GLOBAL_AGENT.HTTP_PROXY,
    https: (global as any).GLOBAL_AGENT.HTTPS_PROXY,
    noProxy: (global as any).GLOBAL_AGENT.NO_PROXY
  }
}