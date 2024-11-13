import { platform } from 'os';
import {  unlink, symlink } from 'fs/promises';
import path from 'path';
import { Listr, ListrLogger, ProcessOutput } from 'listr2';
import { existsSync} from 'fs';
import VirtualWindow from 'virtual-window';

const createTasks = (extNodePath: string, envDir: string) => {
  const isWindows = platform() === 'win32';
  
  // 定义要操作的文件名和符号链接类型
  const files = isWindows
    ? [
        { name: 'node.exe', type: 'file' },
        { name: 'npm.cmd', type: 'file' },
        { name: 'npx.cmd', type: 'file' },
        { name: 'node_modules', type: 'junction' }
      ]
    : [
        { name: 'node', type: 'file' },
        { name: 'npm', type: 'file' },
        { name: 'npx', type: 'file' },
        { name: 'node_modules', type: 'dir' }
      ];

  // 第一个部分：删除文件任务
  const deleteTasks = files.map(file => ({
    title: `删除 ${file.name}`,
    task: async () => {
      const _path = path.join(envDir,file.name)
      // if (existsSync(_path)) {
        await unlink(_path);
      // }
    }
  }));

const virtualWindow = new VirtualWindow
virtualWindow.onRender(content=>{
  console.clear();
  console.log(content)
})
  // 第二个部分：创建符号链接任务
  const linkTasks = files.map(file => ({
    title: `创建符号链接 ${file.name}`,
    task: async () => {
      await symlink(
        path.join(extNodePath, file.name),
        path.join(envDir, file.name),
        file.type
      );
    }
  }));





  
  // 使用 Listr 定义任务列表
  return new Listr([
    {
      title: '删除文件任务',
      task: () => new Listr(deleteTasks, { concurrent: false })
    },
    {
      title: '创建符号链接任务',
      task: () => new Listr(linkTasks, { concurrent: false })
    }
  ], { concurrent: false ,
      rendererOptions: {
        showSubtasks: true, // 显示子任务
        clearOutput: false, // 不清除输出
        logger: new ListrLogger({ processOutput: new ProcessOutput(null, null, { dump: [] }) })
      }
  });
};
// 执行任务列表
const extNodePath = '/path/to/external/node'; // 替换为实际路径
const envDir = '/path/to/plugin/env'; // 替换为实际路径

const tasks = createTasks(extNodePath, envDir);
tasks.run().catch(err => {
  console.error('任务执行失败:', err);
});
