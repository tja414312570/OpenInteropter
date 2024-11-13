<template>
    <v-container>
        <v-card>
            <v-card-title>环境变量管理</v-card-title>
            <v-card-subtitle>查看、修改、新增和删除环境变量</v-card-subtitle>

            <v-card-text>
                <!-- 使用 v-virtual-scroll 实现虚拟滚动 -->
                <v-virtual-scroll :items="envVariables" item-height="56">
                    <template v-slot="{ item, index }">
                        <v-row class="my-2" dense>
                            <v-col cols="4">
                                <strong>{{ item.name }}</strong>
                            </v-col>
                            <v-col cols="6">
                                <v-text-field v-model="item.value" dense hide-details outlined
                                    @change="updateEnv(item.name, item.value)"></v-text-field>
                            </v-col>
                            <v-col cols="2">
                                <v-btn icon @click="deleteEnv(index)">
                                    <v-icon color="red">mdi-delete</v-icon>
                                </v-btn>
                            </v-col>
                        </v-row>
                    </template>
                </v-virtual-scroll>
            </v-card-text>

            <v-card-actions>
                <v-btn color="primary" @click="addEnv">新增变量</v-btn>
                <v-btn color="success" @click="saveChanges">保存更改</v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 表格头部定义
const headers = [
    { text: '名称', value: 'name' },
    { text: '值', value: 'value' },
];

// 定义环境变量的数据结构
interface EnvVariable {
    name: string;
    value: string;
    id: string;
}

let id = 0;
// 模拟的环境变量数据 (假设有很多数据)
const envVariables = ref<EnvVariable[]>(Array.from({ length: 10 }, (_, i) => ({
    id: id++, // 使用 uuid 生成唯一 id
    name: `VAR_${i + 1}`,
    value: `Value ${i + 1}`,
})));

// 更新环境变量的函数
const updateEnv = (name: string, value: string) => {
    const variable = envVariables.value.find((v) => v.name === name);
    if (variable) {
        variable.value = value;
    }
};

// 新增环境变量的函数
const addEnv = () => {
    envVariables.value.push({
        id: id++,
        name: `NEW_VAR_${envVariables.value.length + 1}`,
        value: '',
    });
};

// 删除环境变量的函数
const deleteEnv = (index: number) => {
    envVariables.value.splice(index, 1);
};

// 保存更改的函数（仅用于模拟）
const saveChanges = () => {
    const envData = Object.fromEntries(envVariables.value.map((v) => [v.name, v.value]));
    console.log('保存的环境变量:', envData);
    alert('环境变量已保存（仅模拟）');
};
</script>

<style scoped>
.v-container {
    max-width: 600px;
    margin: auto;
}
</style>