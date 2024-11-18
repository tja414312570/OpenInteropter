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
      const plugin_build_path = path.join(plugin_path, 'build');
      if (!fs.existsSync(plugin_build_path)) {
        console.warn(`构建目录不存在，请先构建此插件：${plugin_path}`)
        continue;
      }
      const plugin_build_files = fs.readdirSync(plugin_build_path);
      if (plugin_build_files.length !== 1) {
        console.warn(`构建文件不存在，请先构建此插件：${plugin_path}`)
        continue;
      }
      const plugin_build_file_name = plugin_build_files[0];
      if (!plugin_build_file_name.endsWith('.zip')) {
        console.warn(`构建文件不存在，请先构建此插件：${plugin_path}`)
        continue;
      }
      const plugin_build_file = path.join(plugin_build_path, plugin_build_file_name);
      const bundler_file = path.join(bundler_dir, plugin_build_file_name)
      fs.copyFileSync(plugin_build_file, bundler_file);
      console.log(`File copied from ${plugin_build_file} to ${bundler_file}`);
    }
  }
}

