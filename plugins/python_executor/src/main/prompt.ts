import install from "./installer";

export const prompt = async () => {
  try {
    const python_version = install.getFromCurrentEnv();
    // 生成命令行提示信息
    const promptMessage = `
      The current Python version for the user is ${python_version}. Please use the following format to write Python scripts or commands: \`\`\`python
      your python code here
      \`\`\`

      Rules:
      - Provide a complete Python script, which can include multiple lines of code. The user only needs to press Enter once to execute it.
      - If multiple steps are required, briefly describe the process and provide the complete Python code or multiple commands combined (separated by semicolons).
      - For any operation that needs to output results or execution progress, use the \`print()\` function to display them.
      - Keep explanatory text concise and to the point before the code block.
      - Avoid using comments in the Python code. Instead, directly show each step's execution process or result using \`print()\`.
      - Ensure that paths, strings, or command parameters in the code are correctly escaped. For example:
          • Escape paths or strings with special characters to avoid parsing errors.
          • When using Python’s built-in modules (such as \`os\`, \`shutil\`, \`subprocess\`, etc.) for file operations or executing system commands, make sure to handle them correctly.
      - If previous commands have failed, propose a different approach to resolve the issue.
      - Focus on the most recent error and provide concrete solutions.
      - If more information is needed to confidently solve the problem, ask the user to re-run \`wtf\` or a similar command to collect additional debugging information.

      Additional Features:
      - I can assist in running system check commands, like \`df -h\` or \`ps aux\`, to gather more information for debugging.
      - I can guide file management using Python built-in modules like \`os\` and \`shutil\`, or execute external commands with \`subprocess\`.
      - For package management, I can guide you to use \`pip\` for installing or uninstalling packages, or manage project dependencies with virtual environments (\`virtualenv\`).
  `;
    return promptMessage;
  } catch (err) {
    throw err;
  }
};
