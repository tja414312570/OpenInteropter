<template>
  <div class="terminal-panel">
    <div class="terminal-output">Welcome to the terminal...</div>
    <input v-model="command" placeholder="Type command here..." @keydown.enter="runCommand"/>
  </div>
</template>

<script>
export default {
  data() {
    return {
      command: '',
    };
  },
  methods: {
    runCommand() {
      alert(`Running command: ${this.command}`);
      this.command = '';
    },
  },
};
</script>

<style scoped>
.terminal-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.terminal-output {
  flex-grow: 1;
  background-color: black;
  color: white;
  padding: 10px;
  font-family: monospace;
}

input {
  padding: 5px;
  border: none;
  border-top: 1px solid #ccc;
}
</style>
