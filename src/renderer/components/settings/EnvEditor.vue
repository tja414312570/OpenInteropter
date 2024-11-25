<template>
    <div style="display: flex;flex-direction: column; overflow: hidden; height: 100%;">
        <!-- 顶部操作栏 -->
        <v-card-title class="d-flex align-center pe-2">
            <v-icon icon="mdi-application-variable-outline"></v-icon> &nbsp;
            应用环境变量
            <v-spacer></v-spacer>
            <v-text-field v-model="search" density="compact" label="搜索" prepend-inner-icon="mdi-magnify"
                variant="solo-filled" style="margin-right: 16px;" flat hide-details single-line></v-text-field>
            <v-btn color="primary" @click="addVariable" style="margin-right: 16px;">新增</v-btn>
            <v-btn color="error" :disabled="selected.length === 0" @click="deleteSelected">删除</v-btn>

        </v-card-title>
        <v-divider></v-divider>
        <!-- 表格，带虚拟滚动 -->
        <v-data-table style="flex: 1;overflow: scroll;" v-model:search="search" fixed-header show-select
            :items-per-page="-1" :filter-keys="['name', 'value']" v-model="selected" :items="props.value"
            item-value="id" item-key="id" :headers="headers" hide-default-footer virtual-scroll no-data-text="暂无数据"
            @click:row="editVariable">
            <template v-slot:item.path="{ item }">
                <div class="text-end">
                    <v-chip :color="item.path === false ? '' : 'green'" :text="item.path === false ? '否' : '是'"
                        class="text-uppercase" size="small" label></v-chip>
                </div>
            </template>
            <template v-slot:item.status="{ item }">
                <div class="text-end">
                    <v-chip :color="item.status == 'enable' ? 'green' : 'red'"
                        :text="item.status == 'enable' ? '启用' : '禁用'" class="text-uppercase" size="small"
                        label></v-chip>
                </div>
            </template>
        </v-data-table>

        <!-- 编辑对话框 -->
        <v-dialog v-model="dialog" max-width="400">
            <v-card>
                <v-card-title>编辑环境变量</v-card-title>
                <v-card-text>
                    <v-form ref="form">
                        <v-text-field label="变量名称" v-model="currentVariable.name" :rules="[nameRule]"
                            required></v-text-field>
                        <v-textarea label="变量值" v-model="currentVariable.value" :rules="[valueRule]"
                            required></v-textarea>
                        <v-card-text>
                            <b>创建者：</b>{{ currentVariable.source }}
                        </v-card-text>
                        <v-checkbox :label="currentVariable.path === false ? '是否环境变量(否)' : '是否环境变量(是)'"
                            v-model="currentVariable.path"></v-checkbox>
                        <v-checkbox :label="currentVariable.status === 'enable' ? '是否启用(启用)' : '是否启用(禁用)'"
                            v-model="currentVariable.status" true-value="enable" false-value="disable"></v-checkbox>
                    </v-form>
                </v-card-text>
                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn color="primary" @click="saveVariable">保存</v-btn>
                    <v-btn @click="dialog = false">取消</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, toRaw } from 'vue';
import { v4 as uuid } from 'uuid';
import { EnvVariable } from '@main/services/env-manager';
import type { ISetting } from '@lib/main';
const props = defineProps<{
    menu: ISetting;
    value: Array<EnvVariable>;
}>();
const headers = reactive<Array<{
    title?: string,
    key?: string,
    align?: "center" | "end" | "start",
}>>([
    { title: '名称', key: 'name', align: 'center' },
    { title: '值', key: 'value', align: 'center' },
    { title: '路径变量', key: 'path', align: 'center' },
    { title: '状态', key: 'status', align: 'end' },
])
const nameRule = (value: string) => {
    for (const variable of props.value) {
        if (!currentVariable.id && variable.name === value) {
            return `变量名${value}已经存在`
        }
    }
    return !!value || '变量名称不能为空'
}
const valueRule = (value: string) => !!value || '变量值不能为空'
const search = ref('')
const dialog = ref(false)
const selected = ref<string[]>([])
const currentVariable = reactive<EnvVariable>({} as any)
// 新增变量
const addVariable = () => {
    currentVariable.id = '';
    currentVariable.name = '';
    currentVariable.value = '';
    currentVariable.status = 'enable';
    currentVariable.source = '用户新增';
    dialog.value = true
}

// 删除选中变量
const deleteSelected = () => {
    const selectedNames = selected.value
        .map(id => {
            const variable = props.value.find(item => item.id === id)
            return variable ? variable.name : ''
        })
        .filter(name => name)
        .join(', ')

    const result = confirm(
        `您正在删除：${selectedNames}。\n` +
        `共计 ${selected.value.length} 个变量，删除后将无法恢复！\n` +
        `请确保这些变量已备份或不再需要，以免影响应用或插件的正常运行。`
    )
    if (result) {
        for (let id of selected.value) {
            console.log('删除', id)
            const index = props.value.findIndex(
                (item) => item.id === id
            )
            if (index > -1) {
                props.value.splice(index, 1)
            }
        }
        selected.value = []
    }
}

// 编辑变量
const editVariable = (_envent, item: any) => {
    Object.assign(currentVariable, toRaw(item.item))
    dialog.value = true
}
const form = ref();
// 保存变量
const saveVariable = async () => {
    const isValid = await form.value.validate();
    if (!isValid.valid) {
        return;
    }
    if (!currentVariable.id) {
        currentVariable.id = uuid();
        props.value.push({ ...currentVariable });
    } else {
        const target = props.value.find(item => item.id == currentVariable.id)
        if (!target) {
            props.value.push({ ...currentVariable })
        } else {
            Object.assign(target, currentVariable)
        }
    }
    dialog.value = false;
}
</script>

<style scoped>
:deep(table tbody) {
    overflow: scroll;
}

:deep(.v-checkbox .v-input__details) {
    display: none;
}
</style>