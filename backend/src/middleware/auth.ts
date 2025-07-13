import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/authService';

/**
 * JWT载荷接口
 */
interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * 扩展FastifyRequest接口，添加用户信息
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

/**
 * 认证中间件
 * @description 验证JWT令牌并将用户信息添加到请求对象中
 * @param request - FastifyRequest
 * @param reply - FastifyReply
 * @param done - 中间件完成回调
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply, done: () => void): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        error: 'Authorization header is required',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Invalid authorization header format',
      });
    }

    const authService = new AuthService();
    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    try {
      const payload = authService.verifyToken(token);
      request.user = payload;
      done();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Token expired')) {
          return reply.status(401).send({
            success: false,
            error: 'Token expired',
          });
        }
        if (error.message.includes('Invalid token')) {
          return reply.status(401).send({
            success: false,
            error: 'Invalid token',
          });
        }
      }

      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
      });
    }
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * 可选认证中间件
 * @description 验证JWT令牌但不强制要求，如果令牌有效则添加用户信息
 * @param request - FastifyRequest
 * @param reply - FastifyReply
 * @param done - 中间件完成回调
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
  done: () => void
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 如果没有认证头或格式不正确，继续执行但不添加用户信息
      done();
      return;
    }

    const authService = new AuthService();
    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀

    try {
      const payload = authService.verifyToken(token);
      request.user = payload;
    } catch (error) {
      // 令牌无效，但不阻止请求继续
      // 只是不添加用户信息
    }

    done();
  } catch (error) {
    // 发生错误时继续执行，但不添加用户信息
    done();
  }
}
