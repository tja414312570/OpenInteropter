import { exec, spawn } from "child_process";
import https from "https";
import fs from "fs";
import path from "path";
import os from "os";

const INSTALL_DIR = path.join(__dirname, "python_env"); // 自定义安装路径
const DOWNLOAD_DIR = path.join(__dirname, "download"); // 自定义安装路径
const PLATFORM = os.platform();
let pythonDownloadUrl = "";
let downloadPath = "";

if (PLATFORM === "win32") {
  pythonDownloadUrl =
    "https://www.python.org/ftp/python/3.x.x/python-3.x.x-embed-amd64.zip"; // Windows 嵌入式 Python
  downloadPath = path.join(DOWNLOAD_DIR, "python_embed.zip");
} else if (PLATFORM === "darwin") {
  //  https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh
  pythonDownloadUrl =
    "https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh"; // macOS Miniconda
  downloadPath = path.join(DOWNLOAD_DIR, "miniconda.sh");
} else if (PLATFORM === "linux") {
  pythonDownloadUrl =
    "https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"; // Linux Miniconda
  downloadPath = path.join(DOWNLOAD_DIR, "miniconda.sh");
} else {
  console.error("不支持的操作系统");
  process.exit(1);
}

// 确保安装目录存在
if (!fs.existsSync(INSTALL_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// 下载 Python
function downloadPython(url, destination, callback) {
  console.log(`正在下载 Python...`);
  const file = fs.createWriteStream(destination);
  https
    .get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(callback);
      });
    })
    .on("error", (err) => {
      fs.unlink(destination, () => {}); // 出错时删除文件
      console.error("下载出错:", err.message);
    });
}

// 安装 Python
function installPython() {
  if (PLATFORM === "win32") {
    // Windows: 解压嵌入式 Python
    const unzip = require("unzipper");
    fs.createReadStream(INSTALL_DIR)
      .pipe(unzip.Extract({ path: INSTALL_DIR }))
      .on("close", () => {
        console.log("Python 已安装在:", INSTALL_DIR);
        setupPipAndPackages();
      });
  } else {
    // macOS 和 Linux: 使用 bash 安装 Miniconda
    fs.chmodSync(downloadPath, "755");
    const installProcess = spawn("bash", [
      downloadPath,
      "-b",
      "-p",
      INSTALL_DIR,
      "-f",
    ]);
    console.log(installProcess.spawnargs);
    installProcess.stdout.on("data", (data) => {
      console.log(data.toString());
    });
    installProcess.stderr.on("data", (data) => {
      console.error(data.toString());
    });
    installProcess.on("close", (code) => {
      if (code === 0) {
        console.log("Miniconda 已安装在:", INSTALL_DIR);
        installPackages();
      } else {
        console.error("安装 Miniconda 失败");
      }
    });
  }
}

// 配置 pip 并安装额外的包
function setupPipAndPackages() {
  const pythonExecutable =
    PLATFORM === "win32"
      ? path.join(INSTALL_DIR, "python.exe")
      : path.join(INSTALL_DIR, "bin", "python");

  // 首先安装 pip
  const getPipUrl = "https://bootstrap.pypa.io/get-pip.py";
  const getPipPath = path.join(INSTALL_DIR, "get-pip.py");
  https.get(getPipUrl, (response) => {
    const file = fs.createWriteStream(getPipPath);
    response.pipe(file);
    file.on("finish", () => {
      file.close(() => {
        const pipInstall = spawn(pythonExecutable, [getPipPath]);
        pipInstall.stdout.on("data", (data) => console.log(data.toString()));
        pipInstall.stderr.on("data", (data) => console.error(data.toString()));
        pipInstall.on("close", (code) => {
          if (code === 0) {
            console.log("pip 安装成功");
            installPackages();
          } else {
            console.error("pip 安装失败");
          }
        });
      });
    });
  });
}

// 安装所需的 Python 包
function installPackages() {
  const pythonExecutable =
    PLATFORM === "win32"
      ? path.join(INSTALL_DIR, "python.exe")
      : path.join(INSTALL_DIR, "bin", "python");
  const packages = ["numpy", "requests"]; // 可以根据需要添加更多包

  const pipInstall = spawn(pythonExecutable, [
    "-m",
    "pip",
    "install",
    ...packages,
  ]);
  pipInstall.stdout.on("data", (data) => console.log(data.toString()));
  pipInstall.stderr.on("data", (data) => console.error(data.toString()));
  pipInstall.on("close", (code) => {
    if (code === 0) {
      console.log("Python 包安装成功");
    } else {
      console.error("Python 包安装失败");
    }
  });
}
installPython();
// 开始下载和安装流程
// downloadPython(pythonDownloadUrl, downloadPath, installPython);
