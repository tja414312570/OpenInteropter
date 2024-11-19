import {
  AbstractPlugin,
  InstructContent,
  InstructExecutor,
  InstructResult,
  InstructResultType,
  pluginContext,
  Prompter,
} from "mylib/main";
import VirtualWindow, { debug } from "virtual-window";
import { Pluginlifecycle } from "mylib/main";
import { ExtensionContext } from "mylib/main";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import util from "util";
import { IDisposable, IPty } from "node-pty";
import { SYSTEM_MESSAGE } from "./prompt";

class DefaultPrompter extends AbstractPlugin implements Prompter {
  requirePrompt(): Promise<String> {
    const message = SYSTEM_MESSAGE;

    return Promise.resolve();
  }
  async onMounted(ctx: ExtensionContext) {}
  onUnmounted(): void {}
}
export default new DefaultPrompter();
