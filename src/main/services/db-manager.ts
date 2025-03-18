import path from 'path';
import appContext from './app-context';
import { PrismaClient } from '../prisma/generated/client';
import { execSync } from 'child_process';
import { copyFile, copyFileSync } from 'fs';
const orginDBPath = process.env.DATABASE_URL;
const databasePath = path.join(appContext.appPath, process.env.DATABASE_URL.split('file:')[1] || './db.sqlite');
process.env.DATABASE_URL = `file:${databasePath}`;
console.log(process.env)
class dbManager {
    private prisma: PrismaClient;
    constructor() {
        this.prisma = new PrismaClient();
        this.initDatabase();
    }
    private initDatabase = async (): Promise<void> => {
        console.log('检查数据库:', process.env.DATABASE_URL);
        // 定义 Prisma schema 文件和数据库路径
        const prismaPath = path.join(__dirname, '../', 'prisma');
        if (process.env.NODE_ENV == 'development') {
            try {
                // 检查数据库表结构是否匹配
                const result = execSync(`npx prisma migrate status --schema=${prismaPath}/schema.prisma`, { encoding: 'utf-8' });
                console.log('数据库结构匹配:', result);
            } catch (error) {
                console.warn('⚠️ 数据库表结构不匹配，开始自动迁移...', error.stdout || error.message);
                try {
                    // 自动执行迁移
                    execSync(`npx prisma migrate deploy --schema=${prismaPath}/schema.prisma`, { encoding: 'utf-8', stdio: 'inherit' });
                    console.log('✅ 数据库迁移完成');
                } catch (migrateError) {
                    console.error('❌ 数据库迁移失败:', migrateError.stdout || migrateError.message);
                    process.exit(1); // 迁移失败，强制退出应用
                }
            }
        } else {
            copyFileSync(orginDBPath, process.env.DATABASE_URL)
        }
        await this.prisma.$connect();
    };
    getClient(): PrismaClient {
        return this.prisma;
    }
}
export default new dbManager();