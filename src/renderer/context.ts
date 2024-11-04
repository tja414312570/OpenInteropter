import { App } from "vue";

class Context {
    private app: App
    setApp(app: App) {
        this.app = app;
    }
    getApp(): App {
        return this.app;
    }
}
export default new Context;