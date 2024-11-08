process.env.NODE_ENV = "development";

import electron from "electron";
import chalk from "chalk";
import path, { join } from "path";
import { watch } from "rollup";
import Portfinder from "portfinder";
import config from "../config";
import { say } from "cfonts";
import { spawn } from "child_process";
import type { ChildProcess } from "child_process";
import rollupOptions from "./rollup.config";
import rimraf from 'rimraf'
import { deleteAsync } from "del";
import { doneLog } from "./log";

const preloadOpt = rollupOptions(process.env.NODE_ENV, "preload");
const pluginsOpt = rollupOptions(process.env.NODE_ENV, "executor");

let electronProcess: ChildProcess | null = null;
let manualRestart = false;

function logStats(proc: string, data: any) {
  let log = "";

  log += chalk.yellow.bold(
    `┏ ${proc} ${config.dev.chineseLog ? "编译过程" : "Process"} ${new Array(
      19 - proc.length + 1
    ).join("-")}`
  );
  log += "\n\n";

  if (typeof data === "object") {
    data
      .toString({
        colors: true,
        chunks: false,
      })
      .split(/\r?\n/)
      .forEach((line) => {
        log += "  " + line + "\n";
      });
  } else {
    log += `  ${data}\n`;
  }

  log += "\n" + chalk.yellow.bold(`┗ ${new Array(28 + 1).join("-")}`) + "\n";
  console.log(log);
}
function startPreload(): Promise<void> {
  console.log(
    "\n" +
      chalk.blue(
        `${ "准备渲染进程..."  }`
      ) 
  );
  return new Promise((resolve, reject) => {
    const PreloadWatcher = watch(preloadOpt);
    PreloadWatcher.on("change", (filename) => {
      // 预加载脚本日志部分
      logStats(
        `${
          config.dev.chineseLog ? "预加载脚本文件变更" : "preLoad-FileChange"
        }`,
        filename
      );
    });
    PreloadWatcher.on("event", (event) => {
      if (event.code === "END") {
        resolve();
      } else if (event.code === "ERROR") {
        reject(event.error);
      }
    });
  });
}
function removeJunk(chunk: string) {
  if (config.dev.removeElectronJunk) {
    // Example: 2018-08-10 22:48:42.866 Electron[90311:4883863] *** WARNING: Textured window <AtomNSWindow: 0x7fb75f68a770>
    if (
      /\d+-\d+-\d+ \d+:\d+:\d+\.\d+ Electron(?: Helper)?\[\d+:\d+] /.test(chunk)
    ) {
      return false;
    }

    // Example: [90789:0810/225804.894349:ERROR:CONSOLE(105)] "Uncaught (in promise) Error: Could not instantiate: ProductRegistryImpl.Registry", source: chrome-devtools://devtools/bundled/inspector.js (105)
    if (/\[\d+:\d+\/|\d+\.\d+:ERROR:CONSOLE\(\d+\)\]/.test(chunk)) {
      return false;
    }

    // Example: ALSA lib confmisc.c:767:(parse_card) cannot find card '0'
    if (/ALSA lib [a-z]+\.c:\d+:\([a-z_]+\)/.test(chunk)) {
      return false;
    }
  }

  return chunk;
}

function startRenderer(): Promise<void> {
  console.log(
      chalk.blue(
        `${ "准备预加载脚本..."  }`
      ) 
  );
  return new Promise((resolve, reject) => {
    Portfinder.basePort = config.dev.port || 9080;
    Portfinder.getPort(async (err, port) => {
      if (err) {
        reject("PortError:" + err);
      } else {
        const { createServer } = await import("vite");
        const server = await createServer({
          configFile: join(__dirname, "vite.config.mts"),
        });
        process.env.PORT = String(port);
        await server.listen(port);
        console.log(chalk.blue(`Vite启动完成:${port}`));
        resolve();
      }
    });
  });
}

function startMain(): Promise<void> {
  console.log(
      chalk.blue(
        `${ "准备主进程脚本..."  }`
      )
  );
  return new Promise((resolve, reject) => {
    const MainWatcher = watch(rollupOptions(process.env.NODE_ENV, "main"));
    MainWatcher.on("change", (filename) => {
      // 主进程日志部分
      logStats(
        `${config.dev.chineseLog ? "主文件变更" : "Main-FileChange"}`,
        filename
      );
    });
    MainWatcher.on("event", (event) => {
      if (event.code === "END") {
        if (electronProcess) {
          manualRestart = true;
        }
        resolve();
      } else if (event.code === "ERROR") {
        reject(event.error);
      }
    });
  });
}
async function clean() {
  await deleteAsync([
    "dist/*",
  ]);
  doneLog(`clear done`);
  if (process.env.BUILD_TARGET === "onlyClean") process.exit();
}
function greeting() {
  const cols = process.stdout.columns;
  let text: string | boolean = "";
  if (cols > 104) text = "open-interpreter";
  else if (cols > 76) text = "electron-|vite";
  else text = false;

  if (text) {
    say(text, {
      colors: ["yellow"],
      font: "simple3d",
      space: false,
    });
  } else console.log(chalk.yellow.bold("\n  open-interpreter"));
  console.log(
    chalk.blue(
      `${config.dev.chineseLog ? "  准备启动..." : "  getting ready..."}`
    )
  );
}

async function init() {
  greeting();
  await clean();
  try {
    await startPreload();
    await startRenderer();
    await startMain();
    console.log( chalk.blue( `${ "所有脚本已就绪"  }` ))
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

init();
