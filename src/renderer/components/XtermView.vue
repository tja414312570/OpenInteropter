<template>
  <div class="terminal-container" id="terminal-window">
    <div style="top: 0;bottom:0;left:0;right:0;position: absolute;">
      <div ref="terminalWrapper" style="position: relative;width: 100%;height: 100%;">
        <div ref="terminalRef" id="xterm" class="terminal" style="height: 100%;"></div>
      </div>
    </div>
  </div>
</template>

<script lang='ts' setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Terminal } from 'xterm';
import { debounce } from 'lodash';
import { FitAddon } from 'xterm-addon-fit';
import { getIpcApi } from '@lib/preload'
import { WebLinksAddon } from 'xterm-addon-web-links';
const fitAddon = new FitAddon();
const terminalRef = ref(null);
const terminalWrapper = ref(null);
let terminal = null;
let resizeObserver = null;
// const cnm = (event, data) => {
//   executeing = true;
//   console.log('Data received from code:', data, executeing);  // 调试终
//   // terminal.write(data);
//   terminalApi.send('terminal-input', data + ' ; echo ' + end_tag + '\n');
// };

const terminalApi: any = getIpcApi("pty")
onMounted(async () => {
  // 等待 DOM 更新完成
  console.log("初始化终端:", terminalWrapper)
  // 初始化 xterm.js 终端
  terminal = new Terminal({
    theme: {
      background: '#1e1e1e',  // 背景色
      foreground: '#dcdcdc',  // 前景色
      cursor: '#ffffff',      // 光标颜色
      selectionBackground: '#c0c0c0',   // 选中颜色
      black: '#000000',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#bbbbbb',
      brightBlack: '#555555',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92d0',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff'
    },
    fontSize: 14,             // 字体大小
    fontFamily: 'monospace',  // 字体
    cursorBlink: true,         // 光标闪烁,
    scrollback: 1000,
    allowProposedApi: true,
    rightClickSelectsWord: true,
    lineHeight: 1,
    allowTransparency: true,
  });

  // const webLinksAddon = new WebLinksAddon();
  // terminal.loadAddon(webLinksAddon);
  terminal.options.cursorStyle = 'block';
  terminal.options.cursorBlink = true;
  terminal.options.fontSize = 12;


  terminal.loadAddon(fitAddon);
  terminal.open(terminalRef.value);

  // 调整终端大小
  fitAddon.fit();
  terminalApi.on('terminal-output', (event, data) => {
    console.log('从终端收到数据:', terminalRef, data);  // 调试终
    terminal.write(data);
  });

  // 监听终端输入并发送到主进程
  terminal.onData((data) => {
    console.log('Data send from terminal:', data);  // 调试终
    terminalApi.send('terminal-input', data);
  });
  // 使用 ResizeObserver 监听容器大小变化并调整终端大小
  resizeObserver = new ResizeObserver(() => {
    fitAddon.fit();
  });

  resizeObserver.observe(terminalWrapper.value);

  terminal.prompt = () => {
    terminalApi.send('terminal-into', '\r');
  };
  terminal.clear()
  terminal.writeln('Welcome to chat interpter');
  // ipcRenderer.send("terminal-into", "ls -ila\r");

  terminal.focus();
  terminal.onResize((size) => {
    const { cols, rows } = size;
    // 检查 cols 和 rows 是否为正数
    // debouncedResize(cols, rows);
    console.log('重置终端:', cols, rows)
    if (cols > 0 && rows > 0) {
      terminalApi.send('terminal-resize', cols, rows);
    }
  });
  window.addEventListener('resize', () => fitAddon.fit());
});

