import { v4 } from "uuid";
import VirtualWindow from "./virtual-window";
type ChildVirtualWindow = InstanceType<typeof VirtualWindow> & {
    _line: boolean | undefined;
    _id: number | string | undefined;
}

export class WindowGroup {
    private virtualWindowArray: Array<ChildVirtualWindow> = [];
    private parentWindow: VirtualWindow;
    private _write: (content: string) => void;
    isClose: boolean;
    isDestory: boolean;
    private _buffer: string = '';
    private _creator: Error;
    getCreator() {
        return this._creator;
    }
    constructor(parentWindow: VirtualWindow) {
        this._creator = new Error('Creator Stack')
        this.parentWindow = parentWindow;
        this._write = parentWindow.write.bind(parentWindow);
        this.isClose = false;
        this.isDestory = false;
        parentWindow.write = () => {
            throw new Error("此窗口已创建组，不允许写入到窗口")
        }
    }
    private _checkStatus() {
        if (this.isDestory) {
            throw new Error('窗口组已销毁', { cause: this._creator })
        }
        if (this.isClose) {
            throw new Error('窗口组已关闭', { cause: this._creator })
        }
    }
    private refresh() {
        this._checkStatus();
        let buffer = ''
        let isFirst = true;
        for (const virtualWindow of this.virtualWindowArray) {
            const render = virtualWindow.render();
            if (render.length === 0) {
                continue;
            }
            if (virtualWindow['_line'] && !isFirst && buffer) {
                buffer += '\n';
            }
            isFirst = false;
            buffer += render;
        }
        this._buffer = buffer;
        this._write("\x1b[s\x1b[0J" + buffer + "\x1b[u")
    }

    insertWindow(index: number, virtualWindow?: VirtualWindow) {
        if (index >= 0 && index <= this.virtualWindowArray.length) {
            const insertWindow = this._createOrWrapperWindow(virtualWindow)
            insertWindow['_id'] = insertWindow['_id'] || v4()
            this.virtualWindowArray.splice(index, 0, insertWindow);
            this.refresh();
        } else {
            throw new Error('插入位置超出窗口组范围');
        }
    }
    getOrder() {
        return this.virtualWindowArray.map(item => item['_id']);
    }
    createChildWindow(id?: string) {
        const virtualWindow = this.createChildRowWindow(id);
        virtualWindow['_line'] = true;
        return virtualWindow;
    }
    private _createOrWrapperWindow(existsWindow?: VirtualWindow) {
        const virtualWindow = existsWindow || new VirtualWindow();
        virtualWindow.onRender((content) => {
            this.refresh();
        });
        return virtualWindow as unknown as ChildVirtualWindow;
    }
    createChildRowWindow(id?: string) {
        this._checkStatus();
        const i = this.virtualWindowArray.length;
        const virtualWindow = this._createOrWrapperWindow();
        this.virtualWindowArray[i] = virtualWindow;
        // const destory = virtualWindow.destory.bind(virtualWindow);
        // virtualWindow.destory = () => {
        //     let render = virtualWindow.render();
        //     if (render.length > 0) {
        //         if (virtualWindow['_line'] && i > 0) {
        //             render = '\n' + render;
        //         }
        //     }
        //     this.virtualWindowArray[i] = render;
        //     destory();
        // }
        virtualWindow['_id'] = id || v4();
        return virtualWindow;
    }
    close(force = false) {
        this.isClose = true;
        for (const virtualWindow of this.virtualWindowArray) {
            if (!virtualWindow.isClose()) {
                if (force) {
                    virtualWindow.close();
                } else {
                    throw new Error(`子窗口${virtualWindow['_id']}未关闭，不允许关闭组,(传入force强制关闭窗口)`)
                }
            }
        }
        this.parentWindow.write = this._write;
        this.parentWindow.write("\x1b[s\x1b[0J" + this._buffer)
    }
    destory(force = false) {
        if (!this.isClose) {
            this.close(force)
        }
        if (!this.isDestory) {
            this.virtualWindowArray.length = 0;
            this.isDestory = true;
            for (const virtualWindow of this.virtualWindowArray) {
                if (!virtualWindow.isDestory()) {
                    if (force) {
                        virtualWindow.destory();
                    } else {
                        throw new Error(`子窗口${virtualWindow['_id']}未销毁，不允许销毁组,(传入force强制销毁窗口)`)
                    }
                }
            }
        }
    }
}