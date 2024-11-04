import { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
    { path: '/', name: '总览', component: () => import('@renderer/views/CodeView.vue') },
    { path: '/setting', name: '设置', component: () => import('@renderer/views/Settings.vue') },
    // { path: '/:pathMatch(.*)*', component: () => import("@renderer/views/404.vue") },
]

export default routes