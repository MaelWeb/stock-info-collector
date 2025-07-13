import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @description 审计日志服务类
 */
export class AuditService {
  /**
   * @description 记录操作日志
   * @param userId - 操作用户ID
   * @param action - 操作类型
   * @param resource - 操作资源
   * @param resourceId - 资源ID
   * @param details - 操作详情
   * @param ipAddress - IP地址
   * @param userAgent - 用户代理
   */
  static async logAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId: resourceId ?? null,
          details: details ? JSON.stringify(details) : null,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    } catch (error) {
      console.error('记录审计日志失败:', error);
      // 不抛出错误，避免影响主要业务逻辑
    }
  }

  /**
   * @description 记录用户登录
   * @param userId - 用户ID
   * @param ipAddress - IP地址
   * @param userAgent - 用户代理
   */
  static async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    await this.logAction(userId, 'LOGIN', 'USER', userId, null, ipAddress, userAgent);
  }

  /**
   * @description 记录用户登出
   * @param userId - 用户ID
   * @param ipAddress - IP地址
   * @param userAgent - 用户代理
   */
  static async logLogout(userId: string, ipAddress?: string, userAgent?: string) {
    await this.logAction(userId, 'LOGOUT', 'USER', userId, null, ipAddress, userAgent);
  }

  /**
   * @description 记录用户创建
   * @param adminUserId - 管理员用户ID
   * @param targetUserId - 目标用户ID
   * @param details - 创建详情
   * @param ipAddress - IP地址
   * @param userAgent - 用户代理
   */
  static async logUserCreate(
    adminUserId: string,
    targetUserId: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.logAction(adminUserId, 'CREATE', 'USER', targetUserId, details, ipAddress, userAgent);
  }

  /**
   * @description 记录用户更新
   * @param adminUserId - 管理员用户ID
   * @param targetUserId - 目标用户ID
   * @param details - 更新详情
   * @param ipAddress - IP地址
   * @param userAgent - 用户代理
   */
  static async logUserUpdate(
    adminUserId: string,
    targetUserId: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.logAction(adminUserId, 'UPDATE', 'USER', targetUserId, details, ipAddress, userAgent);
  }

  /**
   * @description 记录用户删除
   * @param adminUserId - 管理员用户ID
   * @param targetUserId - 目标用户ID
   * @param details - 删除详情
   * @param ipAddress - IP地址
   * @param userAgent - 用户代理
   */
  static async logUserDelete(
    adminUserId: string,
    targetUserId: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.logAction(adminUserId, 'DELETE', 'USER', targetUserId, details, ipAddress, userAgent);
  }

  /**
   * @description 记录邀请码生成
   * @param adminUserId - 管理员用户ID
   * @param codes - 生成的邀请码
   * @param ipAddress - IP地址
   * @param userAgent - 用户代理
   */
  static async logInviteCodeGenerate(adminUserId: string, codes: string[], ipAddress?: string, userAgent?: string) {
    await this.logAction(
      adminUserId,
      'CREATE',
      'INVITE_CODE',
      undefined,
      { codes, count: codes.length },
      ipAddress,
      userAgent
    );
  }

  /**
   * @description 记录邀请码删除
   * @param adminUserId - 管理员用户ID
   * @param inviteCodeId - 邀请码ID
   * @param details - 删除详情
   * @param ipAddress - IP地址
   * @param userAgent - 用户代理
   */
  static async logInviteCodeDelete(
    adminUserId: string,
    inviteCodeId: string,
    details: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await this.logAction(adminUserId, 'DELETE', 'INVITE_CODE', inviteCodeId, details, ipAddress, userAgent);
  }

  /**
   * @description 获取用户操作日志
   * @param userId - 用户ID（可选，不传则获取所有日志）
   * @param page - 页码
   * @param limit - 每页数量
   * @returns 日志列表
   */
  static async getAuditLogs(userId?: string, page: number = 1, limit: number = 50) {
    try {
      const skip = (page - 1) * limit;
      const where = userId ? { userId } : {};

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('获取审计日志失败:', error);
      throw new Error('获取审计日志失败');
    }
  }
}
