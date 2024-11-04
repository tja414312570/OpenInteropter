
const async_hooks = require('async_hooks');

let activeAsyncResources = 0;
let asyncResources = new Map();

// 创建 async_hooks 钩子
const hook = async_hooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    // 初始化新的异步任务
    activeAsyncResources++;
    asyncResources.set(asyncId, { type });
  },
  before(asyncId) {
    if (asyncResources.has(asyncId)) {
    }
  },
  after(asyncId) {
    if (asyncResources.has(asyncId)) {
    }
  },
  destroy(asyncId) {
    if (asyncResources.has(asyncId)) {
      // 异步资源销毁
      asyncResources.delete(asyncId);
      activeAsyncResources--;
    }
  }
});

// 启用钩子
hook.enable();

process.on("message", async (message) => {
  const { code, execId } = message;
  // 记录执行前的活动句柄
  const initialHandles = process._getActiveHandles().slice();
  const initialRequests = process._getActiveRequests().slice();

  // 执行传递的代码
  await eval(`(async () => { ${code} })()`);

  // 定时检查执行后的活动句柄
  const interval = setInterval(() => {
    const currentHandles = process._getActiveHandles();
    const currentRequests = process._getActiveRequests();
    const currentResource = Array.from(myMap.keys());

    // console.log("初始活动句柄:", initialHandles);
    // console.log("当前活动句柄:", currentHandles);

    // 对比活动句柄，过滤掉初始时已经存在的句柄
    const newHandles = currentHandles.filter(
      (handle) => !initialHandles.includes(handle)
    );
    const newRequests = currentRequests.filter(
      (req) => !initialRequests.includes(req)
    );

    // console.log("新的活动句柄:", newHandles);
    // console.log("新的活动请求:", newRequests);
    console.log("新的异步资源:", activeAsyncResources);
  // 如果没有异步资源，且没有句柄，可以认为没有剩余异步任务
  // 定期检查剩余的句柄
    // 如果没有新的活动句柄或请求，说明任务完成
    if (newHandles.length === 0 && newRequests.length === 0 && activeAsyncResources === 0) {
      clearInterval(interval); // 停止检查
      process.send(execId); // 通知父进程任务完成
      process.exit(0); // 退出子进程
    }
  }, 100); // 每 100 毫秒检查一次
});
