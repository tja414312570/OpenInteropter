<template>
  <div>
    <!-- 搜索框 -->
    <v-text-field
      v-if="showSearch"
      v-model="searchQuery"
      label="搜索服务器"
      @input="filterServers"
      clearable
      append-icon="mdi-close"
      hide-details
      single-line
      variant="solo"
      density="compact"
      append-inner-icon="mdi-magnify"
      @click:append="exitSearch"
    />
        
    <!-- 服务器列表 -->
    <v-list
      v-model="selectedServer"
      :lines="false"
      density="compact"
    >
      <v-list-item
        v-for="(item, i) in filteredServers"
        :key="i"
        :value="item.id"
        color="primary"
      >
        <template v-slot:prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>

        <v-list-item-title>{{ item.address }}</v-list-item-title>

        <template v-slot:append>
          <v-btn icon small @click.stop="openEditDialog(item)" class="action-btn">
            <v-icon color="white" size="18">mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon small @click.stop="deleteServer(item.id)" class="action-btn">
            <v-icon color="white" size="18">mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-list-item>
    </v-list>

    <!-- 编辑服务器地址的对话框 -->
    <v-dialog v-model="editDialog" max-width="500">
      <v-card>
        <v-card-title>编辑服务器地址</v-card-title>
        <v-card-text>
          <v-text-field label="服务器地址" v-model="currentServer.address" />
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="saveServer">保存</v-btn>
          <v-btn color="secondary" text @click="closeEditDialog">取消</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { mdiServer, mdiPencil, mdiDelete } from '@mdi/js';
import { serverApi } from '@renderer/api/server-api';

const props = defineProps({
  panel: Object  // 接收从父组件传递来的 panel 对象
});
const api = props.panel.data.api as serverApi;

const searchQuery = ref('');  // 搜索关键字
const showSearch = ref(false);  // 控制搜索框显示/隐藏
const servers = ref([
  { id: 1, address: 'https://chatgpt.com/', icon: 'mdi-server' },
  { id: 2, address: '192.168.1.2', icon: 'mdi-server' },
]);

const selectedServer = ref(servers.value[0].id);  // 默认选中第一个服务器
const filteredServers = ref(servers.value);  // 初始化为全部服务器
const editDialog = ref(false);  // 控制编辑对话框的显示/隐藏
const currentServer = ref({ id: 0, address: '', icon: '' });  // 当前编辑的服务器

// 注册 API 方法
api.actionAdd = () => {
  currentServer.value = { id: 0, address: '', icon: '' };
  editDialog.value = true;
};

api.actionSearch = () => {
  searchQuery.value = '';
  showSearch.value = true;
  filteredServers.value = servers.value;  // 重置过滤器
};

function filterServers() {
  const query = searchQuery.value.toLowerCase();
  filteredServers.value = servers.value.filter(server =>
    server.address.toLowerCase().includes(query)
  );
}

function exitSearch() {
  showSearch.value = false;
  searchQuery.value = '';
  filteredServers.value = servers.value;  // 恢复显示所有服务器
}

function openEditDialog(server) {
  currentServer.value = { ...server };  // 复制要编辑的服务器信息
  editDialog.value = true;
}

function closeEditDialog() {
  editDialog.value = false;
}

function saveServer() {
  const serverIndex = servers.value.findIndex(s => s.id === currentServer.value.id);
  if (serverIndex !== -1) {
    servers.value[serverIndex].address = currentServer.value.address;  // 更新服务器地址
    filteredServers.value = servers.value;  // 更新过滤后的列表
  }else{
    servers.value.push(currentServer.value)
  }
  closeEditDialog();
}

function deleteServer(id) {
  servers.value = servers.value.filter(s => s.id !== id);
  filteredServers.value = servers.value;  // 删除服务器后更新过滤
  if (selectedServer.value === id && servers.value.length > 0) {
    selectedServer.value = servers.value[0].id;
  }
}
</script>

<style scoped>
.server-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 12px 16px;
  background-color: #2d2d2d;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.server-item:hover {
  background-color: #3a3a3a;
}

.server-item.selected {
  background-color: #4a4a4a;
}

.v-btn.action-btn {
  width: 32px !important;
  height: 32px !important;
  margin: 0px 5px;
}

.server-item v-icon {
  font-size: 24px;
  color: #fff;
}
</style>
