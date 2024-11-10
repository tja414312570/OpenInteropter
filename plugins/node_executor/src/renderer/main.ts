import { createApp } from "vue";
import { createPinia } from "pinia";
import "./styles/index.scss";
import App from "./App.vue";
// Vuetify 配置
import "vuetify/styles"; // 引入 Vuetify 的全局样式
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { VIcon } from "vuetify/components"; // 导入实际的 v-icon 组件
import { mdiHome } from "@mdi/js"; // 或者你自定义的图标
import "@mdi/font/css/materialdesignicons.css";
import vSelect from "vue-select";
import "vue-select/dist/vue-select.css";

// 创建 Vuetify 实例
const vuetify = createVuetify({
  icons: {
    defaultSet: "mdi",
  },
  components: {
    ...components,
  },
  directives,
});

const app = createApp(App);
const store = createPinia();
app.use(store);
app.component("v-select", vSelect);
// app.use(VueMonacoEditorPlugin, {
//   paths: {
//     // The recommended CDN config
//     vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.43.0/min/vs'
//   },
// })
app.use(vuetify);
// errorHandler(app);
import "vue-code-layout/lib/vue-code-layout.css";
import "dockview-core/dist/styles/dockview.css";

app.mount("#app");
