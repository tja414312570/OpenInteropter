
import async_hooks from 'async_hooks';
declare var process: any;
let asyncResources = new Map();
// import fs from 'fs';

const state = {
  ready: false,
  execId:null as any,
  initialHandles: [] as any,
  initialRequests: [] as any,
  initialResource: [] as any,
}
const saveState = (execId:string) => {
  state.ready = true;
  state.execId = execId;
  state.initialHandles = process._getActiveHandles().slice();
  state.initialRequests = process._getActiveRequests().slice();
  state.initialResource = Array.from(asyncResources.keys());
}
const checkState = () => {
  if (!state.ready) {
    return;
  }
  const currentHandles = process._getActiveHandles();
  const currentRequests = process._getActiveRequests();
  const currentResource = Array.from(asyncResources.keys());
  const currentAsyncId = async_hooks.executionAsyncId()
  // console.log("初始活动句柄:", initialHandles);
  // console.log("当前活动句柄:", currentHandles);

  // 对比活动句柄，过滤掉初始时已经存在的句柄
  const newHandles = currentHandles.filter(
    (handle: any) => !state.initialHandles.includes(handle)
  );
  const newRequests = currentRequests.filter(
    (req: any) => !state.initialRequests.includes(req)
  );

  const newResource = currentResource.filter(
    (req: any) => !state.initialResource.includes(req) && req !== currentAsyncId
  );
  // console.log("新的活动句柄:", newHandles);
  // console.log("新的活动请求:", newRequests);
  console.log("新的异步资源:", newResource,asyncResources,currentAsyncId);
  // 如果没有异步资源，且没有句柄，可以认为没有剩余异步任务
  // 定期检查剩余的句柄
  // 如果没有新的活动句柄或请求，说明任务完成
  if (newHandles.length === 0 && newRequests.length === 0 && newResource.length === 0) {
    process.send(state.execId); // 通知父进程任务完成
    process.exit(0); // 退出子进程
  }
}
// 创建 async_hooks 钩子
const hook = async_hooks.createHook({
  init(asyncId, type, triggerAsyncId) {
    // 初始化新的异步任务
    const stack = new Error().stack;
    asyncResources.set(asyncId, { type, triggerAsyncId, stack });
    // fs.writeSync(1, `Init: AsyncID=${asyncId} Type=${type}\n`);
  },
  before(asyncId) {
    if (asyncResources.has(asyncId)) {
      // fs.writeSync(1, `Before: AsyncID=${asyncId}\n`);
    }
  },
  after(asyncId) {
    if (asyncResources.has(asyncId)) {
      // fs.writeSync(1, `After: AsyncID=${asyncId}\n`);
    }
  },
  destroy(asyncId) {
    //  fs.writeSync(1, `Destroy: AsyncID=${asyncId}\n`);
    if (asyncResources.has(asyncId)) {
      // 异步资源销毁
      // fs.writeSync(1, `Destroy: AsyncID=${asyncId}\n`);
      asyncResources.delete(asyncId);
    }
    checkState()
  }
});

// 启用钩子
hook.enable();

process.on("message", async (message: { code: string, execId: string }) => {
  const { code, execId } = message;
  // 记录执行前的活动句柄
  saveState(execId)
  // console.log("异步资源:", initialResource);
  // 执行传递的代码
  new Function(code)();
});
