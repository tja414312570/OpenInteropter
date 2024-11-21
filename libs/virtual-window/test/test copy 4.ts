import Spinner from "cli-spinners";
import VirtualWindow, { debug, restore } from "../src/index";
const virtualWindow = new VirtualWindow();
import stringWidth from 'string-width';
console.log(stringWidth('\n'))
virtualWindow.setCols(109);
virtualWindow.write("hello word\n");

virtualWindow.onRender(content => {
  // process.stdout.write('\x1b[1J\x1b[H' + content + '\n' + JSON.stringify(virtualWindow.getCursor()) + '\n' + debug(content))
  process.stdout.write('\x1b[1J\x1b[H' + content)
  console.log()
})
virtualWindow.write(restore(`\x1b[?25l\x1b[1;1H\x1b[1m\x1b[33m  1 \x1b[mevent: delta_encoding\x0d\x0a\x1b[1m\x1b[33m  2 \x1b[mdata: "v1"\x0d\x0a\x1b[1m\x1b[33m  3 \x0d\x0a  4 \x1b[mevent: delta\x0d\x0a\x1b[1m\x1b[33m  5 \x1b[mdata: {"p": "", "o": "add", "v": {"message": {"id": "494bba74-cd3f-482f-8ec2-b16838de77bd", "author": {"rr\x1b[6;1H\x1b[1m\x1b[33m    \x1b[mole": "assistant", "name": null, "metadata": {}}, "create_time": 1729006534.656396, "update_time": null,  \x1b[7;1H\x1b[1m\x1b[33m    \x1b[m\x1b[8C": {"content_type": "text", "parts": [""]}, "status": "in_progress", "end_turn": null, "weight":  \x1b[8;1H\x1b[1m\x1b[33m    \x1b[m1.0, "metadata": {"citations": [], "content_references": [], "gizmo_id": null, "message_type": "next", "mm\x1b[9;1H\x1b[1m\x1b[33m    \x1b[model_slug": "gpt-4o", "default_model_slug": "gpt-4o", "parent_id": "aaa24d94-c77b-4eb4-9513-e6ed1a9305e6""\x1b[10;1H\x1b[1m\x1b[33m    \x1b[m, "model_switcher_deny": []}, "recipient": "all", "channel": null}, "conversation_id": "670e8ace-de24-8000\x1b[11;1H\x1b[1m\x1b[33m    \x1b[m2-a084-9d7a8a078fa6", "error": null}, "c": 0}\x0d\x0a\x1b[1m\x1b[33m  6 \x1b[1;5H\x1b[?25h`))