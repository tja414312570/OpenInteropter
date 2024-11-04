import * as net from "net";
import * as tls from "tls";
import { URL } from "url";

interface ProxyRequestOptions {
  proxyUrl?: string; // 允许代理地址为空
  targetUrl: string;
  timeout?: number; // 允许设置超时（毫秒）
}

function proxyRequest({
  proxyUrl,
  targetUrl,
  timeout = 5000,
}: ProxyRequestOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const target = new URL(targetUrl);
      const targetHost = target.hostname;
      const targetPort = target.protocol === "https:" ? 443 : 80;

      // 定义一个超时处理函数
      const handleTimeout = (socket: net.Socket | tls.TLSSocket) => {
        socket.destroy(); // 超时后销毁连接
        reject(`Request timed out after ${timeout} ms`);
      };

      // 如果没有代理，直接通过 net 和 tls 发起请求
      if (!proxyUrl) {
        console.log("No proxy, direct request to target server");

        const clientSocket =
          target.protocol === "https:"
            ? tls.connect({ host: targetHost, port: targetPort }, () => {
                console.log("Connected to target server via TLS");
                const httpsRequest =
                  `GET ${target.pathname} HTTP/1.1\r\n` +
                  `Host: ${targetHost}\r\n` +
                  `Connection: close\r\n\r\n`;
                clientSocket.write(httpsRequest);
              })
            : net.createConnection(
                { host: targetHost, port: targetPort },
                () => {
                  console.log("Connected to target server via TCP");
                  const httpRequest =
                    `GET ${target.pathname} HTTP/1.1\r\n` +
                    `Host: ${targetHost}\r\n` +
                    `Connection: close\r\n\r\n`;
                  clientSocket.write(httpRequest);
                }
              );

        clientSocket.setTimeout(timeout, () => handleTimeout(clientSocket));

        let responseData = "";
        clientSocket.on("data", (chunk) => {
          responseData += chunk.toString();
        });

        clientSocket.on("end", () => {
          resolve(responseData);
          clientSocket.end();
        });

        clientSocket.on("error", (err) => {
          reject(`Direct request error: ${err.message}`);
        });

        return;
      }

      // 如果有代理，走代理逻辑
      const proxy = new URL(proxyUrl);
      const proxyHost = proxy.hostname;
      const proxyPort = parseInt(proxy.port, 10);

      // 构造 CONNECT 请求
      const connectRequest =
        `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\n` +
        `Host: ${targetHost}\r\n` +
        `Connection: close\r\n\r\n`;

      // 创建到代理服务器的 TCP 连接
      const proxySocket = net.createConnection(
        { host: proxyHost, port: proxyPort },
        () => {
          console.log("Connected to proxy server");
          proxySocket.write(connectRequest);
        }
      );

      proxySocket.setTimeout(timeout, () => handleTimeout(proxySocket));

      let headers = "";
      proxySocket.on("data", (data) => {
        headers += data.toString();

        if (headers.includes("\r\n\r\n")) {
          const [headerPart] = headers.split("\r\n\r\n");
          if (headerPart.includes("200 ")) {
            console.log("Tunnel established");

            if (target.protocol === "https:") {
              const tlsSocket = tls.connect(
                {
                  socket: proxySocket,
                  servername: targetHost,
                },
                () => {
                  console.log("Connected to target server via TLS");
                  const httpsRequest =
                    `GET ${target.pathname} HTTP/1.1\r\n` +
                    `Host: ${targetHost}\r\n` +
                    `Connection: close\r\n\r\n`;
                  tlsSocket.write(httpsRequest);
                }
              );

              tlsSocket.setTimeout(timeout, () => handleTimeout(tlsSocket));

              let responseData = "";
              tlsSocket.on("data", (chunk) => {
                responseData += chunk.toString();
              });

              tlsSocket.on("end", () => {
                resolve(responseData);
                tlsSocket.end();
              });

              tlsSocket.on("error", (err) => {
                reject(`TLS connection error: ${err.message}`);
              });
            } else {
              const httpRequest =
                `GET ${target.pathname} HTTP/1.1\r\n` +
                `Host: ${targetHost}\r\n` +
                `Connection: close\r\n\r\n`;

              proxySocket.write(httpRequest);

              let responseData = "";
              proxySocket.on("data", (chunk) => {
                responseData += chunk.toString();
              });

              proxySocket.on("end", () => {
                resolve(responseData);
                proxySocket.end();
              });

              proxySocket.on("error", (err) => {
                reject(`HTTP connection error: ${err.message}`);
              });
            }
          } else {
            reject(`Failed to establish tunnel: ${headers}`);
            proxySocket.end();
          }
        }
      });

      proxySocket.on("error", (err) => {
        reject(`Proxy connection error: ${err.message}`);
      });

      proxySocket.on("end", () => {
        console.log("Disconnected from proxy server");
      });
    } catch (err) {
      reject(`Request failed: ${err}`);
    }
  });
}

// 调用方式
(async () => {
  try {
    // 传入 HTTP 请求，无代理，超时5秒
    // const httpResponse = await proxyRequest({
    //   targetUrl: "http://google.com",
    //   timeout: 5000, // 5秒超时
    // });
    // console.log("HTTP Response received:");
    // console.log(httpResponse);

    // // 传入 HTTPS 请求，带代理，超时10秒
    const httpsResponse = await proxyRequest({
      proxyUrl: "http://127.0.0.1:7890",
      targetUrl: "https://google.com",
      timeout: 10000, // 10秒超时
    });
    console.log("HTTPS Response received:");
    console.log(httpsResponse);
  } catch (error) {
    console.error("Error during request:", error);
  }
})();
