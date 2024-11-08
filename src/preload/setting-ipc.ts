import './core-api-pre'
import { exposeInMainWorld } from './lib/ipc-wrapper'
exposeInMainWorld('ipc-settings')