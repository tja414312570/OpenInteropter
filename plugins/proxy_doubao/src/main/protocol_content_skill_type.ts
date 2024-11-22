/**
 * 协议类型定义
 */
export default {
  ContentType: {
    Unknown: 0, // 未知类型
    SamanthaText: 2001, // 文本内容
    SamanthaSuggest: 2002, // 建议内容
    SamanthaLoading: 2003, // 加载状态
    SamanthaMusic: 2004, // 音乐内容
    SamanthaMusicGenInput: 2005, // 音乐生成输入
    SamanthaMusicGenOutput: 2006, // 音乐生成输出
    SamanthaSearchCard: 2007, // 搜索卡片
    SamanthaSearchText: 2008, // 搜索文本
    SamanthaImageInput: 2009, // 图像输入
    SamanthaImageOutput: 2010, // 图像输出
    SamanthaTranslate: 2011, // 翻译内容
    SamanthaReadInput: 2012, // 阅读输入
    SamanthaWebpageInput: 2013, // 网页输入
    SamanthaSearchInput: 2014, // 搜索输入
    SamanthaWriteInput: 2015, // 写作输入
    SamanthaWriteOutlineOutput: 2016, // 写作大纲输出
    SamanthaWritePagesCardOutput: 2017, // 写作页卡输出
    SamanthaWriteArtifactOutput: 2018, // 写作工件输出
    SamanthaWriteIntentionCardOutput: 2019, // 写作意图卡输出
    SamanthaReadOutput: 2030, // 阅读输出
  },
  SkillType: {
    SkillFreeChat: 0, // 自由聊天技能
    SkillWrite: 2, // 写作技能
    SkillImageGen: 3, // 图像生成技能
    SkillSearch: 4, // 搜索技能
    SkillTranslate: 5, // 翻译技能
    SkillRead: 6, // 阅读技能
    SkillWebpage: 7, // 网页技能
    SkillDeepSearch: 8, // 深度搜索技能
    SkillMusicGen: 9, // 音乐生成技能
  },
  AttachType: {
    0: "unknown",
    1: "file",
    2: "image",
    attachment: "file",
    image: "image",
    link: "link",
    text: "text",
    vlm_image: "vlm_image",
  },
} as const;
