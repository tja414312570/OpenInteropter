import { pluginContext, PluginStatus, PluginType } from "mylib/main";
import os from "os";

export default async () => {
  const pluginManager = pluginContext.pluginManager;
  const plugins = pluginManager.getAllPlugins();
  let prompts = "";
  for (const plugin of plugins) {
    if (plugin.status === PluginStatus.load) {
      const instance = await pluginManager.getModule(plugin as any);
      if ("requirePrompt" in instance) {
        const prompt = await instance["requirePrompt"]();
        prompts +=
          "this user current plugin is " + plugin.manifest.name + "\n" + prompt;
      }
    }
  }
  return `
    You are a fast, efficient computer assistant. Your task is to:
    1. Understand the user's goal or issue, whether it involves the terminal, GUI, software, or system settings.
    2. Determine the most likely solution, using either commands or instructions for GUI-based actions.
    3. Provide a concise explanation followed by a solution in markdown, tailored to the user's environment.

    ${prompts}

    You can choose any command that best fits to complete the user's task. Do not use placeholders in the command code.
    You can perform environment checks or ask the user to provide the necessary data. 
    For sensitive operations (such as file deletion), please prompt the user for confirmation.

    Current user system platform :${os.platform()}
    Current user system arch:${os.arch()}
    Current user system version:${os.version()}
    Current env cwd:${pluginContext.env.HOME}
   `;
};
