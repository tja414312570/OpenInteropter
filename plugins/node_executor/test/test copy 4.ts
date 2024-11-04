type Menu = {
  name: string;
  key: string;
  page?: string;
  path?: string;
  subs?: Array<Menu> | null;
};

/**
 * 为菜单项生成路径
 * @param menu - 单个菜单项或菜单项数组
 * @param parentPath - 可选的父路径，如果没有传入则默认空字符串
 */
function generateMenuPath(menu: Menu | Menu[], parentPath: string = ""): void {
  if (Array.isArray(menu)) {
    // 如果是数组，递归处理每个子菜单
    menu.forEach((item) => generateMenuPath(item, parentPath));
  } else {
    // 生成当前菜单的路径
    menu.path = parentPath ? `${parentPath}.${menu.key}` : menu.key;

    // 如果有子菜单，递归处理子菜单
    if (menu.subs && menu.subs.length > 0) {
      generateMenuPath(menu.subs, menu.path);
    }
  }
}

// 示例数据
const settings_menu: Menu[] = [
  {
    name: "通用",
    key: "general",
    subs: [
      {
        name: "测试",
        key: "test",
        page: "test",
      },
    ],
  },
  {
    name: "网络",
    key: "network",
  },
  {
    name: "外观",
    key: "appearance",
  },
  {
    name: "插件",
    key: "plugins",
  },
];

// 调用函数生成路径，使用默认起点
generateMenuPath(settings_menu);
console.log(JSON.stringify(settings_menu, null, 2));

// 示例：使用父路径为 "root" 作为起点
generateMenuPath(settings_menu, "root");
console.log(JSON.stringify(settings_menu, null, 2));
