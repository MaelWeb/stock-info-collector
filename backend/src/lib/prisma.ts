/*
 * @Author: Mael mael.liang@live.com
 * @Date: 2025-07-12 00:05:12
 * @LastEditors: Mael mael.liang@live.com
 * @LastEditTime: 2025-07-12 00:10:32
 * @FilePath: /stock-info-collector/backend/src/lib/prisma.ts
 * @Description:
 */
import { PrismaClient } from '@prisma/client';

/**
 * 全局Prisma客户端实例
 * 在开发环境中，每次文件更改时都会创建新的连接
 * 在生产环境中，使用全局单例
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma客户端实例
 * 使用单例模式避免在开发环境中创建过多连接
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// 在开发环境中，将实例保存到全局对象中
if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * 优雅关闭数据库连接
 * 在应用关闭时确保所有连接都被正确关闭
 */
export const closePrismaConnection = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    console.log('Prisma connection closed successfully');
  } catch (error) {
    console.error('Error closing Prisma connection:', error);
    throw error;
  }
};

/**
 * 健康检查 - 验证数据库连接
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
};

/**
 * @description 数据库事务包装器，提供类型安全的数据库事务操作。
 * 使用 Prisma 的 $transaction 方法确保数据一致性。
 * @template T - 事务函数的返回类型。
 * @param fn - 在事务中执行的异步函数，接收事务客户端作为参数。
 * @returns Promise<T> - 事务执行的结果。
 * @throws {Error} 当事务执行失败时抛出错误。
 */
export const withTransaction = async <T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> => {
  return await prisma.$transaction(fn);
};

/**
 * 数据库连接池配置
 * 优化连接池设置以提高性能
 */
export const getPrismaConfig = () => ({
  datasources: {
    db: {
      url: process.env['DATABASE_URL'],
    },
  },
  // 连接池配置
  connection: {
    pool: {
      min: 2,
      max: 10,
    },
  },
});
