import os from "os";
import { execFile } from "child_process";
// import sudo from "sudo-prompt";
import path from "path";
import DownloadNode from "./download";
import { startNodeChildProcess } from "./node-executor";
import { extractNode } from "./extract";
import axios from "axios";

const platform = os.platform();
const arch = os.arch();
let fileExtension: string;
export const getFileName = () => {
    let fileExtension
    // 根据操作系统和架构选择文件后缀
    if (platform === "win32") {
        fileExtension = arch === "x64" ? "win-x64.zip" : "win-arm64.zip";
    } else if (platform === "darwin") {
        fileExtension = arch === "x64" ? "darwin-x64.tar.gz" : "darwin-arm64.tar.gz";
    } else if (platform === "linux") {
        fileExtension = arch === "x64" ? "linux-x64.tar.xz" : "linux-arm64.tar.xz";
    } else {
        throw new Error(`不支持的平台:platform:${platform},arch:${arch}`);
    }
    return fileExtension;
}


// 请求 Node.js 版本
export const getNodeVersions = async (): Promise<string> => {
    try {
        const response = await axios.get("https://nodejs.org/dist/index.json", {});
        return response.data; // 返回解析后的数据
    } catch (error) {
        throw new Error(
            `Error fetching node versions: ${(error as Error).message}`
        );
    }
};
export const getNodeSha = async (
    version: string,
    fileName: string
): Promise<string | null> => {
    const shaUrl = `https://nodejs.org/dist/${version}/SHASUMS256.txt`;
    console.log(`sha地址: ${shaUrl}`);

    try {
        // 发起请求并获取数据
        const response = await axios.get(shaUrl, {
            responseType: "text", // 确保以文本格式接收数据
        });

        // 处理数据
        const lines = response.data.trim().split("\n");
        for (const line of lines) {
            // 使用正则表达式分割 SHA 值和文件名
            const match = line.match(/([a-f0-9]{64})\s+(.+)/);
            if (match) {
                const _sha = match[1];
                const _fileName = match[2];
                if (_fileName === fileName) {
                    return _sha;
                }
            }
        }
        return null; // 如果没有找到匹配的文件名
    } catch (error) {
        throw new Error(
            `Error fetching SHA for ${fileName}: ${(error as Error).message}`
        );
    }
};
// const setEnvironmentVariables = async (nodePath: string, version: any) => {
//     const nodeHome =
//         platform === "win32" ? `${__dirname}\\nodejs` : `${__dirname}/nodejs`;

//     let command: string;
//     if (platform === "win32") {
//         command = `setx NODE_HOME "${nodeHome}" /M && setx PATH "%PATH%;${nodeHome}" /M`;
//     } else {
//         command = `echo "export NODE_HOME=${nodeHome}" | tee -a /etc/environment && echo "export PATH=\$PATH:${nodeHome}" | tee -a /etc/environment`;
//     }

//     return new Promise((resolve, reject) => {
//         sudo.exec(command, options, (error, stdout, stderr) => {
//             if (error) {
//                 reject(error);
//             } else {
//                 console.log(`环境变量已设置: ${stdout}`);
//                 resolve(nodePath);
//             }
//         });
//     });
// };

const runNodeVersion = (nodePath: string) => {
    return new Promise<void>((resolve, reject) => {
        execFile(nodePath, ["--version"], (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                console.log(`Node.js 版本号: ${stdout.trim()}`);
                resolve();
            }
        });
    });
};

// const main = async () => {
//     try {
//         const versions = (await getNodeVersions()) as any;
//         console.log(versions[0]);
//         const latestVersion = versions[0].version;
//         const fileName = `node-${latestVersion}-${fileExtension}`;
//         const downloadUrl = `https://nodejs.org/dist/${latestVersion}/${fileName}`;
//         console.log(`下载地址:${downloadUrl}`);
//         const sha256 = await getNodeSha(latestVersion, fileName);
//         console.log("256:" + sha256);
//         const filePath = path.join(__dirname, "../download", fileName);
//         console.log(filePath, "\n", path.basename(filePath));
//         await DownloadNode(downloadUrl, filePath, sha256);
//         console.log("下载后的文件地址:" + filePath);
//         const nodePath: string = await extractNode(filePath);
//         // const nodePath = path.join(__dirname,`../src/main/download/node-v23.1.0-win-x64`);
//         console.log("解压后的文件路径:" + nodePath);
//         // // 使用示例
//         // const scriptPath = path.join(__dirname, 'assets/test.js'); // 你的脚本路径

//         startNodeChildProcess(nodePath, "npm", ["-v"])
//             .then(() => console.log("脚本执行成功"))
//             .catch((err) => console.error("脚本执行出错:", err));

//         // await runNodeVersion(setEnvPath);
//     } catch (err) {
//         console.error("操作出错:", err);
//     }
// };