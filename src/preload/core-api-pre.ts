import { exposeInMainWorld } from "./ipc-wrapper";
import { } from "electron";
exposeInMainWorld('ipc-core', () => ({
    crash: () => process.crash(),
    hang: () => process.hang(),
    getCreationTime: process.getCreationTime ? () => process.getCreationTime() : () => null,
    getHeapStatistics: process.getHeapStatistics ? () => process.getHeapStatistics() : () => null,
    getBlinkMemoryInfo: process.getBlinkMemoryInfo ? () => process.getBlinkMemoryInfo() : () => null,
    getProcessMemoryInfo: process.getProcessMemoryInfo ? () => process.getProcessMemoryInfo() : () => null,
    getSystemMemoryInfo: process.getSystemMemoryInfo ? () => process.getSystemMemoryInfo() : () => null,
    getSystemVersion: process.getSystemVersion ? () => process.getSystemVersion() : () => null,
    getCPUUsage: process.getCPUUsage ? () => process.getCPUUsage() : () => null,
    uptime: () => process.uptime(),
    // 属性
    argv: process.argv,
    execPath: process.execPath,
    env: process.env,
    pid: process.pid,
    arch: process.arch,
    platform: process.platform,
    sandboxed: process.sandboxed,
    contextIsolated: process.contextIsolated,
    type: process.type,
    version: process.version,
    versions: process.versions,
    mas: process.mas,
    windowsStore: process.windowsStore,
    contextId: process.contextId,
}));
exposeInMainWorld('ipc-core.window');