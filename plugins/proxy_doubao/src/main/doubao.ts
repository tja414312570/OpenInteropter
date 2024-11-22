import { createParser, ParsedEvent, ParseEvent } from "eventsource-parser";
import { protoBase64 } from "./proto-base64";
import util from "util";
import _ from "lodash";
import i from "./proto_type";
import a from "./protocol_content_skill_type";
import { PushEvent, PushMessage } from "./message";
const INACTIVITY_TIMEOUT_MS = 10000;
const isFinishAliceMessage = (message: { content_type: any }) => {
  return (
    message?.content_type === i.ContentType.Text ||
    message?.content_type === a.ContentType.SamanthaText
  );
};
const parseJSON = (jsonString: string, defaultValue: any) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
};
// 检查消息的 ext.is_finish 字段是否为 "1"
const isStreamAsyncMessage = (message: { ext: { is_finish: string } }) => {
  return message?.ext?.is_finish === "1";
};

function isMessageFinished(message: any) {
  return isFinishAliceMessage(message) && !isStreamAsyncMessage(message);
}
const extractErrorDetails = (message: any) => {
  // 使用辅助函数安全获取 `has_err` 字段的值
  let hasError = _.get(message, ["has_err"]);

  // 如果存在错误标志 `has_err`
  if (hasError) {
    return {
      error_details: {
        has_error: true, // 标记存在错误
        error_code: Number(hasError), // 将 `has_err` 转换为数字作为错误代码
        error_message: "Server Error", // 错误信息（固定为服务器错误）
        locale: "", // 本地化信息（未定义，默认为空字符串）
      },
    };
  }

  // 如果没有错误，返回空对象
  return {};
};
const getInputSkill = (message: any) => {
  // 获取 message.input_skill，如果不存在，设置为 undefined
  let inputSkill = message?.input_skill;

  // 使用 parseJSON 解析 inputSkill，如果解析失败，使用默认值
  return parseJSON(inputSkill, {
    skill_id: String(a.SkillType.SkillFreeChat), // 默认 skill_id
    skill_type: a.SkillType.SkillFreeChat, // 默认 skill_type
  });
};

const extractSkillDetails = (message: any) => {
  // 使用辅助函数获取输入技能信息
  let skillInfo = getInputSkill(message);

  return {
    skill: {
      skill_type: skillInfo.skill_type, // 技能类型
      skill_type_no_default: skillInfo.skill_type ? skillInfo.skill_type : null, // 如果 skill_type 不存在，设置为 null
      skill_id: `${skillInfo.skill_type}`, // 技能 ID，基于 skill_type
      skill_id_no_default: skillInfo.skill_type
        ? `${skillInfo.skill_type}`
        : null, // 如果 skill_type 不存在，设置为 null
    },
  };
};

const normalizePushMessage = (message: any, rawMessage: { ext: any }) => {
  // 从 `rawMessage.ext` 提取引用数据
  let references = parseReferenceContent(rawMessage.ext);

  // 如果提取到的引用数据存在且长度大于 0，添加到 `message` 的 `references` 字段中
  if (references?.length) {
    Object.assign(message, { references });
  }
  // 返回更新后的消息
  return message;
};
const parseReferenceContent = (message: any) => {
  // 安全获取并解析 reference_content 字段为 JSON 数据，如果不存在则返回空数组
  let referenceContent = parseJSON(_.get(message, ["reference_content"]), []);

  // 遍历解析后的数组，将其映射为统一格式
  return referenceContent.map(
    (item: {
      type: string;
      fileName: any;
      fileKey: any;
      link: any;
      text: any;
    }) => ({
      type: a.AttachType[item.type as keyof typeof a.AttachType], // 使用映射表将 type 转换为特定类型
      name: item?.fileName, // 文件名
      key: item?.fileKey, // 文件的唯一标识
      url: item?.link, // 文件的链接
      content: item?.text, // 文件的文本内容
    })
  );
};

const processMessage = (
  message: { content: string; ext: any; content_type: any },
  localInfo: any
) => {
  // 初始化一个新对象，基于原始消息 `message` 和额外的本地信息 `localInfo`
  let processedMessage = {
    ...message,
    local_info: localInfo, // 添加本地信息
    content_obj: parseJSON(message.content, undefined), // 解析 `content` 为 JSON 格式
  };

  // 设置其他属性，基于原始消息 `message` 的扩展信息
  Object.assign(processedMessage, {
    is_finish: isMessageFinished(message), // 是否已完成
    is_regen: "1" === _.get(message, ["ext", "regen"]), // 是否重新生成
    regen_active: "1" === _.get(message, ["ext", "regen_active"]), // 重新生成是否激活
    has_suggest: "1" === _.get(message, ["ext", "has_suggest"]), // 是否包含建议
    ...extractErrorDetails(message.ext), // 提取附加信息
    ...extractSkillDetails(message.ext), // 映射扩展字段
    security_archive_state: _.get(message, ["ext", "archive_state"]), // 安全归档状态
    ext: message.ext, // 保留扩展字段
  });

  // 获取聊天协议服务容器
  // 如果存在消息类型和协议服务，尝试对消息进行规范化
  if (message.content_type) {
    // 如果插件存在规范化方法，调用其 `normalizePushMessage` 方法
    return normalizePushMessage(processedMessage, message);
  }

  // 返回处理后的消息对象
  return processedMessage;
};

