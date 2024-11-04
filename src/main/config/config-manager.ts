import path from "path";
import fs from 'fs';

const configDir = "configure"
const configDirAdder = (__filename)=>{
   return  path.join(global.userDataPath,configDir,__filename)
}

export const writeConfigFile = (fileName:string,defaultConfig:object)=>{
    const filePath = configDirAdder(fileName);
    const data = JSON.stringify(defaultConfig); // 格式化 JSON 数据
    fs.writeFileSync(filePath, data, 'utf-8'); // 写入文件
    console.log('list.json 文件不存在，已创建并写入数据:', data);
}

export const getConfigFromFile =  (fileName:string,defaultConfig:object)=>{
    const filePath = configDirAdder(fileName);
    if (!fs.existsSync(filePath)) {
        writeConfigFile(fileName,defaultConfig)
    }
    const fileContent =  fs.readFileSync(filePath, { encoding: 'utf-8' });
    const jsonArray = JSON.parse(fileContent); // 转换为 JSON 数组
    console.log('JSON 数组:', jsonArray);
    return fileContent;
}