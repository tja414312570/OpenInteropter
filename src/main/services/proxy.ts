import { IProxyOptions, Proxy } from 'http-mitm-proxy'; // 导入 CommonJS 模块

import { info } from '../utils/logger'
import pluginManager from '@main/plugin/plugin-manager';
import { PluginStatus, PluginType } from '@lib/main';
import { Bridge } from '@lib/main';
import { dispatch } from './dispatcher';
import portscanner from 'portscanner';
function isUrlMatched(url, patterns) {
  return patterns.some(pattern => {
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/([.+?^${}()|[\]\\])/g, '\\$1');
    const regex = new RegExp('^' + regexPattern + '$');
    return regex.test(url);
  });
}
const map = new Map<String, Bridge>()
// 使用函数检查
export const getAgent = (domain: string) => {
  let module: Bridge = map.get(domain)
  if (!module) {
    const pluginsOfType = pluginManager.getPluginsFromType(PluginType.agent);
    for (const plugin of pluginsOfType) {
      const isMatch = isUrlMatched(domain, plugin.match);
      if (isMatch) {
        for (const [key] of map) {
          const value = map.get(key);
          map.delete(key);
          pluginManager.unload(value['_plugin'])
        }
        if (plugin.status !== PluginStatus.load) {
          pluginManager.load(plugin as any);
        }
        module = pluginManager.getModule(plugin as any);
        map.set(domain, module as any);
        break;
      }
    }
  }
  return module;
}
export const getAgentFromUrl = (url: string) => {
  const index = url.indexOf('://') + 3;
  const pathIndex = url.indexOf('/', index);
  let domain = url;
  if (pathIndex > -1) {
    domain = url.substring(0, pathIndex + 1)
  }
  return getAgent(domain);
}

export async function startProxyServer() {
  const proxy = new Proxy(); // 使用 http-mitm-proxy 创建代理实例
  // 拦截 HTTP 请求
  proxy.onRequest((ctx, callback) => {
    let domain: string;
    const origin = ctx.proxyToServerRequestOptions.headers['origin'];
    if (origin) {
      domain = origin + '/'; // 如果没有路径，直接使用整个 referer
    } else {
      const host = ctx.clientToProxyRequest.headers.host; // 获取主机名
      const protocol = ctx.isSSL ? 'https' : 'http';
      domain = `${protocol}://${host}/`;
    }
    ctx['_domain_'] = domain
    const module = getAgent(domain);
    if (module) {
      ctx['agent'] = module
      // 根据请求的协议构建完整的 URL
      module.onRequest(ctx);
    }
    callback(); // 继续请求
  });

  // 拦截 HTTP 响应
  proxy.onResponse((ctx, callback) => {
    const module = getAgent(ctx['_domain_']);
    if (module) {
      module.onResponse(ctx).then((body: string) => {
        if (body) {
          console.log("解析出数据：" + body)
          dispatch(ctx.serverToProxyResponse.headers, body);
        }
      });
    }
    callback(); // 继续请求
  })


  // 处理 ECONNRESET 错误
  process.on('uncaughtException', (err: any) => {
    if (err.code === 'ECONNRESET') {
      const errorLog = `Connection reset by peer: ${err}\n`;
      info(errorLog); // 写错误日志到文件
      console.warn('A connection was reset by the server:', err);
    } else {
      console.error('An unexpected error occurred:', err);
      info(`Unexpected error: ${err}\n`); // 写其他错误日志
    }
  });
  // proxy.onCertificateMissing = (ctx, files, callback) => {
  //   console.log('Looking for "%s" certificates', ctx.hostname);
  //   console.log('"%s" missing', ctx.files.keyFile);
  //   console.log('"%s" missing', ctx.files.certFile);

  //   // Here you have the last chance to provide certificate files data
  //   // A tipical use case would be creating them on the fly
  //   //
  //   // return callback(null, {
  //   //   key: keyFileData,
  //   //   cert: certFileData
  //   // });
  // };

  proxy.onError((ctx, err) => {
    console.error('Proxy error:', err);
  });

  let options: IProxyOptions = { port: 3001, host: '127.0.0.1' };
  // 判断是否需要使用上游代理
  // if (upstreamProxy) {
  //   const proxyUrl = `${upstreamProxy.protocol}//${upstreamProxy.host}:${upstreamProxy.port}`;
  //   info(`使用上游代理:${proxyUrl}`)
  //   options.httpAgent = new HttpProxyAgent(proxyUrl);
  //   options.httpsAgent = new HttpsProxyAgent(proxyUrl);
  // }
  (proxy as any)._onError_bak_ = proxy._onError;
  proxy._onError = (kind, ctx, err) => {
    if ((err as any).code === 'ERR_SSL_SSLV3_ALERT_CERTIFICATE_UNKNOWN') {
      // console.log(`忽略 SSL 错误: ${ctx.clientToProxyRequest.url}`);
      return;
    }
    (proxy as any)._onError_bak_(kind, ctx, err)
  }

  const getAvailableConfig = async (options: IProxyOptions): Promise<IProxyOptions> => {
    try {
      const status = await portscanner.checkPortStatus(options.port, options.host);
      if (status === 'open') {
        console.log(`端口 ${options.port} 已被使用.`);
        options.port += 1; // 增加端口
        return getAvailableConfig(options); // 递归调用
      } else {
        return options; // 端口可用，返回配置
      }
    } catch (err) {
      console.error(`检查端口时发生错误: ${err}`);
      throw err; // 抛出错误
    }
  };

  return new Promise<Proxy>(async (resolve, reject) => {
    getAvailableConfig(options).then(option => {
      proxy.listen(option, (err) => {
        if (err) {
          reject(err)
        } else {
          console.log(`http-mitm-proxy server started on port ${option.host}:${option.port}`);
          resolve(proxy);
        }
      });
    }).catch(err => {
      reject(err)
    })
  });
}
