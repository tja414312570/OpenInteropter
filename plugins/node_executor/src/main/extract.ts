import fs from "fs";
import path from "path";
import tar from "tar";
import unzipper from "unzipper";
import progress from "progress-stream";

// 获取解压目录
const getOutputDir = (filePath: string): string => {
  const baseName = path.basename(filePath, path.extname(filePath));
  const dirName = path.dirname(filePath);
  return path.join(dirName, baseName);
};

// 移动单一子目录内容到上一级目录
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

// 解压函数，支持 .tar.gz 和 .zip
const extractNode = (filePath: string, onProgress: (progress: number) => void, saveDir?: string) => {
  return new Promise<string>((resolve, reject) => {
    const outputDir = saveDir || getOutputDir(filePath);

    // 删除并创建输出目录
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    // 文件大小和进度流
    const fileSize = fs.statSync(filePath).size;
    const progressStream = progress({ length: fileSize, time: 100 });
    progressStream.on("progress", (p) => {
      process.stdout.write(`\r解压进度: ${p.percentage.toFixed(2)}%`);
      onProgress(p.percentage)
    });

    const ext = path.extname(filePath).toLowerCase();

    // 根据文件后缀选择解压方式
    if (ext === ".zip") {
      // 解压 .zip 文件
      fs.createReadStream(filePath)
        .pipe(progressStream)
        .pipe(unzipper.Extract({ path: outputDir }))
        .on("close", () => {
          console.log("\n解压完成，正在优化内容...");
          const dir = moveSingleSubdirectoryUp(outputDir);
          resolve(dir);
        })
        .on("error", (error) => reject(error));
    } else if (ext === ".gz" && filePath.endsWith(".tar.gz")) {
      // 解压 .tar.gz 文件
      fs.createReadStream(filePath)
        .pipe(progressStream)
        .pipe(
          tar.x({
            cwd: outputDir,
          })
        )
        .on("end", () => {
          console.log("\n解压完成，正在优化内容...");
          const dir = moveSingleSubdirectoryUp(outputDir);
          resolve(dir);
        })
        .on("error", (error) => reject(error));
    } else {
      reject(new Error("不支持的文件格式"));
    }
  });
};

export { extractNode };
