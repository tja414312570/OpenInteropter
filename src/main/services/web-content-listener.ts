import { MapSet } from "@main/utils/MapSet";
import { webContents } from "electron";
const channels: Map<string, MapSet<string, number>> = new Map()
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
        for (const webId of webIds.keys()) {
            _triggerHandleChannel(channel, webId, 'bind', callback);
        }
    }
    return () => channelBindListeners.remove(channel, callback);
}
export const handleChannelUnbind = (channel: string, callback: callback) => {
    channelUnBindListeners.add(channel, callback);
    let webIds = channels.get(channel);
    if (webIds) {
        for (const webId of webIds.keys()) {
            _triggerHandleChannel(channel, webId, 'bind', callback);
        }
    }
    return () => channelUnBindListeners.remove(channel, callback);
}
export const getWebContentIds = (channel: string): Set<number> => {
    return new Set(channels.get(channel)?.keys());
}

export const getAllChannel = (): Map<string, MapSet<string>> => {
    return channels;
}
const listeners = new MapSet<Function>();
const listenr = (channel: string, webContentId: number, id: string) => {
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
    listeners.add(webContentId, () => removeListenerChannel(channel, webContentId, id))
    return true;
}

export const bindListenerChannel = (channel: string, webContentId: number, id: string) => {
    if (listenr(channel, webContentId, id)) {
        let webId2Ids = channels.get(channel);
        if (!webId2Ids) {
            webId2Ids = new MapSet();
            channels.set(channel, webId2Ids);
        }
        webId2Ids.add(webContentId, id)
        _triggerHandleChannel(channel, webContentId, 'bind');
    }
}
export const removeListenerChannel = (channel: string, webContentId: number, id?: string) => {
    let webId2Ids = channels.get(channel);
    if (webId2Ids) {
        if (!id) {
            webId2Ids.delete(webContentId)
        } else {
            webId2Ids.remove(webContentId, id)
            if (webId2Ids.size === 0) {
                channels.delete(channel)
            }
        }
    }
    _triggerHandleChannel(channel, webContentId, 'remove');
}