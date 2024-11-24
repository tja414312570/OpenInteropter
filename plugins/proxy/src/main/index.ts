import {
  AbstractPlugin,
  Bridge,
  ExtensionContext,
  IpcApi,
  pluginContext,
  Pluginlifecycle,
  ModifableIncomingMessage,
} from "mylib/main";
import { IContext, OnRequestDataCallback } from "http-mitm-proxy";
import { decompressedBody } from "./decode";
import { processResponse } from "./dispatcher";
import { URL } from "url";
import props from "./promtps";
import _ from "lodash";
import path from "path";
import fs from "fs/promises";

class ChatGptBridge extends AbstractPlugin implements Bridge, Pluginlifecycle {
  ipcApi: IpcApi | undefined;
  renderScript(): Promise<string | void> {
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
  preloadScript(): Promise<string | void> {
    return new Promise((resolve, reject) => {
      const path_ = path.join(
        // "file://",
        path.join(__dirname, "preload", "index.js")
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
      const accept = ctx.clientToProxyRequest.headers["accept"] || "";
      if (accept.includes("text/event-stream")) {
        const requestData = ctx.clientToProxyRequest;
        const request = new ModifableIncomingMessage(requestData);
        request.reset(async (buffer, _callback) => {
          let requestBody = buffer.toString();
          console.log(
            "原始请求:",
            ctx.clientToProxyRequest.headers["content-length"],
            requestBody
          );
          const systemMessage = {
            id: _.uniqueId("system-"), // 生成唯一 ID
            author: { role: "system" },
            content: {
              content_type: "text",
              parts: [await props()],
            },
            metadata: {
              serialization_metadata: { custom_symbol_offsets: [] },
            },
            create_time: Date.now() / 1000, // 当前时间戳
          };
          let bodyJson = JSON.parse(requestBody);
          bodyJson.messages = _.concat([systemMessage], bodyJson.messages);
          requestBody = JSON.stringify(bodyJson);
          const buffer_ = Buffer.from(requestBody);
          ctx.proxyToServerRequestOptions!.headers["content-length"] = String(
            buffer_.length
          );
          console.log(
            "修改后的请求:",
            ctx.proxyToServerRequestOptions!.headers["content-length"],
            requestBody
          );
          _callback(buffer_);
          resolve();
        });
        ctx.clientToProxyRequest = request;
        requestData.resume();
      } else {
        resolve();
      }
    });
    //   let body: Uint8Array[] = [];
    //   requestData
    //     .on("data", (chunk) => {
    //       body.push(chunk);
    //     })
    //     .on("end", () => {

    //       // const logData = `请求拦截: ${requestData.url}\nRequest Body: ${body}\n`;
    //       // console.log(logData);
    //       i
    //       resolve(requestBody);
    //     });
    // });
  }
  onResponse(ctx: IContext): Promise<string | void> {
    return new Promise<string | void>(async (resolve) => {
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
      // 非静态资源（例如 JSON 或 API 响应），可能是 fetch 请求
      // console.log("拦截处理:" + requestOptions.host + "" + requestOptions.path + "，上下文类型:" + contentType);
      // let logData = `拦截处理:${requestOptions?.method}:${requestOptions?.port === 443 ? 'https' : 'http'}://${requestOptions?.host}${requestOptions?.path}\n`;
      const start = performance.now();
      const decodeResult = await decompressedBody(ctx);
      // logData += `响应数据: ${decodeResult}\n`;
      // console.log(logData);
      const sseData = processResponse(response?.headers, decodeResult);
      const end = performance.now();
      console.log(`gpt解析数据耗时： ${(end - start).toFixed(2)} ms`);
      resolve(sseData);
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
    console.log("proxy代理已挂载");
    this.ipcApi = pluginContext.getIpcApi("agent");
    this.ipcApi.on("ready", async (event, urlString) => {
      console.log("请求地址:", urlString);
      const path = this.getPathFromUrl(urlString);
      if (path?.trim() === "/") {
        // this.send(await props());
      }
      console.log(`插件已就绪:[${path}]`);
    });
  }
  async send(props: string) {
    this.ipcApi?.send("send-content", props);
  }
  onUnmounted(): void {
    this.ipcApi?.removeHandler("ready");
  }
}
export default new ChatGptBridge();
