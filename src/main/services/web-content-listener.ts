import { MapSet } from "@main/utils/MapSet";
const channels: MapSet<number> = new MapSet()
const channelBindListeners: MapSet<HandleChannel> = new MapSet()
export type HandleChannel = {
    onBind?: (webId: number) => void;
    unBind?: (webId: number) => void
};
const _triggerHandleChannel = (channel: string, webId: number, type: 'bind' | 'remove', callback?: HandleChannel) => {
    if (callback) {
        if (type === 'bind') {
            callback.onBind?.(webId);
        } else {
            callback.unBind?.(webId);
        }
    } else {
        const listeners = channelBindListeners.get(channel)
        if (listeners) {
            for (const listener of listeners) {
                if (type === 'bind') {
                    listener.onBind?.(webId)
                } else {
                    listener.unBind?.(webId)
                }
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
export const handleChannelEvent = (channel: string, callback: HandleChannel) => {
    channelBindListeners.add(channel, callback);
    let webIds = channels.get(channel);
    if (webIds) {
        for (const webId of webIds) {
            _triggerHandleChannel(channel, webId, 'bind', callback);
        }
    }
    return () => channelBindListeners.remove(channel, callback);
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