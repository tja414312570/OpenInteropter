import { IContext } from "http-mitm-proxy";
import zlib from 'zlib';

export const decompressedBody = (ctx: IContext):Promise<string>=> {
  return new Promise((resolve, reject) => {
    // 如果响应是压缩的，进行解压
    const response = ctx.serverToProxyResponse;

    // 获取响应的 Content-Type 和 Content-Encoding
    const contentEncoding = response?.headers['content-encoding'] || '';

    // 检查是否是压缩响应
    const isCompressed = contentEncoding.includes('gzip') || contentEncoding.includes('deflate') || contentEncoding.includes('br');

    let body: any = [];

    response?.on('data', (chunk) => {
      body.push(chunk);
    });

    response?.on('end', () => {
      body = Buffer.concat(body);

      // 如果响应是压缩的，进行解压
      if (isCompressed) {
        if (contentEncoding.includes('gzip')) {
          zlib.gunzip(body, (err, decompressedBody) => {
            if (!err) {
              resolve(decompressedBody.toString());
            } else {
              console.error('Gzip 解压失败:', err);
              reject(err);
            }
          });
        } else if (contentEncoding.includes('deflate')) {
          zlib.inflate(body, (err, decompressedBody) => {
            if (!err) {
              resolve(decompressedBody.toString());
            } else {
              console.error('Deflate 解压失败:', err);
              reject(err);
            }
          });
        } else if (contentEncoding.includes('br')) {
          zlib.brotliDecompress(body, (err, decompressedBody) => {
            if (!err) {
              resolve(decompressedBody.toString());
            } else {
              console.error('Brotli 解压失败:', err);
              reject(err);
            }
          });
        }
      } else {
        // 如果没有压缩，直接返回响应体
        resolve(body.toString());
      }
    });

    response?.on('error', (err) => {
      reject(err);
    });
  });
}