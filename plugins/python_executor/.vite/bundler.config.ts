// compress.js
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export default async (filename?: string) => {
  if(!filename){
    const manifestPath = path.resolve(
      __dirname,
      "../dist/manifest.json"
    );
    if(!fs.existsSync(manifestPath)){
      throw new Error("could not found manifest.json at " + manifestPath)
    }
    const manifest = JSON.parse(
      fs.readFileSync(manifestPath, "utf-8")
    );
    filename = manifest.appId+'-'+manifest.version
  }
  // 创建输出流，指定压缩包的目标路径
  const outputPath = path.join(__dirname, '../build', `${filename}.zip`);
  const output = fs.createWriteStream(outputPath);
  // 创建一个 zip 压缩实例
  const archive = archiver('zip', {
    zlib: { level: 9 } // 设置压缩等级（0-9），9 是最大压缩
  });

  // 监听 'close' 事件来确认压缩完成
  output.on('close', function () {
    console.log(`压缩完成，总大小: ${archive.pointer()} bytes`);
  });

  // 监听 'warning' 和 'error' 事件
  archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
      console.warn(err);
    } else {
      throw err;
    }
  });
  archive.on('error', function (err) {
    throw err;
  });

  // 将输出流与压缩实例连接
  archive.pipe(output);

  // 添加 dist 目录中的所有文件到压缩包
  archive.directory(path.join(__dirname,'../', 'dist'), false);

  // 最后一步，开始压缩
  archive.finalize();
}

