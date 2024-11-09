import { DefaultApi, getIpcApi, showDialog } from "mylib/render";
//@ts-ignore
import Vue from "vue/dist/vue.esm.js";
import "./overwrite-matches";
const _doc = document as any;

const agentApi: DefaultApi = getIpcApi("agent", window);
agentApi.on("message", (event: any, message: any) => {
  console.log("搜到webview消息：", event, message);
  _doc.myApp.send(message);
});
const observerList = new Map<string, (mutations: MutationRecord[]) => void>();
const _observer = new MutationObserver(function (mutationsList, observer) {
  for (const values of observerList.values()) {
    values(mutationsList);
  }
});
_observer.observe(document.body, { childList: true, subtree: true });
// 开始观察整个 body 元素，检测子节点变化

const setNativeValue = (el: any, value: any) => {
  const previousValue = el.value;

  if (el.type === "checkbox" || el.type === "radio") {
    if ((!!value && !el.checked) || (!!!value && el.checked)) {
      el.click();
    }
  } else el.value = value;

  const tracker = el._valueTracker;
  if (tracker) {
    tracker.setValue(previousValue);
  }

  // 'change' instead of 'input', see https://github.com/facebook/react/issues/11488#issuecomment-381590324
  el.dispatchEvent(new Event("change", { bubbles: true }));
};

