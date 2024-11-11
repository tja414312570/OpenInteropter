import VirtualWindow, { draw } from "../src/index";
import ansiEscapes from "ansi-escapes";
import cliSpinners, { Spinner } from 'cli-spinners'
import pc from "picocolors";
const virtualWindow = new VirtualWindow();
virtualWindow.setDebug(false);
function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}
virtualWindow.write(pc.bgRedBright("hello world\n"));
virtualWindow.onRender((content) => {
  console.clear();
  console.log(content);
  console.log(debug(content));
});
setTimeout(() => {
  // virtualWindow.write(ansiEscapes.clearScreen)
}, 2000)
const spinner = cliSpinners.dots; // 使用 "dots" 样式的动画
const message = "加载中"; // 文本内容
virtualWindow.write("\n" + message + "\n");
virtualWindow.write(pc.reset(''))
const d = draw(virtualWindow.getStream(), spinner, { suffix: pc.bgRed('处理中 ') });
let i = 0;
const int = setInterval(() => {
  d.suffix(' ' + (i++) + '%')
}, 1000);
setTimeout(() => {
  virtualWindow.write(pc.reset(''))
  clearInterval(int)
  d.success(`${pc.green(`处理完成hhhhhhhhhhhhhh`)}\n` + pc.reset(""));
}, 5000); // 动画持续5秒
