import Spinner from "cli-spinners";
import VirtualWindow, { debug, restore } from "../src/index";
const virtualWindow = new VirtualWindow();
import stringWidth from 'string-width';
console.log(stringWidth('\n'))
// const len = `eval "01234567890123456789012345678901234567890123456789012345678901234567`.length;
virtualWindow.setCols(109);
virtualWindow.write("hello word\n");

virtualWindow.onRender(content => {
  process.stdout.write('\x1b[1J\x1b[H' + content + '\n' + JSON.stringify(virtualWindow.getCursor()))//+ '\n' + debug(content))
})
// console.log(debug(`eval "\x0d\x0a`))

virtualWindow.write(restore(`eval "\x0d\x0a`))
virtualWindow.write(restore(`> $max=3;for($i=0;$i-le $max;$i++){$p=($i/$max)*100;Write-Progress -Activity "正在处理数据..." -Status "$i%  \x1b[K完\x0d完成" -PercentComplete $p;Start-`))
virtualWindow.write(restore(`Sleep -Milliseconds 100}$max=3;for($i=0;$i-le $max;$i++){$p=($i/$max)*100;Wri \x0dte-Progress -Activity "正在处理数据..." -Status "$i% 完成" -PercentComplete $p;Start-Sleep -Milliseconds 100} \x0d\x1b[A\x0d\x0a> " ; echo "_f8c6107f-f9c5-4a90-96bb-d088e943bd9e_$?"\x0d\x0abash: syntax error near unexpected token \`('\x0d\x0a_f8c6107f-f9c5-4a90-96bb-d088e943bd9e_0\x0d\x0abash-3.2$`))
// virtualWindow.write(restore(`890123 \x0d456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123 \x0d456789012345678901234567890123456789\x0d\x0a> " ; echo "_c16586e1-af30-431f-91aa-798eced4cff6_$?"\x0d\x0a`))