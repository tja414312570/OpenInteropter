import { DefaultRenderer, Listr } from 'listr2';

const tasks = new Listr(
  [
    {
      title: '任务 1',
      task: async () => {
        // 模拟异步操作
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('任务 1 完成');
      },
    },
    {
      title: '任务 2',
      task: () =>
        new Listr([
          {
            title: '子任务 2.1',
            task: async () => {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              console.log('子任务 2.1 完成');
            },
          },
          {
            title: '子任务 2.2',
            task: async () => {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              console.log('子任务 2.2 完成');
            },
          },
        ]),
    },
    {
      title: '任务 3',
      task: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('任务 3 完成');
      },
    },
  ],
  {
    renderer: DefaultRenderer,
  }
);

tasks.run().catch((err) => {
  console.error(err);
});
