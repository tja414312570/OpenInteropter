import { Proxy } from 'http-mitm-proxy';
import _ from 'lodash';
// or using import/module (package.json -> "type": "module")
// import { Proxy } from "http-mitm-proxy";
import http from 'http'
import { ModifableIncomingMessage } from '../lib/src/main';
http.IncomingMessage
const proxy = new Proxy();

proxy.onError(function (ctx, err) {
    console.error('proxy error:', err);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

proxy.onError(err => {
    console.error('proxy error:', err);
})
process.on('uncaughtException', (err: any) => {
    if (err.code === 'ECONNRESET') {
        const errorLog = `Connection reset by peer: ${err}\n`;
        console.log(errorLog); // 写错误日志到文件
        console.warn('A connection was reset by the server:', err);
    } else {
        console.error('An unexpected error occurred:', err);
        console.log(`Unexpected error: ${err}\n`); // 写其他错误日志
    }
});
proxy.onResponse(async (ctx, callback) => {
    const buffer = [];
    ctx.serverToProxyResponse?.on("data", (chunk) => {
        buffer.push(chunk);
    });

    ctx.serverToProxyResponse?.on('end', () => {
        console.log("解析出数据：" + Buffer.concat(buffer).toString());
    })

    callback(); // 继续请求
})
proxy.onRequest(async (ctx, callback) => {
    const requestData = ctx.clientToProxyRequest;
    const request = new ModifableIncomingMessage(requestData);
    request.reset((buffer, _callback) => {
        let requestBody = buffer.toString();
        console.log(
            "Original Request Body:",
            ctx.clientToProxyRequest.headers["content-length"],
            requestBody
        );
        const systemMessage = {
            id: _.uniqueId("system-"), // 生成唯一 ID
            author: { role: "system" },
            content: {
                content_type: "text",
                parts: ["this is system message"],
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
        ctx.proxyToServerRequestOptions!.headers["content-length"] = String(buffer_.length);
        console.log(
            "MODIFY Request Body:",
            ctx.proxyToServerRequestOptions.headers["content-length"],
            requestBody
        );
        _callback(buffer_)
        callback()
    })
    ctx.clientToProxyRequest = request;
    requestData.resume();
    ctx.onRequestData(async (ctx, chunk, callback) => {
        console.log('发送数据:', chunk.toString())
        return callback(null, chunk);
    });

});

console.log('begin listening on 8081')
proxy.listen({ port: 8081, host: '127.0.0.1' }, err => {
    console.log(err)
});
