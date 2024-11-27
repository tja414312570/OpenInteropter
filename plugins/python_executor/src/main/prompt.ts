import install from "./installer";

export const prompt = async () => {
  try {
    const python_version = await install.getFromCurrentEnv();
    // 生成命令行提示信息
    const promptMessage = `
The current Python version for the user is ${python_version}. Please use the following format to write Python scripts or commands: 
\`\`\`python
your python code here
\`\`\`

Rules:
- Always provide a complete Python script if Python is suitable for the task. Users should be able to copy and paste the script and execute it without modification.
- Avoid generic or incomplete examples—ensure all code is functional and directly relevant.
- For any operation that needs to output results or execution progress, use the \`print()\` function to display them.
- Always prefer automating repetitive tasks or multi-step processes with Python scripts rather than manual instructions.
- Explain the purpose of the code briefly before the code block.
  `;
    return promptMessage;
  } catch (err) {
    throw err;
  }
};
