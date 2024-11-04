import { createParser, ParsedEvent, ParseEvent } from 'eventsource-parser';
import { protoBase64 } from "./proto-base64";
import util from 'util'

import { PushEvent, PushMessage } from "./message";
const INACTIVITY_TIMEOUT_MS = 10000;

export class SseHandler {
    private message: ((data: any) => void) | undefined;
    private end: ((data: any) => void) | undefined;
    private parser: any;
    private previousObject: any;
    private parsedData: any;
    private inactivityTimer: NodeJS.Timeout | null = null;
    private currentEncoding: string = '';
    private error: ((data: any) => void) | undefined;
    private isEnd = false;
    constructor() {
        this.parser = createParser((event) => {
            this.handleServerEvent(event);
        });
    }
    onMessage(callback: (data: any) => void) {
        this.message = callback;
        return this;
    }
    onEnd(callback: (data: any) => void) {
        this.end = callback;
        return this;
    }
    onError(callback: (data: any) => void) {
        this.error = callback;
        return this;
    }
    private triggerEvent(data: {}) {
        this.message?.(data);
    }
    private triggerEnd(data: {}) {
        this.isEnd = true;
        this.end?.(data);
    }
    private triggerError(data: any) {
        if (!this.error) {
            throw new Error(`未绑定错误handler`, { cause: data })
        }
        this.error(data);
    }
    private resetTimer() {
        // 清除现有计时器
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
        // 创建一个新的计时器来检测处理器是否长时间未接收事件
        this.inactivityTimer = setTimeout(() => {
            // 如果长时间没有新的事件进入 handleServerEvent，则抛出错误或触发错误事件
            console.error('Error: Inactivity timeout reached, no new events received.');
            this.triggerError(new Error('Inactivity timeout reached, no new events received.'));
        }, INACTIVITY_TIMEOUT_MS);
    }
    private cleanTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
    }
    private throwError(err: any) {
        if (err instanceof Error) {
            throw err
        }
        throw new Error(err);
    }
    handleServerEvent(event: ParseEvent) {
        try {
            this.resetTimer();
            // 将接收到的数据传递给流追踪器
            if (this.isEnd) {
                return;
            }
            event = event as ParsedEvent;
            if (event.data === "[DONE]") {
                // 中止当前的操作并结束流
                this.cleanTimer()
                this.triggerEnd(this.parsedData)
                return;
            }
            // 如果事件类型不是 "ping"，则处理其他事件
            if (event.event !== "ping") {
                // 处理 "delta_encoding" 事件
                if (event.event === "pb") {
                    const pushEvent = PushEvent.fromBinary(protoBase64.dec(event.data));
                    if (pushEvent) {
                        const finished = pushEvent.message?.ext?.is_finish;
                        if (finished === '1') {
                            this.parsedData = pushEvent;
                            this.triggerEnd(this.parsedData)
                        } else {
                            this.triggerEvent(pushEvent);
                        }
                    }
                } else {
                    this.triggerEvent(event);
                }
            }
        } catch (err: any) {
            throw new Error(`处理数据失败,${util.inspect(event)}`, { cause: err })
        }
    }
    feed(data: string) {
        try {
            this.parser.feed(data)
        } catch (error) {
            this.triggerError(error)
        }
    }
}
export const createHandler = () => new SseHandler(); 