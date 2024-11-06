export interface IWindowManager {
    createWindow: (windowId: string, options?: IBrowserWindowOptions) => BrowserWindow;
    getWindow: (windowId: string) => BrowserWindow;
}