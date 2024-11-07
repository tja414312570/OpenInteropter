import { MapSet } from "@main/utils/MapSet";
import { webContents } from "electron";
const channels: MapSet<number> = new MapSet()
export type callback = (webId: number) => void;
const channelBindListeners: MapSet<(webId: number) => void> = new MapSet()
const channelUnBindListeners: MapSet<(webId: number) => void> = new MapSet()
const _triggerHandleChannel = (channel: string, webId: number, type: 'bind' | 'remove', callback?: callback) => {
    if (callback) {
        callback(webId);
    } else {
        const listeners = type === 'bind' ? channelBindListeners.get(channel) : channelUnBindListeners.get(channel);
        if (listeners) {
            for (const listener of listeners) {
                listener(webId)
            }
        }
    }
}
/**
 * 
 * @param channel 
 * @param callback
 * @returns disposeable 调用此函数解除绑定
 */
export const handleChannelBind = (channel: string, callback: callback) => {
    channelBindListeners.add(channel, callback);
    let webIds = channels.get(channel);
    if (webIds) {
        for (const webId of webIds) {
            _triggerHandleChannel(channel, webId, 'bind', callback);
        }
    }
    return () => channelBindListeners.remove(channel, callback);
}
export const handleChannelUnbind = (channel: string, callback: callback) => {
    channelUnBindListeners.add(channel, callback);
    let webIds = channels.get(channel);
    if (webIds) {
        for (const webId of webIds) {
            _triggerHandleChannel(channel, webId, 'bind', callback);
        }
    }
    return () => channelUnBindListeners.remove(channel, callback);
}
export const getWebContentIds = (channel: string): Set<number> => {
    return channels.get(channel);
}

export const getAllChannel = (): MapSet<number> => {
    return channels;
}
const listeners = new MapSet<Function>();
const listenr = (channel: string, webContentId: number) => {
    let list = listeners.get(webContentId)
    if (!list) {
        const webContent = webContents.fromId(webContentId);
        if (!webContent) {
            return false;
        }
        webContent.on('destroyed', () => {
            const remoes = listeners.get(webContentId);
            if (remoes) {
                for (const fun of remoes) {
                    fun()
                }
            }
            listeners.removeKey(webContentId);
        })
    }
    listeners.add(webContentId, () => removeListenerChannel(channel, webContentId))
    return true;
}

export const bindListenerChannel = (channel: string, webContentId: number) => {
    if (listenr(channel, webContentId)) {
        channels.add(channel, webContentId)
        _triggerHandleChannel(channel, webContentId, 'bind');
    }
}
export const removeListenerChannel = (channel: string, webContentId: number) => {
    channels.remove(channel, webContentId)
    _triggerHandleChannel(channel, webContentId, 'remove');
}