const mergeTextContent = (
  existingContent: { text: any },
  deltaContent: { text: any }
) => {
  return {
    ...existingContent, // 保留原有对象中的所有属性
    ...deltaContent, // 合并新增或更新的属性
    // 增量对象中的 `text` 属性，若无则为空字符串
    text:
      (existingContent?.text || "") + // 原始对象中的 `text` 属性，若无则为空字符串
      (deltaContent?.text || ""),
  };
};
const replacer = (_key: any, value: { toString: () => any }) => {
  if (typeof value === "bigint") {
    return value.toString(); // 将 BigInt 转为字符串
  }
  return value;
};
export class SseHandler {
  private message: ((data: any) => void) | undefined;
  private end: ((data: any) => void) | undefined;
  private parser: any;
  private previousObject: any;
  private parsedData: any;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private currentEncoding: string = "";
  private error: ((data: any) => void) | undefined;
  private isEnd = false;
  constructor() {
    this.parser = createParser((event) => {
      this.handleServerEvent(event);
    });
  }
  onMessage(callback: (data: any) => void) {
    this.message = callback;
    return this;
  }
  onEnd(callback: (data: any) => void) {
    this.end = callback;
    return this;
  }
  onError(callback: (data: any) => void) {
    this.error = callback;
    return this;
  }
  private triggerEvent(data: {}) {
    this.message?.(data);
  }
  private triggerEnd(data: {}) {
    this.isEnd = true;
    this.end?.(data);
  }
  private triggerError(data: any) {
    if (!this.error) {
      throw new Error(`未绑定错误handler`, { cause: data });
    }
    this.error(data);
  }
  private resetTimer() {
    // 清除现有计时器
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    // 创建一个新的计时器来检测处理器是否长时间未接收事件
    this.inactivityTimer = setTimeout(() => {
      // 如果长时间没有新的事件进入 handleServerEvent，则抛出错误或触发错误事件
      console.error(
        "Error: Inactivity timeout reached, no new events received."
      );
      this.triggerError(
        new Error("Inactivity timeout reached, no new events received.")
      );
    }, INACTIVITY_TIMEOUT_MS);
  }
  private cleanTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
  }

  private throwError(err: any) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(err);
  }
  handleServerEvent(event: ParseEvent) {
    try {
      this.resetTimer();
      // 将接收到的数据传递给流追踪器
      if (this.isEnd) {
        return;
      }
      event = event as ParsedEvent;

      if (event.event === "done") {
        // 中止当前的操作并结束流
        this.cleanTimer();
        this.triggerEnd(this.parsedData);
        return;
      }
      // 如果事件类型不是 "ping"，则处理其他事件
      if (event.event !== "ping") {
        // 处理 "delta_encoding" 事件
        if (event.event === "pb") {
          const pushEvent = PushEvent.fromBinary(protoBase64.dec(event.data));
          switch (pushEvent.message?.contentType) {
            case i.ContentType.Text:
            case a.ContentType.SamanthaWriteOutlineOutput:
            case a.ContentType.SamanthaWriteArtifactOutput:
              (pushEvent.message as any).content_obj = parseJSON(
                pushEvent.message.content,
                {}
              );
              if (!this.parsedData) {
                this.parsedData = pushEvent;
                return;
              }
              (pushEvent.message as any).content_obj = mergeTextContent(
                (this.parsedData.message as any)["content_obj"],
                (pushEvent.message as any).content_obj
              );
              pushEvent.message.ttsContent = (
                pushEvent.message as any
              ).content_obj["text"];
              this.parsedData = pushEvent;
          }
          if (pushEvent) {
            const finished = pushEvent.message?.ext?.is_finish;
            if (finished === "1") {
              this.parsedData = pushEvent;
              this.triggerEnd(this.parsedData);
              this.cleanTimer();
            } else {
              this.triggerEvent(pushEvent);
              // }
            }
          } else {
            this.triggerEvent(event);
          }
        }
      }
    } catch (err: any) {
      throw new Error(`处理数据失败,${util.inspect(event)}`, { cause: err });
    }
  }
  feed(data: string) {
    try {
      this.parser.feed(data);
    } catch (error) {
      this.triggerError(error);
    }
  }
}
export const createHandler = () => new SseHandler();
