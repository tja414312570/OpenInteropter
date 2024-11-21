import Spinner from "cli-spinners";
import VirtualWindow, { debug, restore } from "../src/index";
const virtualWindow = new VirtualWindow();
import stringWidth from 'string-width';
console.log(stringWidth('\n'))
virtualWindow.setCols(109);

virtualWindow.onRender(content => {
  // process.stdout.write('\x1b[1J\x1b[H' + content + '\n' + JSON.stringify(virtualWindow.getCursor()) + '\n' + debug(content))
  process.stdout.write('\x1b[1J\x1b[H' + content)
})
virtualWindow.write(restore("data: {\"v\": \"帮助\"}\n\nevent: delta\ndata: {\"v\": \"你\"}\n\n\u001b[mevent: delta\ndata: {\"v\": \"的吧\"}\n\nevent: delta\ndata: {\"v\": \"？\"}\n\nevent: delta\n"))
virtualWindow.write(restore(`\x1b[?25l\x1b[1;12r\x1b[m\x1b[1;1H\x1b[L\x1b[1;13r\x1b[1;1Hdata: {"v": "帮助"}\x0d\x1b[?25h`))
// virtualWindow.write(restore(`\x1b[?25l\x1b[1;12r\x1b[m\x1b[1;1H\x1b[L\x1b[1;13r\x1b[1;1H\x1b[?25h`))