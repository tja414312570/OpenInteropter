// import { getPythonList } from "../src/main/conda-version";

// (async () => {
//   const list = await getPythonList();
//   console.log(list);
// })();
import Spinner from "cli-spinners";
import VirtualWindow, { draw } from "virtual-window";
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
const dr2 = draw(an2.getStream(), Spinner.line, {
  prefix: "加载中2: ",
});
setTimeout(() => {
  dr.success("加载完成"), dr2.failed(), windowGroup.destory(true)
}, 7000);
setTimeout(() => writeable.write("输出数据: 第一个数据包"), 2000);
setTimeout(() => writeable.write("\n输出数据: 第二个数据包"), 4000);
setTimeout(() => writeable.write("\n加载完程"), 6000);
setTimeout(() => virtualWindow.write("\n主窗口重新继续写入数据"), 8000);