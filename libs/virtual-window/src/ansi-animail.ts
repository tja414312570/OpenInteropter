//@ts-ignore
import { Spinner } from "cli-spinners";
import { Writable } from "stream";

const removeAnsiSequences = (str: string) => str.replace(/\x1b[\[\]()#;?]*[0-9;]*[a-zA-Zc]/g, '');

interface DrawOptions {
  prefix?: string;
  suffix?: string;
}
export const Icons = {
  success: '✔️',
  warn: '⚠️',
  error: '⛔',
  failed: '❌'
}

export const draw = (stream: Writable, dots: Spinner, options: DrawOptions = {}) => {

  let preffix = options.prefix || '';
  let suffix = options.suffix || '';
  let frameIndex = 0;
  let lastLength = 1 + preffix.length + suffix.length;
  stream.write(`\x1b[${lastLength}C`);
  const interval = setInterval(() => {
    // 更新动画帧
    frameIndex = (frameIndex + 1) % dots.frames.length;
    const content = preffix + dots.frames[frameIndex] + suffix;
    const frame = `\x1b[${lastLength}D\x1b[0m` + content;
    lastLength = removeAnsiSequences(frame).length;
    stream.write(frame);
  }, dots.interval);

  return {
    getRenderLength: () => lastLength,
    prefix: (content: string) => {
      preffix = content;
    },
    suffix: (content: string) => {
      suffix = content;
    },
    success: (message?: string) => {
      clearInterval(interval);
      message = message || `${Icons.success} 完成`
      stream.write(`\x1b[${lastLength}D${message}`);
      lastLength = removeAnsiSequences(message).length
    },
    failed: (message?: string) => {
      clearInterval(interval);
      message = message || `${Icons.failed} 处理失败`
      stream.write(`\x1b[${lastLength}D${message}`);
      lastLength = removeAnsiSequences(message).length
    },
    error: (error?: string) => {
      clearInterval(interval);
      error = error || `${Icons.error} 出现错误`;
      stream.write(`\x1b[${lastLength}D${error}`);
      lastLength = removeAnsiSequences(error).length
    },
  };
};
