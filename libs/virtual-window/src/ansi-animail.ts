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
};

export type DrawCallback = {
  getRenderLength: () => number;
  prefix: (content: string) => void;
  suffix: (content: string) => void;
  success: (message?: string, icon?: boolean) => void;
  failed: (message?: string, icon?: boolean) => void;
  error: (message?: string, icon?: boolean) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export const back = (length: number) => {
  return `\x1b[${length}D\x1b[0m`
};

export const draw = (stream: Writable, dots: Spinner, options: DrawOptions = {}): DrawCallback => {
  let preffix = options.prefix || '';
  let suffix = options.suffix || '';
  let frameIndex = 0;
  let lastLength = 1 + preffix.length + suffix.length;
  let interval: NodeJS.Timeout | null = null;

  const startAnimation = () => {
    interval = setInterval(() => {
      // 更新动画帧
      frameIndex = (frameIndex + 1) % dots.frames.length;
      const content = preffix + dots.frames[frameIndex] + suffix;
      const frame = `${back(lastLength)}${content}`;
      lastLength = removeAnsiSequences(frame).length;
      stream.write(frame);
    }, dots.interval);
  };

  // 启动动画
  startAnimation();

  return {
    getRenderLength: () => lastLength,
    prefix: (content: string) => {
      preffix = content;
    },
    suffix: (content: string) => {
      suffix = content;
    },
    success: (message?: string, icon: boolean = true) => {
      if (interval) clearInterval(interval);
      message = message || `完成`;
      if (icon) {
        message = `${Icons.success} ${message}`;
      }
      stream.write(`${back(lastLength)}${message}`);
      lastLength = removeAnsiSequences(message).length;
    },
    failed: (message?: string, icon: boolean = true) => {
      if (interval) clearInterval(interval);
      message = message || `处理失败`;
      if (icon) {
        message = `${Icons.failed} ${message}`;
      }
      stream.write(`${back(lastLength)}${message}`);
      lastLength = removeAnsiSequences(message).length;
    },
    error: (message?: string, icon: boolean = true) => {
      if (interval) clearInterval(interval);
      message = message || `出现错误`;
      if (icon) {
        message = `${Icons.error} ${message}`;
      }
      stream.write(`${back(lastLength)}${message}`);
      lastLength = removeAnsiSequences(message).length;
    },
    pause: () => {
      if (interval) clearInterval(interval);
    },
    resume: () => {
      if (!interval) startAnimation();
    },
    reset: () => {
      if (interval) clearInterval(interval);
      preffix = options.prefix || '';
      suffix = options.suffix || '';
      frameIndex = 0;
      lastLength = 1 + preffix.length + suffix.length;
      startAnimation();
    }
  };
};
