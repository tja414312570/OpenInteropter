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
  failed: '❌',
  pause: '⏸️',
  resume: '⏯️',
  reset: '🔄'
};

export type DrawCallback = {
  getRenderLength: () => number;
  prefix: (content: string) => void;
  suffix: (content: string) => void;
  success: (message?: string, icon?: boolean) => void;
  failed: (message?: string, icon?: boolean) => void;
  error: (message?: string, icon?: boolean) => void;
  pause: (message?: string, icon?: boolean) => void;
  resume: (message?: string, icon?: boolean) => void;
  reset: () => void;
};

export const back = (length: number) => {
  return `\x1b[${length}D\x1b[0m`
};

export const draw = (stream: Writable, dots: Spinner, options: DrawOptions = {}): DrawCallback => {
  let preffix = options.prefix || '';
  let suffix = options.suffix || '';
  let frameIndex = -1;
  let lastLength = removeAnsiSequences(preffix + dots.frames[0] + suffix).length;
  let interval: NodeJS.Timeout | null = null;
  stream.write(`\x1b[${lastLength}C`);
  const updateFrame = () => {
    frameIndex = (frameIndex + 1) % dots.frames.length;
    const content = preffix + dots.frames[frameIndex] + suffix;
    const frame = `${back(lastLength)}${content}`;
    lastLength = removeAnsiSequences(frame).length;
    stream.write(frame);
  };

  const startAnimation = () => {
    updateFrame();
    interval = setInterval(updateFrame, dots.interval);
  };

  const notify = (message: string, icon: string | false) => {
    if (icon) {
      message = `${icon} ${message}`;
    }
    stream.write(`${back(lastLength)}${message}`);
    lastLength = removeAnsiSequences(message).length;
  }
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
      notify(message || `完成`, icon && Icons.success)
    },
    failed: (message?: string, icon: boolean = true) => {
      if (interval) clearInterval(interval);
      notify(message || `处理失败`, icon && Icons.failed)
    },
    error: (message?: string, icon: boolean = true) => {
      if (interval) clearInterval(interval);
      notify(message || `出现错误`, icon && Icons.error)
    },
    pause: (message?: string, icon: boolean = true) => {
      if (interval) clearInterval(interval);
      notify(message || `任务暂停`, icon && Icons.pause)
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
