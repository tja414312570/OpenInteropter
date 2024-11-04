
const __api = 'adderManager';
export interface IpcSend<__api>{

}
export interface IpcOn<T>{

}

export interface IpcAdderManager {
    getConfigList:IpcSend<Promise<[]>>
    addConfigList:IpcOn<Promise<void>>
}