import { PrismaClient, History } from '../prisma/generated/client';
import path from 'path';
import dbManager from './db-manager';

class HistoryService {
    private prisma: PrismaClient;
    private _isInitialized = false;

    constructor() {
        this.prisma = dbManager.getClient();
    }
    // 保存历史记录
    saveHistory = async (url: string, title: string): Promise<void> => {
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
        const { count } = await this.prisma.history.deleteMany({
            where: { id: { in: ids } },
        });
        return count;
    };

    // 删除所有历史记录
    deleteAllHistory = async (): Promise<number> => {
        const { count } = await this.prisma.history.deleteMany({});
        return count;
    };

    // 关闭数据库连接
    close = async (): Promise<void> => {
        await this.prisma.$disconnect();
    };
}

export default new HistoryService();