onBeforeUnmount(() => {
  // 销毁终端
  console.log("销毁终端")
  if (terminal) {
    terminal.dispose();
    window.removeEventListener('resize', fitAddon.fit);
  }
  terminalApi.offAll()
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<style scoped>
.terminal-container {
  height: 100%;
  width: 100%;
  background-color: #1e1e1e;
  /* 背景色与终端一致 */
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  /* 添加阴影效果 */
}

.terminal {
  height: 100%;
  width: 100%;
}



#terminal-window::-webkit-scrollbar,
#treeParent::-webkit-scrollbar {
  display: block;
  width: 15px;
  overflow: auto;
  border: var(--scrollbar_border);
  margin-top: 20px;
  padding-top: 20px;
}

#terminal-window::-webkit-scrollbar-thumb,
#treeParent::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar_scrollybit_color);
  border: var(--scrollbar_box_border);
}

#terminal-window::-webkit-scrollbar-track,
#treeParent::-webkit-scrollbar-track {
  /* background-color: rgb(209, 159, 59); */
  background-color: #27263a;
  margin-top: 2px;
  /* padding-top: 20px; */
}

#terminal-window::-webkit-scrollbar-track-piece,
#treeParent::-webkit-scrollbar-track-piece {
  border: var(--scrollbar_border);
  background-color: rgb(105, 225, 244);
  background-color: var(--scrollbar_box_color);
}

#terminal-window::-webkit-scrollbar-corner,
#treeParent::-webkit-scrollbar-corner {
  width: 20px;
  height: 20px;
  border: 3px solid white;
  background-color: rgb(209, 59, 179);
}

#terminal-window::-webkit-resizer,
#treeParent::-webkit-resizer {
  width: 20px;
  height: 20px;
  background-color: rgb(59, 104, 209);
  border: 3px solid white;

}




.xterm {
  position: relative;
  user-select: none;
  -ms-user-select: none;
  -webkit-user-select: none;
  font-size: 12px;
  color: white;

  /* display: flex;
  flex-direction: column;
  flex-grow: 1; */
  /* height: 1000px; */
}

#xterm {
  flex-grow: 1;
}

.terminal {
  width: 100%;
}
</style>
<style scoped>
:deep(.xterm.focus),
:deep(.xterm:focus) {
  outline: none;
}

:deep(.xterm) {
  user-select: text;
  /* 启用文本选择 */
}

:deep(.xterm .xterm-helpers) {
  position: absolute;
  top: 0;
  z-index: 10;
  color: white;
}

:deep(.xterm .xterm-helper-textarea) {
  color: white;
  padding: 0;
  border: 0;
  margin: 0;
  position: absolute;
  opacity: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: -10;
  overflow: hidden;
  resize: none;
}

:deep(.xterm .composition-view) {
  background: rgba(35, 35, 65, 0.452);
  color: #fff;
  display: none;
  position: absolute;
  white-space: nowrap;
  z-index: 1;
}

:deep(.xterm .composition-view.active) {
  display: block;
}

:deep(.xterm .xterm-viewport) {
  background-color: rgba(65, 38, 35, 0.452);
  color: #fff;
  overflow-y: scroll;
  cursor: default;
  position: absolute;
  right: 0;
  left: 0;
  top: 0;
  bottom: 0;
  width: 100%;
}

:deep(.xterm .xterm-screen) {
  position: relative;
  width: 100%;
}

:deep(.xterm .xterm-screen canvas) {
  width: 100%;
  z-index: 1;
  position: absolute;
  left: 0;
  top: 0;
}

:deep(.xterm .xterm-scroll-area) {
  visibility: hidden;
}

:deep(.xterm-char-measure-element) {
  display: inline-block;
  visibility: hidden;
  position: absolute;
  top: 0;
  left: -9999em;
  line-height: normal;
}

:deep(.xterm) {
  cursor: text;
}

:deep(.xterm.enable-mouse-events) {
  cursor: default;
}

:deep(.xterm.xterm-cursor-pointer) {
  cursor: pointer;
}

:deep(.xterm.column-select.focus) {
  cursor: crosshair;
}

:deep(.xterm .xterm-accessibility),
:deep(.xterm .xterm-message) {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  z-index: 10;
  color: #fff;
  color: transparent;
}

:deep(.xterm .live-region) {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

:deep(.xterm-dim) {
  opacity: 0.1;
}

:deep(.xterm-underline) {
  text-decoration: underline;
}
</style>
