// 创建编辑器实例
const editor = monaco.editor.create(document.getElementById('container'), {
    value: [
        'class NodeExecutor extends AbstractPlugin implements PluginLifecycle, InstructExecutor {',
        '    execute(instruct: InstructContent): Promise<string | void> {',
        '        const { code, language } = instruct;',
        '        const context = {};',
        '        createContext(context);',
        '        return new Promise((resolve, reject) => {',
        '            try {',
        '                const result = runInContext(code, context);',
        '                resolve(result);',
        '            } catch (error) {',
        '                reject(error);  // 捕获错误并调用 reject',
        '            }',
        '        });',
        '    }',
        '}'
    ].join('\n'),
    language: 'typescript',
    theme: 'vs-dark',
    lineNumbers: 'on'
});

// 创建 ViewZone 插入到指定行下方
class InlineViewZone {
    constructor(editor, lineNumber) {
        this.editor = editor;
        this.lineNumber = lineNumber;
        this.zoneId = null;

        this.createZone();
    }

    createZone() {
        this.zoneId = this.editor.changeViewZones(accessor => {
            const domNode = document.createElement('div');
            domNode.className = 'inline-viewzone-content';
            domNode.innerHTML = `
                <pre style="padding: 10px; margin: 0; color: #fff;">
onResponse(ctx: IContext): Promise<string | void> {
    return new Promise<string | void>((async (resolve) => {
        const response = ctx.serverToProxyResponse;
        // 这里是模拟的行内容
    }));
}
                </pre>
            `;

            const viewZone = {
                afterLineNumber: this.lineNumber,
                heightInLines: 9, // 设置内容显示的高度
                domNode: domNode
            };

            return accessor.addZone(viewZone);
        });
    }
}

// 创建 ViewZone 在指定行之下
const lineToDecorate = 12;
new InlineViewZone(editor, lineToDecorate);

// 样式控制
const style = document.createElement('style');
style.innerHTML = `
    .inline-viewzone-content {
        background-color: #3b3f51;
        border: 1px solid #d19a66;
        color: #ffffff;
        font-family: monospace;
        width: 100%;
        white-space: pre-wrap;
    }
`;
document.head.appendChild(style);
