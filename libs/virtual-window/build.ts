import { join } from "path";
import { say } from "cfonts";
import { deleteAsync } from "del";
import chalk from "chalk";
import { rollup, OutputOptions, RollupOptions } from "rollup";
import { Listr } from "listr2";
import { buildOptions } from "./rollup.config";

const doneLog = (text: string) => {
  console.log('\n' + chalk.bgGreen.white(' DONE ') + ' ' + text);
};
const errorLog = (text: string) => {
  console.log('\n ' + chalk.bgRed.white(' ERROR ') + ' ' + text);
};

async function clean() {
  await deleteAsync(["dist/*"]);
  doneLog("Clear done");
}

const getOutputFile = (output: OutputOptions | OutputOptions[] | undefined) =>
  Array.isArray(output)
    ? output.map((item) => item.name || item.format || 'default').join(',')
    : output?.file || 'default';

function buildWriteTask(options: RollupOptions) {
  const title = `Building ${options.input} to [${getOutputFile(options.output)}] task`;
  return {
    title,
    task: async () => {
      try {
        const build = await rollup(options);
        const outputs = Array.isArray(options.output) ? options.output : [options.output];
        for (const outputOptions of outputs) {
          await build.write(outputOptions as OutputOptions);
        }
        doneLog(`Successfully built ${title}`);
      } catch (error) {
        errorLog(`Failed to ${title}`);
        return Promise.reject(error);
      }
    },
  };
}

function buildTask(options: RollupOptions | RollupOptions[]) {
  return Array.isArray(options) ? options.map(buildWriteTask) : [buildWriteTask(options)];
}

async function unionBuild() {
  greeting();
  await clean();

  const tasksLister = new Listr(
    [
      ...buildTask(buildOptions("index")),
    ],
    {
      concurrent: true,
      exitOnError: true,
    }
  );

  await tasksLister.run();
}

function greeting() {
  const cols = process.stdout.columns;
  const text = cols > 85 ? "let's-build" : cols > 60 ? "let's-|build" : false;

  if (text) {
    say(text, { colors: ["yellow"], font: "simple3d", space: false });
  } else {
    console.log(chalk.yellow.bold(`\n  let's-build`));
  }
  console.log();
}

unionBuild();
