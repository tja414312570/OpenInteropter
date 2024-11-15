## 虚拟窗口
    提供解析、渲染ansi转义序列的功能，无gui，支持窗口组,web端可以使用ansiup等渲染工具上色

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