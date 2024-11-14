<template>
    <div class="svelte-jsoneditor-vue" ref="editor"></div>
</template>

<script setup lang="ts">
import { ref, defineProps, onMounted, onBeforeUnmount, watch, toRaw } from 'vue';
import { Content, ContentErrors, createJSONEditor, JSONPatchResult } from 'vanilla-jsoneditor';
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

// 创建 JSON 编辑器
onMounted(() => {
    editorInstance.value = createJSONEditor({
        target: editor.value as HTMLElement,
        props: {
            content: { json: toRaw(props.value) },
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
        },

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