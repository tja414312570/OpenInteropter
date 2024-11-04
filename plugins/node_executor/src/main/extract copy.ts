import fs from "fs";
import path from "path";
import compressing from "compressing";
import progress from "progress-stream";
import { exec } from "child_process";
import { path7za } from "7zip-bin";

const getOutputDir = (filePath: string): string => {
  const baseName = path.basename(filePath, path.extname(filePath));
  const dirName = path.dirname(filePath);
  return path.join(dirName, baseName);
};

const checkAndSetExecutablePermission = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.access(filePath, fs.constants.X_OK, (err) => {
      if (err) {
        console.log(`${filePath} 没有执行权限。正在赋予权限...`);
        exec(`chmod +x ${filePath}`, (error) => {
          if (error) {
            reject(`无法赋予执行权限: ${error}`);
          } else {
            console.log(`已成功赋予 ${filePath} 执行权限`);
            resolve();
          }
        });
      } else {
        console.log(`${filePath} 已有执行权限`);
        resolve();
      }
    });
  });
};

const moveSingleSubdirectoryUp = (outputDir: string) => {
  const items = fs.readdirSync(outputDir);
  if (items.length === 1) {
    const singleSubDir = path.join(outputDir, items[0]);
    if (fs.statSync(singleSubDir).isDirectory()) {
      const subDirContents = fs.readdirSync(singleSubDir);
      subDirContents.forEach((item) => {
        const oldPath = path.join(singleSubDir, item);
        const newPath = path.join(outputDir, item);
        fs.renameSync(oldPath, newPath);
      });
      fs.rmdirSync(singleSubDir);
    }
  }
  return outputDir;
};

const extractNode = (filePath: string, saveDir?: string) => {
  return new Promise<string>(async (resolve, reject) => {
    try {
      await checkAndSetExecutablePermission(path7za);
    } catch (err) {
      return reject(err);
    }

    const outputDir = saveDir || getOutputDir(filePath);
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 创建原始 ReadStream
    const fileSize = fs.statSync(filePath).size;
    const originalReadStream = fs.createReadStream(filePath);

    // 创建 ProgressStream
    const progressStream = progress({ length: fileSize, time: 100 });
    progressStream.on("progress", (progressData) => {
      process.stdout.write(
        `\r解压进度: ${progressData.percentage.toFixed(2)}%`
      );
    });

    // 管道连接流：先通过 progressStream，然后再传递给 compressing.tgz.uncompress
    const readStreamWithProgress = originalReadStream.pipe(
      progressStream
    ) as any;

    compressing.tgz
      .uncompress(readStreamWithProgress, outputDir)
      .then(() => {
        console.log("\n正在优化解压内容");
        const dir = moveSingleSubdirectoryUp(outputDir);
        resolve(dir);
        console.log("解压完成");
      })
      .catch((error) => reject(error));
  });
};

export { extractNode };
