import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

export const loadModules = (relativePath, callback) => {
    return new Promise(async (resolve, reject) => {
        try {
            const dir = path.join(__dirname, relativePath);
            const files = fs.readdirSync(dir);
            const promises = []; // 用于存储所有动态导入的 Promise

            for (const file of files) {
                if (file.endsWith('.js')) {
                    const modulePath = `file://${path.join(dir, file)}`; // 使用 file:// URL
                    promises.push(
                        (async () => {
                            try {
                                const module = await import(modulePath);
                                callback(file, module);
                            } catch (error) {
                                console.error(`Error loading module ${file}:`, error);
                            }
                        })()
                    );
                }
            }
            await Promise.all(promises); // 等待所有动态导入完成
            resolve(files);
        } catch (err) {
            reject(err);
        }
    });
};
