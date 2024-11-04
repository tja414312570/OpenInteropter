// 保存原始的 matches 方法
const originalMatches = Element.prototype.matches;
// 重写 matches 方法
Element.prototype.matches = function(selector) {
    console.log(`调用 matches 方法，选择器: ${selector}`);
      if(selector.indexOf('.text-token-text-primary') != -1){
        return false;
      }
    // 调用原始的 matches 方法
    return originalMatches.call(this, selector);
};
