// import { getPythonList } from "../src/main/conda-version";

// (async () => {
//   const list = await getPythonList();
//   console.log(list);
// })();
import Spinner from "cli-spinners";
import VirtualWindow, { draw } from "virtual-window"; // 根据实际路径修改

class RenderBlock {
  private virtualWindowArray: VirtualWindow[] = [];
  private megraWindow = new VirtualWindow();
  constructor() {
    this.megraWindow.onRender((content) => {
      console.clear();
      console.log(content);
    });
    this.megraWindow.write("hello word\n");
  }
  refresh() {
    this.megraWindow.write("\x1b[s\x1b[0J");
    for (const window of this.virtualWindowArray) {
      this.megraWindow.write(window.render());
    }
    this.megraWindow.write("\x1b[u");
  }
  getWriteable() {
    const i = this.virtualWindowArray.length;
    const virtualWindow = new VirtualWindow();
    virtualWindow.onRender((content) => {
      //记录上次虚拟窗口的位置
      this.refresh();
    });
    this.virtualWindowArray[i] = virtualWindow;
    return virtualWindow.getStream();
  }
}
const renderBlock = new RenderBlock();

draw(renderBlock.getWriteable(), Spinner.dots, {
  prefix: "加载中: ",
});

const writeable = renderBlock.getWriteable();
// 模拟输出
setTimeout(() => writeable.write("输出数据: 第一个数据包\n"), 2000);
setTimeout(() => writeable.write("输出数据: 第二个数据包\n"), 4000);
setTimeout(() => writeable.write("加载完成"), 6000);
draw(renderBlock.getWriteable(), Spinner.dots, {
  prefix: "加载中2: ",
});
