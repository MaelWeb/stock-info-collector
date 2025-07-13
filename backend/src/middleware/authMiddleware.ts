import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/authService';
import { SuperAdminService } from '../services/superAdminService';

const authService = new AuthService();

/**
 * @description 认证中间件接口
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * @description 验证JWT token的中间件
 */
export async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        error: 'Authorization header required',
      });
    }

    const payload = authService.extractTokenFromHeader(authHeader);

    // 验证用户是否存在且激活
    const user = await authService.getUserById(payload.userId);
    if (!user.isActive) {
      return reply.status(401).send({
        success: false,
        error: 'Account is deactivated',
      });
    }

    // 将用户信息添加到请求对象
    (request as AuthenticatedRequest).user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    return;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * @description 验证管理员权限的中间件
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    // 先验证用户身份
    await authenticateUser(request, reply);
    if (reply.sent) return;

    const authRequest = request as AuthenticatedRequest;
    const isAdmin = await SuperAdminService.isAdmin(authRequest.user.userId);

    if (!isAdmin) {
      return reply.status(403).send({
        success: false,
        error: 'Admin access required',
      });
    }

    return;
  } catch (error) {
    return reply.status(403).send({
      success: false,
      error: 'Admin access required',
    });
  }
}

/**
 * @description 验证超级管理员权限的中间件
 */
export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    // 先验证用户身份
    await authenticateUser(request, reply);
    if (reply.sent) return;

    const authRequest = request as AuthenticatedRequest;
    const isSuperAdmin = await SuperAdminService.isSuperAdmin(authRequest.user.userId);

    if (!isSuperAdmin) {
      return reply.status(403).send({
        success: false,
        error: 'Super admin access required',
      });
    }

    return;
  } catch (error) {
    return reply.status(403).send({
      success: false,
      error: 'Super admin access required',
    });
  }
}
