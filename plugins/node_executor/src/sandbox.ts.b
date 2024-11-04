import { createContext, runInContext } from 'vm';
import fs from 'fs';
import path from 'path';
import os from 'os';

// 模拟用户授权请求
const requestUserPermission = (operation, filePath) => {
  return new Promise((resolve) => {
    console.log(`请求权限: 允许 ${operation} 对文件 ${filePath} 的访问吗？(y/n)`);
    
    // 模拟用户输入
    const userInput = 'y';  // 可以改为实际的用户输入

    if (userInput === 'y') {
      resolve(true);  // 用户允许
    } else {
      resolve(false); // 用户拒绝
    }
  });
};

// 创建代理的 fs 模块，加入权限控制
const createRestrictedFS = () => {
  const restrictedFS = {};

  // 代理读文件操作
  restrictedFS.readFile = async (filePath, encoding, callback) => {
    const allowed = await requestUserPermission('read', filePath);
    if (allowed) {
      return fs.readFile(filePath, encoding, callback);
    } else {
      callback(new Error('访问被拒绝'));
    }
  };

  // 代理写文件操作
  restrictedFS.writeFile = async (filePath, data, callback) => {
    const allowed = await requestUserPermission('write', filePath);
    if (allowed) {
      return fs.writeFile(filePath, data, callback);
    } else {
      callback(new Error('访问被拒绝'));
    }
  };

  // 可以对其他 `fs` 操作进行类似处理...

  return restrictedFS;
};

// 创建自定义的 `require` 函数
const createCustomRequire = () => {
  const restrictedFS = createRestrictedFS();

  return (moduleName) => {
    if (moduleName === 'fs') {
      return restrictedFS;  // 返回自定义的 `fs` 模块
    }
    return require(moduleName);  // 对其他模块保持原样
  };
};

// 创建一个自定义的沙盒类
class NodeSandbox {
  constructor() {
    // 注入完整 Node.js 功能，同时拦截 `require('fs')`
    this.context = {
      console: {
        log: (...args) => {
          console.log('[沙盒日志]:', ...args);
        },
        error: (...args) => {
          console.error('[沙盒错误]:', ...args);
        }
      },
      require: createCustomRequire(),  // 自定义 `require`，拦截 `fs`
      process,   // 注入 process 对象
      os,        // 注入 os 模块
      path,      // 注入 path 模块
      Buffer,    // 注入 Buffer 对象
      setTimeout,   // 注入定时器
      setInterval,
      clearTimeout,
      clearInterval,
    };
  }

  // 执行用户代码
  async runCode(code) {
    try {
      // 创建沙盒上下文
      const sandboxContext = createContext(this.context);

      // 运行代码
      await runInContext(`(async () => { ${code} })()`, sandboxContext);

      return '代码执行成功';
    } catch (error) {
      throw new Error(`沙盒执行出错: ${error.message}`);
    }
  }
}

// 示例使用
const sandbox = new NodeSandbox();

const code = `
  const fs = require('fs');
  fs.readFile('/sandbox/test.txt', 'utf8', (err, data) => {
    if (err) {
      console.error('文件读取失败:', err.message);
    } else {
      console.log('文件内容:', data);
    }
  });

  fs.writeFile('/sandbox/output.txt', '一些测试数据', (err) => {
    if (err) {
      console.error('文件写入失败:', err.message);
    } else {
      console.log('写入成功');
    }
  });

  console.log('操作系统平台:', os.platform());
  console.log('当前目录:', process.cwd());
`;

sandbox.runCode(code)
  .then(result => {
    console.log(result);
  })
  .catch(error => {
    console.error(error);
  });
