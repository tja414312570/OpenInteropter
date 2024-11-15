# VirtualWindow 项目功能开发

## 简介
`VirtualWindow` 是一个无 GUI 的虚拟窗口系统，支持解析和渲染 ANSI 转义序列，适用于终端输出，并支持窗口组管理。Web 端可以使用 `ansiup` 等库对输出进行渲染和着色。

## 功能需求

- [x] 光标控制：支持标准 ANSI 转义光标控制序列解析和渲染。
- [x] 基础渲染：支持标准的 ANSI 转义序列存储和回复。
- [x] 即时渲染：支持回调函数，在 `write` 时立即渲染内容。
- [x] 获取流：提供可写流以便从流中写入数据。
- [x] 动画支持：支持加载动画，例如结合 `cli-spinners` 使用。
- [x] 窗口组管理：支持将多个 `VirtualWindow` 组合成一个窗口组，并进行统一管理。

## 待办事项

### 基本功能
- [x] 基础 `VirtualWindow` 类定义
- [x] 支持 ANSI 控制码的解析和渲染
- [x] 提供 `write` 和 `render` 方法
- [x] 提供 `draw` 基础动画

### 高级功能
- [x] 实现窗口组 `WindowGroup` 功能
- [ ] **窗口拆分功能**
  - [ ] 支持窗口组的 **水平拆分**
  - [ ] 支持窗口组的 **垂直拆分**
  - [ ] 自定义窗口比例

- [x] **窗口固定位置插入**
  - [x] 支持在窗口组中 **指定位置插入** 新窗口
  - [x] 插入后自动 **刷新布局**

- [ ] **窗口重排序功能**
  - [ ] 支持在窗口组中对窗口进行 **重排序**
  - [ ] 添加 `moveWindow` 方法，将窗口移动到指定位置

### 动画与动态内容
- [x] 基础动画功能（如加载动画）
- [x] 添加成功、失败等状态变化
- [ ] 更多动画效果
  - [ ] 支持不同风格的加载动画

### 性能优化
- [ ] 优化 `refresh` 方法以减少多次刷新带来的性能消耗
- [ ] 在 `refresh` 方法中添加节流机制，避免频繁更新

## 未来扩展

- [ ] **OSC序列**：提供OSC序列解析
- [ ] **C1序列**：部分c1序列已支持
- [ ] **DEC序列**：完整的dec序列支持


# VirtualWindow 支持的 ANSI 转义序列

### 光标控制

- `\x1b[{ROW};{COL}H` 或 `\x1b[{ROW};{COL}f`：将光标移动到指定的行（ROW）和列（COL）。
  - 示例：`\x1b[10;20H` 将光标移动到第 10 行第 20 列。
- `\x1b[{N}A`：将光标向上移动 N 行。
  - 示例：`\x1b[5A` 将光标向上移动 5 行。
- `\x1b[{N}B`：将光标向下移动 N 行。
  - 示例：`\x1b[3B` 将光标向下移动 3 行。
- `\x1b[{N}C`：将光标向右移动 N 列。
  - 示例：`\x1b[4C` 将光标向右移动 4 列。
- `\x1b[{N}D`：将光标向左移动 N 列。
  - 示例：`\x1b[2D` 将光标向左移动 2 列。
- `\x1b[{COL}G`：将光标移动到当前行的指定列（COL）。
  - 示例：`\x1b[10G` 将光标移动到当前行的第 10 列。
- `\x1b[s`：保存当前光标位置。
- `\x1b[u`：恢复之前保存的光标位置。

### 屏幕清除

- `\x1b[{N}J`：清除屏幕内容。
  - `\x1b[0J`：清除从光标位置到屏幕末尾的内容。
  - `\x1b[1J`：清除从屏幕开头到光标位置的内容。
  - `\x1b[2J`：清除整个屏幕。
  - `\x1b[3J`：清除整个屏幕并重置光标位置（无屏幕内容时生效）。

