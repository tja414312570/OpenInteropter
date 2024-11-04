const fs = require('fs');
const path = require('path');

function scanDependencies(dir) {
    fs.readdirSync(dir).forEach(packageDir => {
        const packagePath = path.join(dir, packageDir, 'package.json');
        if (fs.existsSync(packagePath)) {
            const pkgData = require(packagePath);
            const supportsESM = pkgData.module || pkgData.type === 'module';
            console.log(`${pkgData.name}: ${supportsESM ? 'ESM Supported' : 'CommonJS only'}`);
        }

        // 递归检查子模块
        const nestedModules = path.join(dir, packageDir, 'node_modules');
        if (fs.existsSync(nestedModules)) {
            scanDependencies(nestedModules);
        }
    });
}

scanDependencies(path.resolve('node_modules'));
