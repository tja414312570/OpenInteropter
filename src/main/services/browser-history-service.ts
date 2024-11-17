import { PrismaClient, History } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import appContext from './app-context';
const databasePath = path.join(appContext.appPath, './History.db');
class HistoryService {
    private prisma: PrismaClient;
    private _isInitialized = false;

    constructor() {
        process.env.DATABASE_URL = `file:${databasePath}`;
        this.prisma = new PrismaClient();
    }
    // 初始化（对于 Prisma 不需要显式同步数据库）
    private initDatabase = async (): Promise<void> => {
        if (!this._isInitialized) {
            if (!fs.existsSync(databasePath)) {
                const fsPath = path.join(__dirname, '../', 'prisma', 'History.db');
                fs.copyFileSync(fsPath, databasePath);
                console.log(`File copied from ${fsPath} to ${databasePath}`);
            }
            await this.prisma.$connect();
            this._isInitialized = true;
        }
    };

    // 保存历史记录
    saveHistory = async (url: string, title: string): Promise<void> => {
        await this.initDatabase();
        await this.prisma.history.create({
            data: {
                url,
                title,
                time: new Date(),
            },
        });
    };

    // 查询历史记录
    queryHistory = async (
        page = 1,
        pageSize = 10
    ): Promise<{
        total: number;
        page: number;
        pageSize: number;
        data: History[];
    }> => {
        await this.initDatabase();
        const offset = (page - 1) * pageSize;
        const [data, total] = await Promise.all([
            this.prisma.history.findMany({
                skip: offset,
                take: pageSize,
                orderBy: { time: 'desc' },
            }),
            this.prisma.history.count(),
        ]);

        return {
            total,
            page,
            pageSize,
            data,
        };
    };

    // 删除指定的历史记录
    deleteHistory = async (ids: number[]): Promise<number> => {
        await this.initDatabase();
        const { count } = await this.prisma.history.deleteMany({
            where: { id: { in: ids } },
        });
        return count;
    };

    // 删除所有历史记录
    deleteAllHistory = async (): Promise<number> => {
        await this.initDatabase();
        const { count } = await this.prisma.history.deleteMany({});
        return count;
    };

    // 关闭数据库连接
    close = async (): Promise<void> => {
        await this.prisma.$disconnect();
    };
}

export default new HistoryService();
