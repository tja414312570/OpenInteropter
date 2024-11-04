import { promises as fs } from 'fs';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import { notifyApp, notifyAppError, sendApp, uploadFile } from './bridge';
import { notify, notifyError } from '../ipc/notify-manager'

import util from 'util';

// import { createWindow ,requiredWindow} from './window_manager.js';

import { loadModules } from './modules'
import { InstructContent, previewCode, wrapperInstruct } from '@main/ipc/code-manager';

import { IncomingHttpHeaders } from 'http';

// 使用 promisify 将子进程命令转换为 Promise
const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// 提取代码块的函数
function extractInstructionListFromMarkdown(responseBody: string): Array<InstructContent> {
    // const supportedLanguages = Object.keys(executors).join('|');
    // const pattern = new RegExp(`\`\`\`(${supportedLanguages})\\n([\\s\\S]*?)\`\`\``, 'g');
    const pattern = new RegExp(`\`\`\`([a-zA-Z]+)\\n([\\s\\S]*?)\`\`\``, 'g');

    const instructionList: Array<InstructContent> = [];
    let match: any;
    while ((match = pattern.exec(responseBody)) !== null) {
        instructionList.push(wrapperInstruct(match[1], match[2]));
    }

    return instructionList;
}


async function dispatch(headers: IncomingHttpHeaders, response: string) {
    const instructionList = extractInstructionListFromMarkdown(response)
    if (instructionList.length > 0) {
        previewCode(instructionList)
    } else {
        notify("没有代码块")
    }

}
export {
    dispatch
};
