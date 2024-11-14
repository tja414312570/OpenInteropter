import { RouteRecordRaw } from "vue-router";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "安装器",
    component: () => import("../views/install.vue"),
  },
  {
    path: "/render",
    name: "渲染界面",
    component: () => import("../views/render.vue"),
  },
];
export default routes;
