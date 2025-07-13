import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { SuperAdminService } from '../services/superAdminService';
import { requireAdmin, requireSuperAdmin, AuthenticatedRequest } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';

const prisma = new PrismaClient();

/**
 * @description 管理员路由
 */
export default async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * 获取所有用户列表
   * GET /api/admin/users
   */
  fastify.get('/users', async (request, reply) => {
    // 验证管理员权限
    await requireAdmin(request, reply);
    if (reply.sent) return;

    try {
      const users = await SuperAdminService.getAllUsers();

      // 记录查看用户列表的操作
      const authRequest = request as AuthenticatedRequest;
      await AuditService.logAction(
        authRequest.user.userId,
        'VIEW',
        'USER_LIST',
        undefined,
        { count: users.length },
        request.ip,
        request.headers['user-agent']
      );

      return reply.send({
        success: true,
        data: users,
      });
    } catch (error) {
      fastify.log.error('Get users error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get users',
      });
    }
  });

  /**
   * 更新用户角色
   * PUT /api/admin/users/:id/role
   */
  fastify.put('/users/:id/role', async (request, reply) => {
    // 验证管理员权限
    await requireAdmin(request, reply);
    if (reply.sent) return;

    try {
      const { id } = request.params as { id: string };
      const { role, isActive } = request.body as { role?: string; isActive?: boolean };

      const updates: { role?: string; isActive?: boolean } = {};
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;

      const user = await SuperAdminService.updateUserRole(id, updates);

      // 记录用户角色更新操作
      const authRequest = request as AuthenticatedRequest;
      await AuditService.logUserUpdate(authRequest.user.userId, id, updates, request.ip, request.headers['user-agent']);

      return reply.send({
        success: true,
        data: user,
      });
    } catch (error) {
      fastify.log.error('Update user role error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update user role',
      });
    }
  });

  /**
   * 删除用户
   * DELETE /api/admin/users/:id
   */
  fastify.delete('/users/:id', async (request, reply) => {
    // 验证超级管理员权限
    await requireSuperAdmin(request, reply);
    if (reply.sent) return;

    try {
      const { id } = request.params as { id: string };
      await SuperAdminService.deleteUser(id);

      // 记录用户删除操作
      const authRequest = request as AuthenticatedRequest;
      await AuditService.logUserDelete(
        authRequest.user.userId,
        id,
        { deletedAt: new Date().toISOString() },
        request.ip,
        request.headers['user-agent']
      );

      return reply.send({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      fastify.log.error('Delete user error:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      });
    }
  });

  /**
   * 生成邀请码
   * POST /api/admin/invite
   */
  fastify.post('/invite', async (request, reply) => {
    // 验证管理员权限
    await requireAdmin(request, reply);
    if (reply.sent) return;

    try {
      const { count = 1 } = request.body as { count?: number };
      const codes: string[] = [];

      for (let i = 0; i < count; i++) {
        const code = Math.random().toString(36).slice(2, 10).toUpperCase();
        await prisma.inviteCode.create({ data: { code } });
        codes.push(code);
      }

      // 记录邀请码生成操作
      const authRequest = request as AuthenticatedRequest;
      await AuditService.logInviteCodeGenerate(
        authRequest.user.userId,
        codes,
        request.ip,
        request.headers['user-agent']
      );

      return reply.send({
        success: true,
        data: { codes },
      });
    } catch (error) {
      fastify.log.error('Generate invite codes error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to generate invite codes',
      });
    }
  });

  /**
   * 获取所有邀请码
   * GET /api/admin/invite
   */
  fastify.get('/invite', async (request, reply) => {
    // 验证管理员权限
    await requireAdmin(request, reply);
    if (reply.sent) return;

    try {
      const codes = await prisma.inviteCode.findMany({
        orderBy: { createdAt: 'desc' },
      });

      // 记录查看邀请码列表操作
      const authRequest = request as AuthenticatedRequest;
      await AuditService.logAction(
        authRequest.user.userId,
        'VIEW',
        'INVITE_CODE_LIST',
        undefined,
        { count: codes.length },
        request.ip,
        request.headers['user-agent']
      );

      return reply.send({
        success: true,
        data: codes,
      });
    } catch (error) {
      fastify.log.error('Get invite codes error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get invite codes',
      });
    }
  });

  /**
   * 删除邀请码
   * DELETE /api/admin/invite/:id
   */
  fastify.delete('/invite/:id', async (request, reply) => {
    // 验证管理员权限
    await requireAdmin(request, reply);
    if (reply.sent) return;

    try {
      const { id } = request.params as { id: string };
      await prisma.inviteCode.delete({
        where: { id },
      });

      // 记录邀请码删除操作
      const authRequest = request as AuthenticatedRequest;
      await AuditService.logInviteCodeDelete(
        authRequest.user.userId,
        id,
        { deletedAt: new Date().toISOString() },
        request.ip,
        request.headers['user-agent']
      );

      return reply.send({
        success: true,
        message: 'Invite code deleted successfully',
      });
    } catch (error) {
      fastify.log.error('Delete invite code error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to delete invite code',
      });
    }
  });

  /**
   * 获取审计日志
   * GET /api/admin/audit-logs
   */
  fastify.get('/audit-logs', async (request, reply) => {
    // 验证超级管理员权限
    await requireSuperAdmin(request, reply);
    if (reply.sent) return;

    try {
      const {
        userId,
        page = 1,
        limit = 50,
      } = request.query as {
        userId?: string;
        page?: number;
        limit?: number;
      };

      const result = await AuditService.getAuditLogs(userId, page, limit);

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      fastify.log.error('Get audit logs error:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get audit logs',
      });
    }
  });
}
