import { getMenus, MenuDesc } from "@main/services/service-menu";
import settingManager from "@main/services/service-setting";
import { BrowserWindow, ipcMain, Menu, MenuItem } from "electron";
import _ from "lodash";
const copy = (pluginList: undefined | null | MenuDesc | Array<MenuDesc>) => {
    if (!pluginList) {
        return null;
    }
    if (pluginList instanceof Array) {
        const list = [];
        for (const plugin of pluginList) {
            list.push(copy(plugin));
        }
        return list;
    } else {
        if (pluginList.submenu) {
            pluginList.submenu = copy(pluginList.submenu) as any;
        }
        return _clone(pluginList)
    }
};
const _clone = (menu: MenuDesc) => {
    return _.omit(menu, ['click'])
}
ipcMain.handle('ipc-core.get-menus', (event, args) => {
    const focusedWindow = BrowserWindow.fromWebContents(event.sender) as any;
    const showMenu = focusedWindow?.options?.showMenu
    if (!showMenu) {
        return [];
    }
    const menus = copy((getMenus() as MenuDesc[]).filter(Boolean).filter(item => item.submenu));
    return menus;
});
ipcMain.handle('ipc-core.click-menu', (event, id: string) => {
    const menuItem = Menu.getApplicationMenu().getMenuItemById(id);
    const focusedWindow = BrowserWindow.fromWebContents(event.sender);
    menuItem.click(event, focusedWindow, event.sender)
    return menuItem.id
});
// ipcMain.handle('ipc-settings.save-setting-value', (event, json) => {
//     console.log("接受到新菜单,", JSON.stringify(json))
//     saveSettingValue(json)
//     return;
// });
