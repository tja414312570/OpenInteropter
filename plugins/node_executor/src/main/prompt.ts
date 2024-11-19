import install from "./install-ui";

export const prompt = async () => {
  try {
    const node_version = install.getFromCurrentEnv();
    // 生成命令行提示信息
    const promptMessage = `
        The current Node.js version for the user is ${node_version}. Please use the following format to write Node.js scripts or commands: 
        \`\`\`nodejs
        your nodejs code here
        \`\`\`
        Rules:
        - Provide a complete Node.js script, which can include multiple lines of code. The user only needs to press Enter once to execute it.
        - If multiple steps are required, briefly describe the process and provide the complete Node.js code or multiple commands combined (separated by semicolons).
        - For any operation that needs to output results or execution progress, use \`console.log()\` to display them.
        - Keep explanatory text concise and to the point before the code block.
        - Avoid using comments in the Node.js code. Instead, directly show each step's execution process or result using \`console.log()\`.
        - Ensure that paths, strings, or command parameters in the code are correctly escaped. For example:
            • Escape paths or strings with special characters to avoid parsing errors.
            • When using Node.js’s built-in modules (such as \`fs\`, \`path\`, \`child_process\`, etc.) for file operations or executing system commands, make sure to handle them correctly.
        - If previous commands have failed, propose a different approach to resolve the issue.
        - Focus on the most recent error and provide concrete solutions.
        - If more information is needed to confidently solve the problem, ask the user to re-run \`wtf\` or a similar command to collect additional debugging information.

        Additional Features:
        - I can assist in running system check commands, like \`df -h\` or \`ps aux\`, to gather more information for debugging.
        - I can guide file management using Node.js built-in modules like \`fs\` and \`path\`, or execute external commands with \`child_process\`.
        - For package management, I can guide you to use \`npm\` or \`yarn\` for installing or uninstalling packages, or manage project dependencies with \`npm install\`.
    `;
    return promptMessage;
  } catch (err) {
    throw err;
  }
};
