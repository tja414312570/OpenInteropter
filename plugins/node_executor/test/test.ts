import { readFileSync, write, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

// 定义文件路径
const filePath = path.join(`C:/Users/tja41/Desktop`, 'pobc.txt');

// 读取文件内容并解析
const parseFile = () => {
    // 读取文件内容
    const data = readFileSync(filePath, 'utf8');
    // 按行分割
    const lines = data.split('\n');
    const result = lines
        .map(line => line.trim())  // 去除每行的空白字符
        .filter(line => line)      // 忽略空行
        .map(line => {
            // 使用 | 分割字段
            const [field, chineseName, remark = ''] = line.split('	').map(item => item.trim());
            return { field, chineseName, remark };
        });
    return result;
};

// 调用解析函数
const pobc = parseFile();
const found = (line: string) => {
    for (const key of pobc) {
        if (line.toLocaleLowerCase().indexOf(key.field.toLocaleLowerCase().trim()) > 0) {
            return key;
        }
    }
    return null;
}
const dir = `C:\\Users\\tja41\\Desktop\\数据安全工作`
const data = readFileSync(path.join(dir, '520103197411215662.txt'), 'utf8');
// 按行分割
const lines = data.split(/\r?\n/);
const results: Array<String> = [];
const matched = new Set<string>()
for (let line of lines) {
    const desc = found(line);
    if (desc) {
        line = `${line}   \\ ${desc?.chineseName} - ${desc?.field} - ${desc?.remark} `
        matched.add(desc?.field);
        console.log("找到数据", line)
    }
    results.push(line)
}
writeFileSync(path.join(dir, '匹配后的数据.txt'), results.join('\r\n'), 'utf-8')
const dataJson = JSON.parse(data);

const getAllKeys = (obj:any) => {
    let keys:Array<string> = [];
  
    // 遍历对象中的每一个属性
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        keys.push(key);
  
        const value = obj[key];
  
        // 检查值是否是对象，且不是null，并且不是数组原始类型
        if (typeof value === 'object' && value !== null) {
          // 如果是数组，继续处理数组中的对象
          if (Array.isArray(value)) {
            value.forEach(item => {
              if (typeof item === 'object' && item !== null) {
                keys = keys.concat(getAllKeys(item));
              }
            });
          } else {
            // 如果是普通对象，递归处理
            keys = keys.concat(getAllKeys(value));
          }
        }
      }
    }
  
    return keys;
  };
  

const allKeys = getAllKeys(dataJson);
const notMatched:Array<string> = [];
found: for(const key of allKeys){
    for(const matchedKey of matched){
        if(key.toLocaleLowerCase().trim() === matchedKey.toLocaleLowerCase().trim()){
            continue found;
        }
    }
    notMatched.push(key)
}

writeFileSync(path.join(dir, '不匹配的字段.txt'), notMatched.join('\r\n'), 'utf-8')