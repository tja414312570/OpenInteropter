import spawn from "cross-spawn";
import path from "path";

const startNodeChildProcess = (
  nodeDir: string,
  command: string,
  args?: readonly string[]
) => {
  return new Promise<void>((resolve, reject) => {
    // 获取 node 和 npm 的路径
    const isWindows = process.platform === "win32";
    const nodePath = isWindows ? nodeDir : path.join(nodeDir, "bin");

    console.log("环境路径:", nodePath);
    // 创建一个新的环境变量，添加下载的 node 目录到 PATH 中
    const env = {
      //   ...process.env,
      //   PATH: `${path.join(nodeDir)}${isWindows ? ';' : ':'}${process.env.PATH}`,
      PATH: `${path.join(nodePath)}${isWindows ? ";" : ":"}`,
    };

    // 启动子进程执行 Node.js 脚本
    const child = spawn(command, args, {
      env,
      stdio: "inherit", // 继承主进程的标准输入/输出
    });

    child.on("close", (code: number) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`子进程退出，退出码: ${code}`));
      }
    });
  });
};

export { startNodeChildProcess };
