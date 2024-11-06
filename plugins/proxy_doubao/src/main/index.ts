import {
  AbstractPlugin,
  Bridge,
  pluginContext,
  ExtensionContext,
} from "mylib/main";
import { Pluginlifecycle } from "mylib/main";
import { IContext } from "http-mitm-proxy";
import { decompressedBody } from "./decode";
import { processResponse } from "./dispatcher";
import { URL } from "url";
import props from "./promtps";
import path from "path";
import { SseHandler } from "./doubao";
import fs from "fs/promises";

class ChatGptBridge extends AbstractPlugin implements Bridge, Pluginlifecycle {
  requireJs(): Promise<string | void> {
    return new Promise((resolve, reject) => {
      const path_ = path.join(
        // "file://",
        path.join(__dirname, "render", "js_bridge.js")
      );
      fs.readFile(path_, "utf-8")
        .then((script) => {
          resolve(script);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  onRequest(ctx: IContext): Promise<string | void> {
    // console.log("请求", ctx.proxyToServerRequestOptions.host)
    return new Promise<string | void>((resolve, rejects) => {
      const requestData = ctx.clientToProxyRequest;

      let body: Uint8Array[] = [];
      requestData
        .on("data", (chunk) => {
          body.push(chunk);
        })
        .on("end", () => {
          const requestBody = Buffer.concat(body).toString();
          // const logData = `请求拦截: ${requestData.url}\nRequest Body: ${body}\n`;
          // console.log(logData);
          resolve(requestBody);
        });
    });
  }
  onResponse(ctx: IContext): Promise<string | void> {
    return new Promise<string | void>(async (resolve, reject) => {
      const response = ctx.serverToProxyResponse;
      // 获取响应的 Content-Type
      const contentType = response?.headers["content-type"] || "";
      // 检查是否是静态资源，如 HTML、CSS、图片等
      const isStaticResource =
        contentType.includes("html") || // HTML 页面
        contentType.includes("css") || // CSS 样式表
        contentType.includes("image") || // 图片（如 png, jpg, gif 等）
        contentType.includes("javascript") || // JS 文件
        contentType.includes("font"); // 字体文件
      if (isStaticResource) {
        if (response) {
          response.headers["cache-control"] = "max-age=21600";
          // 如果有需要，还可以修改 Expires 头
          const expiresDate = new Date(Date.now() + 21600 * 1000).toUTCString();
          response.headers["expires"] = expiresDate;
        }
        resolve();
        return;
      }
      if (!contentType.includes("text/event-stream")) {
        resolve();
        return;
      }
      // 非静态资源（例如 JSON 或 API 响应），可能是 fetch 请求
      // console.log("拦截处理:" + requestOptions.host + "" + requestOptions.path + "，上下文类型:" + contentType);
      // let logData = `拦截处理:${requestOptions?.method}:${requestOptions?.port === 443 ? 'https' : 'http'}://${requestOptions?.host}${requestOptions?.path}\n`;
      const start = performance.now();
      const handler = new SseHandler();
      handler.onMessage((message) => {});
      handler.onEnd((data: any) => {
        const end = performance.now();
        console.log(
          `dubo解析数据耗时： ${(end - start).toFixed(2)} ms\r\n${data}\r\n`
        );
        resolve(data.message?.ttsContent);
      });
      handler.onError((err) => {
        reject(err);
      });
      response?.setEncoding("utf-8");
      response?.on("data", (chunk) => {
        handler.feed(chunk);
      });

      // response?.on('end', () => {
      //   handler.feed(``);
      // })
      response?.on("error", (err) => {
        reject(err);
      });
    });
  }

  getPathFromUrl(urlString: string) {
    try {
      const url = new URL(urlString);
      return url.pathname; // 返回路径部分
    } catch (error) {
      console.error("Invalid URL:", error);
      pluginContext.showDialog({
        type: "error",
        message: `无效的地址:${urlString}`,
      });
    }
  }
  async onMounted(ctx: ExtensionContext) {
    console.log("doubao代理已挂载");
    pluginContext.ipcMain.handle(
      "webview-api.webview.agent.ready",
      (event, urlString) => {
        console.log("请求地址:", urlString);
        const path = this.getPathFromUrl(urlString);
        if (path?.trim() === "/") {
          this.send2webview(props);
        }
        console.log(`插件已就绪:[${path}]`);
        // pluginContext.showDialog({
        //   message: '插件已就绪！'
        // }).then(result=>{
        //   console.log("对话框点击")
        // })
      }
    );
  }
  send2webview(props: string) {
    pluginContext.sendIpcRender("webview-api.send-content", props);
  }
  onUnmounted(): void {
    pluginContext.ipcMain.removeHandler("webview-api.webview.agent.ready");
  }
}
export default new ChatGptBridge();
