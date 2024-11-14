<template>
    <div class="svelte-jsoneditor-vue" ref="editor"></div>
</template>

<script setup lang="ts">
import { ref, defineProps, onMounted, onBeforeUnmount, watch, toRaw } from 'vue';
import { Content, ContentErrors, createJSONEditor, JSONEditorPropsOptional, JSONPatchResult, MenuItem } from 'vanilla-jsoneditor';
import { ISetting } from '@lib/main';

// JSONEditor properties as of version 0.3.60
const propNames = [
    "content",
    "mode",
    "mainMenuBar",
    "navigationBar",
    "statusBar",
    "readOnly",
    "indentation",
    "tabSize",
    "escapeControlCharacters",
    "escapeUnicodeCharacters",
    "validator",
    "onError",
    "onChange",
    "onChangeMode",
    "onClassName",
    "onRenderValue",
    "onRenderMenu",
    "queryLanguages",
    "queryLanguageId",
    "onChangeQueryLanguage",
    "onFocus",
    "onBlur",
] as const;

const props = defineProps<{
    menu: ISetting;
    value: any;
}>();
console.log(props.menu.name, props.value)
// 取出传入组件的已定义属性
function pickDefinedProps<T>(object: T, propNames: readonly (keyof T)[]): Partial<T> {
    const props: Partial<T> = {};
    for (const propName of propNames) {
        if (object[propName] !== undefined) {
            props[propName] = object[propName];
        }
    }
    return props;
}

// 定义组件的 props
const editorInstance = ref<ReturnType<typeof createJSONEditor> | null>(null);
const editor = ref<HTMLElement | null>(null);
const prefix = 'fas'; // 使用 Font Awesome 的前缀 'fas'
const iconName = 'custom-icon'; // 自定义图标名称

const iconDisable = {
    prefix: prefix,
    iconName: iconName,
    icon: [
        576, // width
        512, // height
        [], // ligatures
        '', // unicode
        'M288 80c-65.2 0-118.8 29.6-159.9 67.7C89.6 183.5 63 226 49.4 256c13.6 30 40.2 72.5 78.6 108.3C169.2 402.4 222.8 432 288 432s118.8-29.6 159.9-67.7C486.4 328.5 513 286 526.6 256c-13.6-30-40.2-72.5-78.6-108.3C406.8 109.6 353.2 80 288 80zM95.4 112.6C142.5 68.8 207.2 32 288 32s145.5 36.8 192.6 80.6c46.8 43.5 78.1 95.4 93 131.1c3.3 7.9 3.3 16.7 0 24.6c-14.9 35.7-46.2 87.7-93 131.1C433.5 443.2 368.8 480 288 480s-145.5-36.8-192.6-80.6C48.6 356 17.3 304 2.5 268.3c-3.3-7.9-3.3-16.7 0-24.6C17.3 208 48.6 156 95.4 112.6zM288 336c44.2 0 80-35.8 80-80s-35.8-80-80-80c-.7 0-1.3 0-2 0c1.3 5.1 2 10.5 2 16c0 35.3-28.7 64-64 64c-5.5 0-10.9-.7-16-2c0 .7 0 1.3 0 2c0 44.2 35.8 80 80 80zm0-208a128 128 0 1 1 0 256 128 128 0 1 1 0-256z' // svgPathData
    ]
};
//<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M192 64C86 64 0 150 0 256S86 448 192 448l192 0c106 0 192-86 192-192s-86-192-192-192L192 64zm192 96a96 96 0 1 1 0 192 96 96 0 1 1 0-192z"/></svg>
const iconEnable = {
    prefix: prefix,
    iconName: iconName,
    icon: [
        512, // width
        512, // height
        [], // ligatures
        '', // unicode
        'M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152L0 424c0 48.6 39.4 88 88 88l272 0c48.6 0 88-39.4 88-88l0-112c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 112c0 22.1-17.9 40-40 40L88 464c-22.1 0-40-17.9-40-40l0-272c0-22.1 17.9-40 40-40l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 64z' // svgPathData
    ]
};
const jsonProps: JSONEditorPropsOptional = {
    readOnly: true,
    content: { json: toRaw(props.value) },
    onRenderMenu: (items: MenuItem[], context: { mode: 'tree' | 'text' | 'table', modal: boolean, readOnly: boolean }) => {
        items.splice(2, 1)
        items.push({
            title: `切换为${jsonProps.readOnly ? '可写' : '只读'}模式`,
            icon: (jsonProps.readOnly && iconDisable || iconEnable) as any,
            type: 'button',
            onClick: () => {
                jsonProps.readOnly = !jsonProps.readOnly;
                editorInstance.value.updateProps(jsonProps);
                console.log(jsonProps.readOnly)
            }
        })
        console.log('渲染菜单', items)
        return items;
    },
    onChange: (content: Content, previousContent: Content,
        changeStatus: { contentErrors: ContentErrors | undefined, patchResult: JSONPatchResult | undefined }) => {
        console.log(content, previousContent, changeStatus)
        if (!changeStatus.contentErrors) {
            let json = {};
            if ((content as any).text) {
                json = JSON.parse((content as any).text)
            } else {
                json = (content as any).json;
            }
            Object.keys(props.value).forEach(key => delete props.value[key]);
            Object.assign(props.value, json);
            console.log('新值：', props.value)
        }
    }
};
// 创建 JSON 编辑器
onMounted(() => {
    editorInstance.value = createJSONEditor({
        target: editor.value as HTMLElement,
        props: jsonProps,
    });
    console.log("create editor", editor.value);
});

// 监视 props 变化并更新编辑器属性
watch(
    () => props.value,
    (newProps) => {
        console.log("update props", newProps);
        editorInstance.value?.updateProps(newProps);
    },
    { deep: true }
);

// 销毁编辑器实例
onBeforeUnmount(() => {
    console.log("destroy editor");
    editorInstance.value?.destroy();
    editor.value = null;
});
</script>

<style scoped>
.svelte-jsoneditor-vue {
    display: flex;
    flex: 1;
    height: 100%;
}
</style>