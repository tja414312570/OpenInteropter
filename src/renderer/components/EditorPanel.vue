<template>
    <div class="editor-panel">
      <textarea v-model="content" placeholder="Start coding..."></textarea>
    </div>
  </template>
  
  <script>
  export default {
    data() {
      return {
        content: 'This is your editor',
      };
    },
  };
  </script>
  
  <style scoped>
  .editor-panel {
    height: 100%;
  }
  
  textarea {
    width: 100%;
    height: 100%;
    resize: none;
    padding: 10px;
  }
  </style>
  