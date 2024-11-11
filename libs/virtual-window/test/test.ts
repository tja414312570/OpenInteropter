import { Writable } from "stream";
import VirtualWindow from "./src/virtual-window";
import ansiEscapes from "ansi-escapes";
const virtualWindow = new VirtualWindow();
virtualWindow.setDebug(false);
function debug(data: string) {
  return data.replace(/[\x00-\x1F\x7F]/g, (char) => {
    const hex = char.charCodeAt(0).toString(16).padStart(2, "0");
    return `\\x${hex}`;
  });
}

virtualWindow.write("hello world\n");

virtualWindow.onRender((content) => {
  console.clear();
  console.log(content);
});
// const spinner = ora({
//   stream: virtualWindow.getStream(),
//   isEnabled: true,
//   text: "加载中...",
//   spinner: "dots", // 可选的动画样式
// }).start();
// `\x1b[1D`
import pc from "picocolors";

const spinner = cliSpinners.dots; // 使用 "dots" 样式的动画
const message = "加载中"; // 文本内容
let frameIndex = 0;
virtualWindow.write("\n" + message);
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

const draw = (stream: Writable, dots: Spinner) => {
  stream.write("\x1b[1C");
  const interval = setInterval(() => {
    // 使用 ANSI 序列将光标左移一个字符的距离
    // 更新动画帧
    frameIndex = (frameIndex + 1) % dots.frames.length;
    const content = pc.red(dots.frames[frameIndex]);
    const frame = `\x1b[1D` + content;
    virtualWindow.write(frame);
  }, dots.interval);

  return {
    success: (message?: string) => {
      clearInterval(interval);
      stream.write(`\x1b[1D${pc.green(`✔️ ${message || "完成"}`)}`);
    },
    failed: (message?: string) => {
      clearInterval(interval);
      stream.write(`\x1b[1DX ${message || "处理失败"}`);
    },
    error: (error: string) => {
      clearInterval(interval);
      stream.write(`\x1b[1DX 错误:${error}`);
    },
  };
};
const d = draw(virtualWindow.getStream(), spinner);
setTimeout(() => {
  d.success();
}, 5000); // 动画持续5秒
