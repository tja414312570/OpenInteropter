import Spinner from "cli-spinners";
import VirtualWindow, { draw } from "../src/index"; // 根据实际路径修改

const virtualWindow = new VirtualWindow();

virtualWindow.write("hello word\n");
virtualWindow.onRender(content => {
  process.stdout.write('\x1b[1J\x1b[H' + content + '\n' + JSON.stringify(virtualWindow.getCursor()))
})

const windowGroup = virtualWindow.getWindowGroup();
// virtualWindow.write('world\n')
const aniStream = windowGroup.createChildWindow();
const dr = draw(aniStream.getStream(), Spinner.dots, {
  prefix: "加载中: ",
});

const writeable = windowGroup.createChildWindow();
const an2 = windowGroup.createChildWindow();
const dr2 = draw(an2.getStream(), Spinner.dots10, {
  prefix: "加载中2: ",
});

// // 模拟输出
setTimeout(() => {
  dr.success("加载完成"), windowGroup.close(true), windowGroup.createChildWindow()
}, 7000);//windowGroup.close()
setTimeout(() => virtualWindow.write("\n加载完成了222222"), 8000);
setTimeout(() => writeable.write("输出数据: 第一个数据包"), 2000);
setTimeout(() => writeable.write("\n输出数据: 第二个数据包"), 4000);
setTimeout(() => writeable.write("\n加载完程"), 6000);
