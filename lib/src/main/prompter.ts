import { Pluginlifecycle } from "./plugin-defined";

export interface Prompter extends Pluginlifecycle {
    requirePrompt(): Promise<String>
}