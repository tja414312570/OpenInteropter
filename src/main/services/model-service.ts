interface ModelProvider {
    name: string
    chat(content: string): void
}

import { BindIpc, handle, on } from "@main/ipc/ipc-decorator";
@BindIpc("chat-view")
class ModelService {
    private currentModel: ModelProvider;
    constructor() {
    }
    @handle()
    list(): ModelProvider[] {
        console.log("获取模型列表")
        return [this.currentModel];
    }
}
export default new ModelService();