import { buildProxy, getProxy, setNoProxy } from "@main/services/global-agents";
import { proxyRequest } from "@main/utils/nets";
import axios, { AxiosRequestConfig } from "axios";
import { ipcMain } from "electron";
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

ipcMain.handle('ipc-settings.proxy-test', async (event, proxyInfo, url) => {
    const oldProxy = getProxy()
    delete process.env.npm_config_proxy;
    delete process.env.npm_config_https_proxy;

    const newProxy = buildProxy(proxyInfo);
    setNoProxy(oldProxy.noProxy ? oldProxy.noProxy + ',' + url : url)
    const conf: AxiosRequestConfig = { timeout: 30000, proxy: false }
    if (newProxy.http) {
        conf.httpAgent = new HttpProxyAgent(newProxy.http);
        conf.httpsAgent = new HttpsProxyAgent(newProxy.http);
    }
    if (newProxy.https) {
        conf.httpAgent = new HttpProxyAgent(newProxy.https);
        conf.httpsAgent = new HttpsProxyAgent(newProxy.https);
    }
    try {
        axios.interceptors.request.use(request => {
            console.log('Starting Request', JSON.stringify(request, null, 2));
            return request;
        }, error => {
            console.error('请求错误:', error);
            return Promise.reject(error);
        });

        // 响应拦截器
        axios.interceptors.response.use(response => {
            console.log('Response:', JSON.stringify(response.data, null, 2));
            return response;
        }, error => {
            console.error('响应错误:', error);
            return Promise.reject(error);
        });
        // const response = await axios.get(url, conf);
        const httpResponse = await proxyRequest({
            proxyUrl: newProxy.http,
            targetUrl: url,
        });
        return { data: httpResponse }; // 返回解析后的数据
    } catch (error) {
        console.error(error)
        return { error }
        // return Promise.reject(error)
        // throw new Error(
        //     `Error fetching: ${(error as Error).message}`
        // );
    } finally {
        setNoProxy(oldProxy.noProxy)
    }
})