import { Spinner } from "cli-spinners";
import { Writable } from "stream";
import pc from "picocolors";

export const draw = (stream: Writable, dots: Spinner) => {
  stream.write("\x1b[1C");
  let frameIndex = 0;
  const interval = setInterval(() => {
    // 使用 ANSI 序列将光标左移一个字符的距离
    // 更新动画帧
    frameIndex = (frameIndex + 1) % dots.frames.length;
    const content = dots.frames[frameIndex];
    const frame = `\x1b[1D` + content;
    stream.write(frame);
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
