function replaceSudoCommand(inputCommand) {
  const sudoReplacement = "echo $SUDO_PASS | sudo -S";
  return inputCommand.replace(/\bsudo\b/g, sudoReplacement);
}

// 示例
const originalCommand = "sudo du -sh ~/Documents";
const replacedCommand = replaceSudoCommand(originalCommand);

console.log(replacedCommand);
// 输出: echo $SUDO_PASS | sudo -S du -sh ~/Documents
