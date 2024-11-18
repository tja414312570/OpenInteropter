process.env.NODE_ENV = "production";

import path, { join } from "path";
import { say } from "cfonts";
//@ts-ignore
import { deleteAsync } from "del";
//@ts-ignore
import chalk from "chalk";
import { rollup, OutputOptions, RollupOptions } from "rollup";
import { DefaultRenderer, Listr } from "listr2";
import rollupOptions from "./rollup.config";
import rollupPreloadOptions from "./rollup.preload.config";
import { errorLog, doneLog } from "./log";
import bundler from './bundler.config';

const mainOpt = rollupOptions(process.env.NODE_ENV) as RollupOptions;
const preloadOpt = rollupPreloadOptions(process.env.NODE_ENV) as RollupOptions[];
const isCI = process.env.CI || false;

if (process.env.BUILD_TARGET === "web") web();
else unionBuild();

async function clean() {
  await deleteAsync([
    "dist/*",
    "build/*",
    "!build/icons",
    "!build/lib",
    "!build/lib/electron-build.*",
    "!build/icons/icon.*",
  ]);
  doneLog(`clear done`);
  if (process.env.BUILD_TARGET === "onlyClean") process.exit();
}
function buildPreload() {
  const tasks: any[] = [];
  for (const preload of preloadOpt) {
    tasks.push({
      title: "building preload process",
      task: async () => {
        try {
          const build = await rollup(preload);
          await build.write(preload.output as OutputOptions);
        } catch (error) {
          errorLog(`failed to build preload process\n`);
          return Promise.reject(error);
        }
      },
    });
  }
  return tasks;
}

async function unionBuild() {
  greeting();
  await clean();

  const tasksLister = new Listr(
    [
      {
        title: "building main process",
        task: async () => {
          try {
            const build = await rollup(mainOpt);
            await build.write(mainOpt.output as OutputOptions);
          } catch (error) {
            errorLog(`failed to build main process\n`);
            return Promise.reject(error);
          }
        },
      },
      ...buildPreload(),
      {
        title: "building renderer process",
        task: async (_, tasks) => {
          try {
            const { build } = await import("vite");
            await build({ configFile: join(__dirname, "vite.config.mts") });
            tasks.output = `take it away ${chalk.yellow(
              "`electron-builder`"
            )}\n`;
          } catch (error) {
            errorLog(`failed to build renderer process\n`);
            return Promise.reject(error);
          }
        },
      },
    ],
    {
      concurrent: true,
      exitOnError: true,
    }
  );
  await tasksLister.run();
  const bundlerTask = new Listr(
    [
      {
        title: "building dist bundler",
        task: async () => {
          try {
            await bundler()
          } catch (error) {
            errorLog(`failed to build main process\n`);
            return Promise.reject(error);
          }
        },
      }
    ]
  )
  await bundlerTask.run();
}

async function web() {
  await deleteAsync(["dist/web/*", "!.gitkeep"]);
  const { build } = await import("vite");
  build({ configFile: join(__dirname, "vite.config.mts") }).then((res) => {
    doneLog(`web build success`);
    process.exit();
  });
}

function greeting() {
  const cols = process.stdout.columns;
  let text: boolean | string = "";
  if (cols > 85) text = `let's-build`;
  else if (cols > 60) text = `let's-|build`;
  else text = false;

  if (text && !isCI) {
    say(text, {
      colors: ["yellow"],
      font: "simple3d",
      space: false,
    });
  } else console.log(chalk.yellow.bold(`\n  let's-build`));
  console.log();
}
