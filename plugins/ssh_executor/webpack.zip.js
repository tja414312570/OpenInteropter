const fs = require('fs');
const path = require('path');
const glob = require('glob');
const archiver = require('archiver');

// 压缩插件
class ZipPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('ZipPlugin', (compilation) => {
      const outputDir = path.resolve(__dirname, 'dist');
      const buildDir = path.resolve(__dirname, 'build');
      const zipFile = path.join(buildDir, 'dist.zip');

      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
      }

      const output = fs.createWriteStream(zipFile);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      output.on('close', () => {
        console.log(`${archive.pointer()} total bytes`);
        console.log('打包完成，zip 文件已生成在 build 目录下');
      });

      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn(err);
        } else {
          throw err;
        }
      });

      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(output);
      archive.directory(outputDir, false);
      archive.finalize();
    });
  }
}
module.exports = {
    entry: {},  // 无需入口文件
    mode: 'production',
    plugins: [
      new ZipPlugin(),  // 打包 zip
    ],
  };
  