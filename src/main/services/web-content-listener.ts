import { MapSet } from "@main/utils/MapSet";
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

export const bindListenerChannel = (channel: string, webContentId: number) => {
    channels.add(channel, webContentId)
    _triggerHandleChannel(channel, webContentId, 'bind');
}
export const removeListenerChannel = (channel: string, webContentId: number) => {
    channels.remove(channel, webContentId)
    _triggerHandleChannel(channel, webContentId, 'remove');
}