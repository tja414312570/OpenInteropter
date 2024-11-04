import { InstructResultType } from "mylib/main";
import executor from "../src/main/index";
console.log(InstructResultType.executing); // 这里可能报错

const instruct = {
  id: "xxx",
  code: `
      console.log('子程序代码');
const fs = require('fs');
const path = require('path');

// 获取当前目录
const currentDirectory = __dirname;
console.log('当前目录',currentDirectory);
// 读取当前目录的文件列表
fs.readdir(currentDirectory, (err, files) => {
  if (err) {
    console.error('读取目录时出错:', err);
    return;
  }

  // 过滤掉子目录，仅打印文件
  const allFiles = files.map(file => path.join(currentDirectory, file));
  console.log('当前目录中的所有文件和文件夹:');
  console.log(allFiles);
});
//     let i = 0;
// setInterval(()=>console.log(i++),1000);
    `,
  language: "javascript",
};
// let i = 0;
// setInterval(() => console.log(i++), 1000);
executor
  .execute(instruct)
  // .then((output) => console.log(output))
  // .catch((error) => console.error(error));
