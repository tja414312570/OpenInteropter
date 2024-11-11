import cliSpinners, { Spinner } from "cli-spinners";
// console.log(cliSpinners.dots);
import ora from "ora";
import { Writable } from "stream";
import VirtualWindow from "../src/main/virtual-window";
import {draw} from '../src/main/ansi-animail'
import ansiEscapes from "ansi-escapes";
const virtualWindow = new VirtualWindow();
virtualWindow.setDebug(false);
function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}

virtualWindow.write(pc.cyan("hello world")+"\n");
virtualWindow.write(ansiEscapes.eraseScreen)
virtualWindow.write(pc.bgRedBright("hello world2")+"\n");
virtualWindow.onRender((content) => {
  console.clear();
  console.log("\x1b[0m");
  console.log(content);
  console.log(debug(content));
});
import pc from "picocolors";

const spinner = cliSpinners.dots; // 使用 "dots" 样式的动画
const message = "加载中"; // 文本内容
let frameIndex = 0;
virtualWindow.write("\n" + pc.red(message));

let i = 0;
// while (i++ < 10) {
//   // 使用 ANSI 序列将光标左移一个字符的距离
//   // 更新动画帧
//   frameIndex = (frameIndex + 1) % spinner.frames.length;
//   const content = pc.red(spinner.frames[frameIndex]);
//   const frame = `\x1b[1D\x1b[0m` + content;
//   //   console.log("====================");
//   //   console.log(debug(frame));
//   //   const frame = `\x1b[1D` + spinner.frames[frameIndex];
//   virtualWindow.write(frame);
// }
// virtualWindow.write(ansiEscapes.clearScreen);
virtualWindow.write(pc.reset(''))
const d = draw(virtualWindow.getStream(), spinner,{prefix:'处理中 '});
// d.prefix(pc.red(message))
setTimeout(() => {
  virtualWindow.write(pc.reset(''))
  d.success(pc.green(' 处理完成'));
}, 5000); // 动画持续5秒