### 行清除

- `\x1b[{N}K`：清除当前行内容。
  - `\x1b[0K`：清除从光标位置到行末的内容。
  - `\x1b[1K`：清除从行首到光标位置的内容。
  - `\x1b[2K`：清除整行内容。

### 光标显示控制

- `\x1b[?25h`：显示光标。
- `\x1b[?25l`：隐藏光标。

### 样式控制

- `\x1b[{N}m`：文本样式控制（例如设置颜色、重置样式等）。
  - `\x1b[0m`：重置所有样式。
  - `\x1b[1m`：设置粗体。
  - `\x1b[3m`：设置斜体。
  - `\x1b[4m`：设置下划线。
  - `\x1b[30m` 至 `\x1b[37m`：设置前景色（黑、红、绿、黄、蓝、紫、青、白）。
  - `\x1b[40m` 至 `\x1b[47m`：设置背景色（黑、红、绿、黄、蓝、紫、青、白）。


## 使用
* 基础使用
```javascript
    import VirtualWindow from "../src/index";
    const virtualWindow = new VirtualWindow();
    virtualWindow.write('hello world');
    
    //获取渲染结果 懒渲染，调用才时渲染
    console.log(virtualWindow.render())
```
* 即时渲染
```javascript
    import VirtualWindow from "../src/index";
    const virtualWindow = new VirtualWindow();
    //传入回调时每次write立即渲染
    virtualWindow.onRenader((content:string)=>{
        console.clear()
        console.log(content)
    })
    virtuaWindow.write('hello world')
```
* 获取流
```javascript
    import VirtualWindow from "../src/index";
    const virtualWindow = new VirtualWindow();
    virtualWindow.onRenader((content:string)=>{
        console.clear()
        console.log(content)
    });
    //通过流写入数据
   const writeable = virtualWindow.getStream();
   writeable.write('hello world')
```
* 动画
```javascript
    import VirtualWindow {draw} from "../src/index";
    import Spinner from "cli-spinners";
    const virtualWindow = new VirtualWindow();
    virtualWindow.onRenader((content:string)=>{
        console.clear()
        console.log(content)
    });
   const writeable = virtualWindow.getStream();
   writeable.write('hello world')
   const animate = draw(an2.getStream(), Spinner.dots10, {
    prefix: "加载中 ",
    });
    setTimeout(()=>animate.success('ok'),2000)
```
* 窗口组
```javascript
    import Spinner from "cli-spinners";
    import VirtualWindow, { draw } from "../src/index"; 
    const virtualWindow = new VirtualWindow();
    virtualWindow.write("hello word\n");
    virtualWindow.onRender(content => {
    process.stdout.write('\x1b[1J\x1b[H' + content + '\n' + JSON.stringify(virtualWindow.getCursor()))
    })
    const windowGroup = virtualWindow.getWindowGroup();
    const aniStream = windowGroup.createChildWindow();
    const dr = draw(aniStream.getStream(), Spinner.dots, {
    prefix: "加载中: ",
    });
    const writeable = windowGroup.createChildWindow();
    const an2 = windowGroup.createChildWindow();
    const dr2 = draw(an2.getStream(), Spinner.dots10, {
    prefix: "加载中2: ",
    });
    setTimeout(() => {
    dr.success("加载完成"), dr2.failed(), windowGroup.destory(true)
    }, 7000);
    setTimeout(() => writeable.write("输出数据: 第一个数据包"), 2000);
    setTimeout(() => writeable.write("\n输出数据: 第二个数据包"), 4000);
    setTimeout(() => writeable.write("\n加载完程"), 6000);
    setTimeout(() => virtualWindow.write("\n主窗口重新继续写入数据"), 8000);
--
hello word
✔️ 加载完成
输出数据: 第一个数据包
输出数据: 第二个数据包
加载完程
❌ 处理失败
主窗口重新继续写入数据   
```

## 开发进度日志

- **2024-11-15**: 初始化版本。
