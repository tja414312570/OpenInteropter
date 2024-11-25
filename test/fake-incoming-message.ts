import http, { IncomingMessage } from "http";

class ModifiedIncomingMessage extends IncomingMessage {
    private _buffer: Buffer; // 用于替换原始请求体的新数据
    private currentIndex = 0;
    incomingMessage: http.IncomingMessage;

    constructor(originalRequest: IncomingMessage) {
        // 传入原始请求的 socket 以保持兼容性
        super(null as any);
        this.incomingMessage = originalRequest;

        // 复制原始请求的属性
        this.headers = { ...originalRequest.headers }; // 克隆请求头
        this.method = originalRequest.method; // 克隆请求方法
        this.url = originalRequest.url; // 克隆请求 URL
        this.httpVersion = originalRequest.httpVersion; // 克隆 HTTP 版本
        this.httpVersionMajor = originalRequest.httpVersionMajor;
        this.httpVersionMinor = originalRequest.httpVersionMinor;

        // 如果需要克隆响应状态（通常在代理中可能需要）
        this.statusCode = originalRequest.statusCode || undefined;
        this.statusMessage = originalRequest.statusMessage || undefined;
    }
    reset(callback: (buffer: Buffer, fn: (buffer: Buffer) => void) => void) {
        const body: Uint8Array[] = [];
        const self = this;
        this.incomingMessage
            .on("data", (chunk) => {
                body.push(chunk);
            })
            .on("end", () => {
                const buffer = Buffer.concat(body);
                callback(buffer, (_buffer) => {
                  self._buffer = _buffer;
                })
            });
    }

    // 重写 _read 方法以提供新的数据流
    _read(size: number): void {
        if (!this._buffer) {
            throw new Error("buffer is not available")
        }
        if (this.currentIndex < this._buffer.length) {
            // 计算要读取的结束索引
            const endIndex = Math.min(this.currentIndex + size, this._buffer.length);
            // 推送数据块
            this.push(this._buffer.subarray(this.currentIndex, endIndex));
            // 更新当前索引
            this.currentIndex = endIndex;
        }
        // 如果所有数据已被读取，结束流
        if (this.currentIndex >= this._buffer.length) {
            this.push(null); // 表示流结束
        }
    }
}


export default ModifiedIncomingMessage;
