<template>
    <v-container ref="bindApi">
        <!-- 代理类型选择 -->
        <v-radio-group v-model="props.value.proxyType" row>
            <v-radio label="无代理" value="none" />
            <v-radio label="自动检测代理设置" value="auto" />
            <v-radio label="手动代理配置" value="manual" />
        </v-radio-group>

        <!-- 自动代理设置 URL -->
        <v-text-field v-if="props.value.proxyType === 'auto'" v-model="props.value.autoProxyUrl" label="自动代理配置 URL"
            prepend-icon="mdi-earth"></v-text-field>

        <!-- 手动代理配置 -->
        <div v-if="props.value.proxyType === 'manual'" class="mt-4">
            <v-radio-group v-model="props.value.manualProxyType" row>
                <v-radio label="HTTP" value="http" />
                <!-- <v-radio label="HTTPS" value="https" /> -->
                <!-- <v-radio label="SOCKS" value="socks" /> -->
            </v-radio-group>

            <v-text-field label="主机名 (H)" v-model="props.value.hostname" prepend-icon="mdi-server"></v-text-field>

            <v-text-field label="端口号 (N)" v-model="props.value.port" prepend-icon="mdi-numeric"
                type="number"></v-text-field>

            <v-text-field label="不为以下项使用代理" v-model="props.value.noProxy" hint="示例: *.domain.com, 192.168.*"
                persistent-hint></v-text-field>

            <!-- 代理身份验证 -->
            <v-checkbox label="代理身份验证" v-model="props.value.useAuth"></v-checkbox>

            <v-text-field v-if="props.value.useAuth" label="登录 (L)" v-model="props.value.username"
                prepend-icon="mdi-account"></v-text-field>

            <v-text-field v-if="props.value.useAuth" label="密码 (P)" v-model="props.value.password"
                prepend-icon="mdi-lock" type="password"></v-text-field>

            <v-checkbox v-if="props.value.useAuth" label="记住 (R)" v-model="props.value.remember"></v-checkbox>
        </div>

        <!-- 检查连接按钮 -->
        <v-btn @click="showDialog" class="mt-4" color="primary">检查连接</v-btn>

        <!-- 弹窗部分 -->
        <v-dialog v-model="dialog" max-width="500px">
            <v-card>
                <v-card-title class="headline">检查连接</v-card-title>
                <v-card-text>
                    <v-text-field label="测试地址" :error-messages="errorMessages" v-model="testUrl" prepend-icon="mdi-link"
                        placeholder="请输入要连接的地址" />
                    <v-progress-linear color="green" v-show="checking" indeterminate></v-progress-linear>
                </v-card-text>
                <v-card-actions>
                    <v-btn color="primary" @click="checkConnection" :disabled="checking">开始检查</v-btn>
                    <v-btn @click="dialog = false">取消</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-container>
</template>

<script lang="ts" setup>
import type { ISetting } from '@lib/main';
import { getIpcApi } from '@preload/lib/ipc-api';
import { onUnmounted, reactive, ref, toRaw, watch } from 'vue'
const props = defineProps<{
    menu: ISetting;
    value: any;
}>();

interface ProxySettings {
    proxyType: 'none' | 'auto' | 'manual'
    autoProxyUrl: string
    manualProxyType: 'http' | 'socks' | 'https'
    hostname: string
    port: number
    noProxy: string
    useAuth: boolean
    username: string
    password: string
    remember: boolean
}
const bindApi = ref()
const checking = ref(false)
const initial = () => {
    if (!props.value || Object.keys(props.value).length === 0) {
        Object.assign(props.value, {
            proxyType: 'none', // 无代理、自动检测代理设置或手动代理配置
            autoProxyUrl: '',
            manualProxyType: 'http', // HTTP 或 SOCKS
            hostname: '127.0.0.1',
            port: 7890,
            noProxy: '',
            useAuth: false,
            username: '',
            password: '',
            remember: false,
        })
    }
    console.log("初始化:", props.value)
}
initial()
watch(props.value, initial)
console.log("代理数据:", props.value)
// const item = reactive<ProxySettings>({
//     proxyType: 'none', // 无代理、自动检测代理设置或手动代理配置
//     autoProxyUrl: '',
//     manualProxyType: 'http', // HTTP 或 SOCKS
//     hostname: '127.0.0.1',
//     port: 7890,
//     noProxy: '',
//     useAuth: false,
//     username: '',
//     password: '',
//     remember: false,
// })

const dialog = ref(false);  // 控制弹窗的显示
const testUrl = ref('https://google.com');    // 存储用户输入的测试地址

// 显示弹窗
function showDialog() {
    dialog.value = true;
}

const errorMessages = ref('')
// 检查连接逻辑
const settingApi = getIpcApi('ipc-settings', onUnmounted);
function checkConnection() {
    if (!testUrl.value) {
        console.error("请输入测试地址");
        errorMessages.value = '请输入测试地址'
        return;
    }
    errorMessages.value = ''
    checking.value = true;
    let url = testUrl.value;

    settingApi.invoke('proxy-test', toRaw(props.value), url).then(data => {
        console.log("结果:", data)
        if (data.error) {
            errorMessages.value = data.error
            return;
        }
        alert("连接成功！");
    }).finally(() => {
        checking.value = false;
    })
}
</script>

<style scoped>
.mt-4 {
    margin-top: 16px;
}

:deep(.v-selection-control-group) {
    flex-direction: row !important;
}
</style>
