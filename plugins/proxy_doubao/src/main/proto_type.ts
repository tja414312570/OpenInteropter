const proto_type = {
  ConnectionType: {
    0: "WebSocket",
    1: "HttpChunk",
    2: "Http",
    WebSocket: 0,
    HttpChunk: 1,
    Http: 2,
  },
  ContentType: {
    1: "Text",
    2: "Suggest",
    3: "Music",
    4: "WebView",
    5: "Video",
    6: "Image",
    7: "File",
    8: "PluginSearchResult",
    9: "AwemeVideoList",
    10: "Composite",
    11: "Biz",
    20: "Nested",
    50: "Card",
    51: "BotCard",
    53: "FormMsg",
    60: "CopilotCard",
    61: "DeepSearchCard",
    70: "LyricsToSongMusic",
    71: "LyricsToSongLyric",
    72: "LyricsToSongsMusic",
    80: "PagesCard",
    81: "Outline",
    82: "PagesIntentionCard",
    100: "Widget",
    101: "DoraRecord",
    900: "Multi",
    1000: "Unsupported",
    Text: 1,
    Suggest: 2,
    Music: 3,
    WebView: 4,
    Video: 5,
    Image: 6,
    File: 7,
    PluginSearchResult: 8,
    AwemeVideoList: 9,
    Composite: 10,
    Biz: 11,
    Nested: 20,
    Card: 50,
    BotCard: 51,
    FormMsg: 53,
    CopilotCard: 60,
    DeepSearchCard: 61,
    LyricsToSongMusic: 70,
    LyricsToSongLyric: 71,
    LyricsToSongsMusic: 72,
    PagesCard: 80,
    Outline: 81,
    PagesIntentionCard: 82,
    Widget: 100,
    DoraRecord: 101,
    Multi: 900,
    Unsupported: 1000,
  },
  MessageType: {
    1: "Message",
    2: "Ack",
    3: "Loading",
    Message: 1,
    Ack: 2,
    Loading: 3,
  },
  MetaType: {
    1: "Replaceable",
    2: "Insertable",
    3: "DocumentRef",
    4: "KnowledgeCard",
    5: "MetaPlaceHolder",
    100: "EmbeddedMultiMedia",
    101: "MetaTypeAlaCard",
    "-1": "WebPluginReference",
    "-2": "WebAcademicReference",
    "-3": "WebAcademicPreview",
    "-4": "WebDocReference",
    "-5": "WebVideoSummary",
    "-6": "WebTranslateCardContext",
    "-7": "DesktopPodcastTranscript",
    Replaceable: 1,
    Insertable: 2,
    DocumentRef: 3,
    KnowledgeCard: 4,
    MetaPlaceHolder: 5,
    EmbeddedMultiMedia: 100,
    MetaTypeAlaCard: 101,
    WebPluginReference: -1,
    WebAcademicReference: -2,
    WebAcademicPreview: -3,
    WebDocReference: -4,
    WebVideoSummary: -5,
    WebTranslateCardContext: -6,
    DesktopPodcastTranscript: -7,
  },
  PushMessageStatus: {
    1: "Available",
    2: "InVisible",
    3: "Broken",
    4: "Streaming",
    5: "Unselected",
    6: "NotCompliant",
    Available: 1,
    InVisible: 2,
    Broken: 3,
    Streaming: 4,
    Unselected: 5,
    NotCompliant: 6,
  },
  UserType: {
    1: "Human",
    2: "Bot",
    Human: 1,
    Bot: 2,
  },
};

export default proto_type;