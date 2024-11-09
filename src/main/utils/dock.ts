import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from "electron";

export function updateDockMenu() {
    if (process.platform === 'darwin') {
        // 获取所有窗口并创建菜单项
        const dockMenuItems: Array<MenuItemConstructorOptions> = BrowserWindow.getAllWindows().map((window, index) => {
            return {
                label: `${window.getTitle() || '窗口 ' + (index + 1)}`,
                click: () => {
                    if (window) window.show();
                },
            };
        });
        // 如果没有窗口，设置一个默认菜单项
        if (dockMenuItems.length === 0) {
            dockMenuItems.push({ label: '无可用窗口', enabled: false });
        }

        const dockMenu = Menu.buildFromTemplate(dockMenuItems);
        app.dock.setMenu(dockMenu);
    }
}