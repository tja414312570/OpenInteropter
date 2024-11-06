<template>
  <div class="window-title" v-if="isNotMac">
    <!-- 软件logo预留位置 -->

    <div class="region-area window-title">
      <!-- 中间标题位置 -->
      <div class="title region-area">{{ title }}</div>
    </div>
    <div class="menu">
      <div class="logo">
        <img src="@renderer/assets/icons/svg/electron-logo.svg" class="icon-logo" />
      </div>
      <MenuBar :options="menuData" />
    </div>
    <div class="window-controls">
      <i id="minimize" class="mdi mdi-window-minimize" v-show="status.btn[0]" @click="api.invoke('minimize')"></i>
      <i id="maximize" class="mdi mdi-window-maximize" v-show="status.btn[1] && status.status !== 2"
        @click="api.invoke('maximize') && (status.status = 2)"></i>
      <i id="restore" class="mdi mdi-window-restore" v-show="status.btn[1] && status.status === 2"
        @click="api.invoke('restore') && (status.status = 1)"></i>
      <i id="close" class="mdi mdi-close" @click="api.invoke('close')"></i>
    </div>
  </div>
  <div v-else-if="!isNotMac" class="window-title region-area">
    <div style="-webkit-app-region: drag" class="title">{{ title }}</div>
  </div>
</template>

<script setup lang="ts">
import MenuBar from "./menu/MenuBar.vue";
import { getIpcApi } from "@lib/preload";
import { MenuDesc } from "@main/services/service-menu";
import { reactive, ref } from "vue";
import { MenuItem } from "./menu/ContextMenuDefine";
import { MenuBarOptions } from "./menu";
const status = reactive<{
  status: 0 | 1 | 2,
  btn: [boolean, boolean, boolean]
}>({
  status: 1,
  btn: [true, true, true]
})


const api = getIpcApi('ipc-core.window');
const coreApi: any = getIpcApi('ipc-core');
api.invoke('status').then(result => {
  status.status = result.status;
  status.btn = result.btn;
})
window.onresize = () => {
  api.invoke('status').then(result => {
    status.status = result.status;
    status.btn = result.btn;
  })
}
const mix = ref(false);
// const isNotMac = ref(false);

console.log(coreApi.platform)
const isNotMac = ref(coreApi.platform !== 'darwin');
// const IsWeb = ref(Boolean(__ISWEB__));
const IsWeb = ref(Boolean(false));
const title = ref('')
api.invoke('title').then((result: string) => {
  title.value = result;
})
// isNotMac.value = systemInfo.platform !== "darwin";

// ipcRendererChannel.IsUseSysTitle.invoke().then((res) => {
//   IsUseSysTitle.value = res;
// });
/**
 * 为菜单项生成路径
 * @param menu - 单个菜单项或菜单项数组
 * @param parentPath - 可选的父路径，如果没有传入则默认空字符串
 */
function wrapperMenu(menu: MenuItem | MenuItem[]): void {
  if (Array.isArray(menu)) {
    // 如果是数组，递归处理每个子菜单
    menu.forEach((item) => wrapperMenu(item));
  } else {
    // 如果有子菜单，递归处理子菜单
    if (menu.submenu && menu.submenu.length > 0) {
      wrapperMenu(menu.submenu);
    } else {
      menu.onClick || (menu.onClick = () => {
        console.log("点击", menu)
        coreApi.invoke('click-menu', menu.id)
      });
    }
  }
}

coreApi.invoke('get-menus').then((result: Array<MenuDesc>) => {
  wrapperMenu(result)
  console.log("获取菜单:", result)
  menuData.items.length = 0;
  menuData.items.push(...result);
})

// const menuData: MenuBarOptions = reactive({ items: [], zIndex: 100000, minWidth: 230, })

const menuData: MenuBarOptions = reactive<MenuBarOptions>({
  theme: "flat dark",
  xOffset: -10,
  yOffset: -20,
  items: [],
  zIndex: 100000,
  minWidth: 230,
});
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.region-area {
  -webkit-app-region: drag;
}

.window-title {
  width: 100%;
  height: 34px;
  line-height: 34px;
  display: flex;
  cursor: pointer;
  top: 0;
  z-index: 9999;
  justify-content: center;
  align-items: center;

  .icon-logo {
    width: 1em;
    height: 1em;
    vertical-align: -0.15em;
    fill: currentColor;
    overflow: hidden;
  }

  .title {
    text-align: center;
    color: #9d9d9d;
    flex: 1;
  }

  .logo {
    margin: 0 10px;
  }

  .controls-container {
    display: flex;
    flex-grow: 0;
    flex-shrink: 0;
    text-align: center;
    position: relative;
    z-index: 3000;
    -webkit-app-region: no-drag;
    height: 100%;
    width: 138px;
    margin-left: auto;

    .windows-icon-bg {
      display: inline-block;
      -webkit-app-region: no-drag;
      height: 100%;
      width: 33.34%;
      color: rgba(129, 129, 129, 0.6);

      .icon-size {
        width: 12px;
        height: 15px;
        vertical-align: -0.15em;
        fill: currentColor;
        overflow: hidden;
      }
    }

    .windows-icon-bg:hover {
      background-color: rgba(182, 182, 182, 0.2);
      color: #333;
    }

    .close-icon:hover {
      background-color: rgba(232, 17, 35, 0.9);
      color: #fff;
    }
  }
}


.mx-menu-bar.dark {
  //在这里覆盖默认css变量的值
  --mx-menu-backgroud: rgba(0, 0, 0, 0);
}

.window-controls {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  position: absolute;
  -webkit-app-region: none;
  right: 0;
  top: 0;
  z-index: 100000;
  pointer-events: auto;
}

.window-controls i {
  font-size: 18px;
  /* 图标大小 */
  cursor: pointer;
  margin: 0 10px;
  color: #bbb;

}

.window-controls i:hover {
  color: #fff;
  /* 鼠标悬停时的颜色 */
}

:deep(.mx-menu-bar) {
  background: none;
  padding: 0 !important;
}

:deep(.mx-menu-bar) * {
  background: none;
}

// /* 覆盖伪类 */
// :deep(.mx-menu-bar):hover,
// :deep(.mx-menu-bar):active,
// :deep(.mx-menu-bar) *:hover,
// :deep(.mx-menu-bar) *:active {
//   background: inherit !important;
// }

:deep(.mx-menu-bar .mx-menu-bar-item) {
  font-size: 14px;
  padding: 0 8px;
}

.menu {
  position: absolute;
  z-index: 99999;
  left: 0;
  top: 0;
  display: flex;
  -webkit-app-region: none;
}
</style>