const js_bridge = () => {
  if (_doc.myApp) {
    console.log("桥接程序已初始化", _doc.myApp);
    return;
  }
  let myApp = (_doc.myApp = {
    //:{[key:string]:any}
    ready: false,
    vueInstance: null,
    currentLocation: null,
    form: null,
    continuer: null,
    desotory: () => {
      agentApi.offAll();
      _doc.myApp = null;
    },
    send: function (message: string) {
      if (!myApp.ready) {
        showDialog({ message: '("桥接未就绪"' });
        return;
      }
      // 清空 textarea 的内容并填写新内容
      if (
        message === null ||
        message === undefined ||
        message.trim().length === 0
      ) {
        myApp.notify("收到无效输入");
        return;
      }
      const textarea = document.querySelector(
        "textarea.semi-input-textarea-autosize"
      ) as any;
      if (!textarea) {
        alert("界面异常，没有找到表单组件");
        return;
      }
      setNativeValue(textarea, message);
      // textarea.focus();
      // if (textarea.tagName.toLowerCase() === "textarea") {
      //   textarea.textContent = message; // 对 textarea 赋值
      //   // textarea.value = message;
      // }
      // // 判断是否为 contenteditable 的 div
      // else if (textarea.getAttribute("contenteditable") === "true") {
      //   textarea.textContent = message; // 对 contenteditable 的 div 赋值
      // } else {
      //   console.error(
      //     "元素既不是 textarea 也不是 contenteditable 的 div",
      //     textarea
      //   );
      //   alert("输入框不支持");
      //   return;
      // }
      // // 触发 input 事件，确保 React 或 Vue 等框架监听的事件能够捕捉到变化
      // let inputEvent = new Event("input", { bubbles: true });
      // textarea.dispatchEvent(inputEvent);
      console.log("输入值完成", message);
      // 立即点击按钮
      let times = 0;
      var loopBtn = () => {
        const sendBtn = document.querySelector(
          "button#flow-end-msg-send"
        ) as HTMLElement;
        if (sendBtn) {
          if (!sendBtn.hasAttribute("disabled")) {
            sendBtn.click();
            return;
          }
          myApp.notify("发送按钮被禁用");
        }
        if (times++ > 60) {
          myApp.notify("发送按钮不可用，请刷新页面或手动点击");
          return;
        }
        setTimeout(loopBtn, 500);
      };
      loopBtn();
    },
    createApp: function () {
      // Vue 加载成功的逻辑
      const appDiv = _doc.createElement("div");
      appDiv.id = "vue-app";
      _doc.body.appendChild(appDiv);
      console.log("加载vue脚本", appDiv);
      // 定义 Vue 应用
      const App = {
        data() {
          return {
            message: "解释器未就绪",
          };
        },
        template: `
                        <div style="position: fixed; bottom: 100px;z-index:100; right: 20px; max-width: 300px; background-color: #ffffff; color: #333; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1); border-radius: 8px; padding: 8px; display: flex; align-items: flex-start;">
                            <div>
                                <!-- 标题 -->
                                <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #6200ea;">
                                DouBao 解释器
                                </div>
                                <!-- 消息 -->
                                <div>{{ message }}</div>
                            </div>
                        </div>
                    `,
      };
      // 挂载 Vue 应用到动态插入的 div 上
      _doc.myApp.vueInstance = new Vue({
        data: App.data,
        template: App.template,
      });
      _doc.myApp.vueInstance.$mount(appDiv, true);
      myApp.continuer = appDiv;
      observerList.set("vue_ui_ovserver", (arg) => {
        const mutaForm = document.querySelector("#vue-app") as HTMLElement;
        if (!mutaForm) {
          console.log("vueui被销毁");
          _doc.body.appendChild(appDiv);
        }
      });
      myApp.foundForm();
    },
    notify: (newMessage: string) => {
      if (myApp.vueInstance) {
        // 更新 Vue 实例中的 message
        (myApp.vueInstance as any).message = newMessage;
      } else {
        console.error("Vue 实例尚未初始化，请确保调用了 createApp 方法。");
      }
    },
    // 错误通知的方法
    error: (message: string, options: { [key: string]: any } = {} as any) => {
      let errorDiv = _doc.querySelector("#error-notification");
      if (!errorDiv) {
        // 如果不存在错误提示框，则创建
        errorDiv = _doc.createElement("div");
        errorDiv.id = "error-notification";
        errorDiv.style.position = "fixed";
        errorDiv.style.bottom = options.bottom || "10px";
        errorDiv.style.right = options.right || "10px";
        errorDiv.style.backgroundColor = options.backgroundColor || "red";
        errorDiv.style.color = options.color || "white";
        errorDiv.style.padding = options.padding || "10px";
        errorDiv.style.borderRadius = options.borderRadius || "5px";
        errorDiv.style.boxShadow =
          options.boxShadow || "0 0 10px rgba(0, 0, 0, 0.1)";
        errorDiv.style.zIndex = options.zIndex || 1000;
        errorDiv.style.display = "flex";
        errorDiv.style.alignItems = "center";

        // 创建关闭按钮
        const closeButton = document.createElement("span");
        closeButton.innerHTML = "&times;"; // 使用乘号表示关闭
        closeButton.style.marginLeft = "10px";
        closeButton.style.cursor = "pointer";
        closeButton.style.fontSize = "20px";
        closeButton.style.fontWeight = "bold";
        closeButton.style.padding = "0 5px";
        closeButton.style.color = options.closeButtonColor || "white";

        // 点击关闭按钮时移除错误提示框
        closeButton.addEventListener("click", () => {
          if (errorDiv && errorDiv.parentNode) {
            document.body.removeChild(errorDiv);
          }
        });

        // 将关闭按钮添加到错误提示框中
        errorDiv.appendChild(closeButton);
        document.body.appendChild(errorDiv);
      }

      // 更新错误消息
      errorDiv.innerHTML = `${message}`;

      // 重新添加关闭按钮（覆盖内容时保持按钮存在）
      const closeButton = document.createElement("span");
      closeButton.innerHTML = "&times;";
      closeButton.style.marginLeft = "10px";
      closeButton.style.cursor = "pointer";
      closeButton.style.fontSize = "20px";
      closeButton.style.fontWeight = "bold";
      closeButton.style.padding = "0 5px";
      closeButton.style.color = options.closeButtonColor || "white";

      closeButton.addEventListener("click", () => {
        if (errorDiv && errorDiv.parentNode) {
          document.body.removeChild(errorDiv);
        }
      });

      errorDiv.appendChild(closeButton);

      // 自动移除通知（如果配置了 autoClose）
      if (options.autoClose) {
        setTimeout(() => {
          if (errorDiv && errorDiv.parentNode) {
            document.body.removeChild(errorDiv);
          }
        }, options.autoClose);
      }
    },
    foundBtn: () => {
      myApp.notify("初始化中:" + myApp.times++ + "s");
      if (myApp.times > 60) {
        myApp.notify("初始化中失败，请刷新网页或进入正确的页面");
        return;
      }
      const sendBtn = document.querySelector(
        "button#flow-end-msg-send"
      ) as HTMLElement;
      const textarea = document.querySelector(
        "textarea.semi-input-textarea-autosize"
      ) as any;
      textarea && (textarea["matches"] = () => false);
      if (sendBtn && textarea) {
        myApp.ready = true;
        myApp.notify("桥接程序已就绪！");
        console.log("桥接程序已就绪！");
        agentApi.on("send-content", (event: any, message: any) => {
          console.log("发送消息到doubao：", event, message);
          _doc.myApp.send(message);
        });
        agentApi.send("ready", location.href);
        return;
      }
      setTimeout(myApp.foundBtn, 1000);
    },
    times: 0,
    foundForm: () => {
      myApp.notify("正在查找表单组件：" + myApp.times++ + "s");
      if (myApp.times > 60) {
        myApp.notify("没有找到表单组件，请刷新网页或进入正确的页面");
        return;
      }
      const mainTag = "textarea.semi-input-textarea-autosize";
      let from = document.querySelector(mainTag) as HTMLElement;
      if (from) {
        from.dataset.info = "test";
        console.log("aria-controls:", from.getAttribute("aria-controls"));
        console.log("dataset", from.dataset.info);
        observerList.set("main_ovserver", (arg) => {
          const mutaForm = document.querySelector(mainTag) as HTMLElement;
          if (!mutaForm) {
            myApp.notify("没有找到表单组件！");
            myApp.foundForm();
            return;
          }
          if (!mutaForm.dataset.info) {
            myApp.notify("表单组件已更新！");
            from.dataset.info = "test";
            myApp.foundForm();
            return;
          }
        });
        myApp.notify("已找到表单组件");
        myApp.foundBtn();
        return;
      }
      console.log("查找表单组件", from, document);
      setTimeout(myApp.foundForm, 1000);
    },
  });

  myApp.createApp();
  return "ok";
};

js_bridge();
