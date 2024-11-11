//@ts-ignore
import { Spinner } from "cli-spinners";
import { Writable } from "stream";

const removeAnsiSequences = (str: string) => str.replace(/\x1b[\[\]()#;?]*[0-9;]*[a-zA-Zc]/g, '');

interface DrawOptions {
  prefix?: string;
  suffix?: string;
}
export const Icons = {
  success:'✔️',
  warn:'⚠️',
  error:'⛔',
  failed:'❌'
}

export const draw = (stream: Writable, dots: Spinner, options: DrawOptions = {}) => {
 
  let preffix = options.prefix || '';
  let suffix = options.suffix || '';
  let frameIndex = 0;
  let lastLength = 1+preffix.length+suffix.length;
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
    getRenderLength:()=>lastLength,
    prefix: (content: string) => {
      preffix = content;
    },
    suffix: (content: string) => {
      suffix = content;
    },
    success: (message?: string,icon:boolean = true) => {
      clearInterval(interval);
      message = message || `完成`
      if(icon){
        message=`${Icons.success} ${message}`
      }
      stream.write(`\x1b[${lastLength}D${message}`);
      lastLength = removeAnsiSequences(message).length
    },
    failed: (message?: string,icon:boolean = true) => {
      clearInterval(interval);
      message = message || `处理失败`
      if(icon){
        message=`${Icons.failed} ${message}`
      }
      stream.write(`\x1b[${lastLength}D${message}`);
      lastLength = removeAnsiSequences(message).length
    },
    error: (message?: string,icon:boolean = true) => {
      clearInterval(interval); 
      message = message || `出现错误`
      if(icon){
        message=`${Icons.failed} ${message}`
      }
      stream.write(`\x1b[${lastLength}D${message}`);
      lastLength = removeAnsiSequences(message).length
    },
  };
};
