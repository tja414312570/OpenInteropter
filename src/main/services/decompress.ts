import zlib from 'zlib';
export const isCompressed = (contentEncoding)=>{
    return contentEncoding.includes('gzip') || contentEncoding.includes('deflate') || contentEncoding.includes('br');
      
}
export const decompressed = (contentEncoding,body)=>{
    return new Promise((resolve,reject)=>{
            if (contentEncoding.includes('gzip')) {
              zlib.gunzip(body, (err, decompressedBody) => {
                if (!err) {
                    resolve(decompressedBody.toString())
                } else {
                    console.error('Deflate 解压失败:', err);
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
            }else {
            // 如果没有压缩，直接返回响应体
            resolve(body.toString());
          }
    })
}