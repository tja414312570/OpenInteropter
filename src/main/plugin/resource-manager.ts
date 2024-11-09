import { ResourceManager, ResourceStatus } from "@lib/main";

class ResourceManagerImpl implements ResourceManager {
    private resources: Map<string, any>;
    constructor() {
        this.resources = new Map();
    }
    require<T>(id: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const resource = this.resources.get(id) as T;
            if (resource) {
                resolve(resource)
            } else {
                reject(new Error(`请求的资源[${id}]仍未就绪！`, { cause: ResourceStatus.RESOURCE_NOT_FOUND }))
            }
        })
    }
    put(id: string, resource: any) {
        this.resources.set(id, resource);
    }
}
export default new ResourceManagerImpl()