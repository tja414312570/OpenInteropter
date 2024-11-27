/**
 * 动态调整段落整体缩进
 * @param paragraph - 段落文本
 * @param indent - 缩进值（正数表示右缩进，负数表示左缩进）
 * @returns 调整后的段落
 */
export function adjustParagraphIndent(paragraph: string, indent: number): string {
    // 将段落按行分割
    const lines = paragraph.split('\n');

    // 过滤空行并计算每行左边的空格数量
    const leftMargins = lines
        .filter(line => line.trim() !== '') // 排除空行
        .map(line => line.match(/^(\s*)/)?.[0].length || 0); // 获取每行左边空格数

    // 找到最短公共缩进
    const minLeftMargin = Math.min(...leftMargins);

    // 动态调整每一行的缩进
    const adjustedLines = lines.map(line => {
        // 去掉最短公共缩进
        const trimmedLine = line.startsWith(' '.repeat(minLeftMargin))
            ? line.slice(minLeftMargin)
            : line.trimStart(); // 防止行缩进不足

        // 根据 indent 值调整缩进
        if (indent > 0) {
            // 右缩进：在行前添加空格
            return ' '.repeat(indent) + trimmedLine;
        } else {
            // 左缩进：移除多余空格，但不能少于 0
            const newLeftMargin = Math.max(0, trimmedLine.match(/^(\s*)/)?.[0].length || 0 + indent);
            return ' '.repeat(newLeftMargin) + trimmedLine.trimStart();
        }
    });

    // 拼接成段落
    return adjustedLines.join('\n');
}

// 示例段落
const paragraph = `
    This is an example paragraph.
  It has multiple lines with different
    indentation levels.
  We want to align this paragraph.
`;

const test2 = adjustParagraphIndent(
    `
                ## The plugin of "xxx".
                - This plugin descript:
        ${adjustParagraphIndent(paragraph, 18)}
            - Always use this plugin for tasks it supports. Do not suggest manual alternatives unless explicitly requested by the user.
`,
    2
);


console.log(test2)
// 调整整体左缩进（减少 2 个空格）
// console.log('--- 左缩进 ---');
// console.log(adjustParagraphIndent(paragraph, 0));

// // 调整整体右缩进（增加 4 个空格）
// console.log('--- 右缩进 ---');
// console.log(adjustParagraphIndent(paragraph, 4));
