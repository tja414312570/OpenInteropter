const settins_menu: Array<Menu> = [];
settins_menu.push({
  name: "菜单测试",
  key: "menu",
  subs: [
    {
      name: "测试",
      key: "test",
    },
  ],
});
export type Menu = {
  name: string;
  key: string;
  page?: string;
  subs?: Array<Menu> | null;
};
function foundPath(target: string, _menus = settins_menu): Menu | null {
  console.log("查找:", target, JSON.stringify(_menus));
  const index = target.indexOf(".");
  const current = target.substring(0, index > 1 ? index : target.length);
  const remain = index > 1 ? target.substring(index + 1, target.length) : null;
  for (const menu of _menus) {
    if (menu.key === current) {
      if (remain) {
        if (menu.subs) {
          return foundPath(remain, menu.subs);
        }
      } else {
        return menu;
      }
    }
  }
  return null;
}
// console.log();
// console.log(foundPath(""));
// console.log(foundPath("menu"));
console.log(foundPath("menu.test"));
console.log(foundPath("menu.test2"));
