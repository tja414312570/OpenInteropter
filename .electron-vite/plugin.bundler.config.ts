// compress.js
import fs from 'fs';
import path from 'path';

export default async (filename?: string) => {
  const plugin_dir = path.join(__dirname, '../plugins')
  const bundler_dir = path.join(__dirname, '../dist/electron/plugins');
  fs.mkdirSync(bundler_dir, { recursive: true })
  if (fs.existsSync(plugin_dir)) {
    const pluginDirs = fs.readdirSync(plugin_dir);
    for (let plugin_path of pluginDirs) {
      plugin_path = path.join(plugin_dir, plugin_path)
      const manifestPath = path.join(plugin_path, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        console.warn(`插件清单文件不存在，请检查此目录是否为插件目录:${plugin_path}`)
        continue;
      }
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const filename = manifest.appId
      const plugin_build_path = path.join(plugin_path, 'dist');
      if (!fs.existsSync(plugin_build_path)) {
        console.warn(`构建目录不存在，请先构建此插件：${plugin_path}`)
        continue;
      }
      const bundler_file = path.join(bundler_dir, filename)
      fs.cpSync(plugin_build_path, bundler_file, { recursive: true, dereference: true });
      console.log(`File copied from ${plugin_build_path} to ${bundler_file}`);
    }
  }
}

