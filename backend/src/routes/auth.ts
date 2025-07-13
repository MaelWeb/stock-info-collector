import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/authService';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * 认证路由
 * @description 处理用户注册、登录、获取用户信息等认证相关功能
 */
export default async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const authService = new AuthService();

  /**
   * 用户注册
   * POST /api/auth/register
   */
  fastify.post(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'name', 'inviteCode'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            inviteCode: { type: 'string', minLength: 4 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    /**
     * @description 用户注册
     * @param request - FastifyRequest<{ Body: { email: string; password: string; name: string } }>
     * @param reply - FastifyReply
     * @returns 注册成功的用户信息
     */
    async (
      request: FastifyRequest<{
        Body: {
          email: string;
          password: string;
          name: string;
          inviteCode: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password, name, inviteCode } = request.body;

        const user = await authService.register({
          email,
          password,
          name,
          inviteCode,
        });

        return reply.status(201).send({
          success: true,
          data: user,
        });
      } catch (error) {
        fastify.log.error('Registration error:', error);

        if (error instanceof Error) {
          if (error.message.includes('Email already registered')) {
            return reply.status(400).send({
              success: false,
              error: 'Email already registered',
            });
          }
          if (error.message.includes('Validation error')) {
            return reply.status(400).send({
              success: false,
              error: error.message,
            });
          }
        }

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 用户登录
   * POST /api/auth/login
   */
  fastify.post(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                    },
                  },
                  token: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    /**
     * @description 用户登录
     * @param request - FastifyRequest<{ Body: { email: string; password: string } }>
     * @param reply - FastifyReply
     * @returns 登录成功的用户信息和JWT令牌
     */
    async (
      request: FastifyRequest<{
        Body: {
          email: string;
          password: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password } = request.body;

        const result = await authService.login({
          email,
          password,
        });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        fastify.log.error('Login error:', error);

        if (error instanceof Error) {
          if (error.message.includes('Invalid email or password')) {
            return reply.status(401).send({
              success: false,
              error: 'Invalid email or password',
            });
          }
          if (error.message.includes('Validation error')) {
            return reply.status(400).send({
              success: false,
              error: error.message,
            });
          }
        }

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 获取当前用户信息
   * GET /api/auth/me
   */
  fastify.get(
    '/me',
    {
      schema: {
        headers: {
          type: 'object',
          properties: {
            authorization: { type: 'string' },
          },
          required: ['authorization'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    /**
     * @description 获取当前用户信息
     * @param request - FastifyRequest
     * @param reply - FastifyReply
     * @returns 当前用户信息
     */
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;
        const payload = authService.extractTokenFromHeader(authHeader);

        const user = await authService.getUserById(payload.userId);

        return reply.send({
          success: true,
          data: user,
        });
      } catch (error) {
        fastify.log.error('Get user error:', error);

        if (error instanceof Error) {
          if (
            error.message.includes('Authorization header is required') ||
            error.message.includes('Invalid authorization header format') ||
            error.message.includes('Invalid token') ||
            error.message.includes('Token expired') ||
            error.message.includes('User not found')
          ) {
            return reply.status(401).send({
              success: false,
              error: 'Unauthorized',
            });
          }
        }

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 更新用户信息
   * PUT /api/auth/profile
   */
  fastify.put(
    '/profile',
    {
      schema: {
        headers: {
          type: 'object',
          properties: {
            authorization: { type: 'string' },
          },
          required: ['authorization'],
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    /**
     * @description 更新用户信息
     * @param request - FastifyRequest<{ Body: { name?: string; email?: string } }>
     * @param reply - FastifyReply
     * @returns 更新后的用户信息
     */
    async (
      request: FastifyRequest<{
        Body: {
          name?: string;
          email?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const authHeader = request.headers.authorization;
        const payload = authService.extractTokenFromHeader(authHeader);
        const { name, email } = request.body;

        const updateData: { name?: string; email?: string } = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;

        const user = await authService.updateUser(payload.userId, updateData);

        return reply.send({
          success: true,
          data: user,
        });
      } catch (error) {
        fastify.log.error('Update profile error:', error);

        if (error instanceof Error) {
          if (
            error.message.includes('Authorization header is required') ||
            error.message.includes('Invalid authorization header format') ||
            error.message.includes('Invalid token') ||
            error.message.includes('Token expired') ||
            error.message.includes('User not found')
          ) {
            return reply.status(401).send({
              success: false,
              error: 'Unauthorized',
            });
          }
          if (error.message.includes('Failed to update user')) {
            return reply.status(400).send({
              success: false,
              error: 'Failed to update user',
            });
          }
        }

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * 更改密码
   * PUT /api/auth/password
   */
  fastify.put(
    '/password',
    {
      schema: {
        headers: {
          type: 'object',
          properties: {
            authorization: { type: 'string' },
          },
          required: ['authorization'],
        },
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    /**
     * @description 更改用户密码
     * @param request - FastifyRequest<{ Body: { currentPassword: string; newPassword: string } }>
     * @param reply - FastifyReply
     * @returns 密码更改成功消息
     */
    async (
      request: FastifyRequest<{
        Body: {
          currentPassword: string;
          newPassword: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const authHeader = request.headers.authorization;
        const payload = authService.extractTokenFromHeader(authHeader);
        const { currentPassword, newPassword } = request.body;

        await authService.changePassword(payload.userId, currentPassword, newPassword);

        return reply.send({
          success: true,
          message: 'Password changed successfully',
        });
      } catch (error) {
        fastify.log.error('Change password error:', error);

        if (error instanceof Error) {
          if (
            error.message.includes('Authorization header is required') ||
            error.message.includes('Invalid authorization header format') ||
            error.message.includes('Invalid token') ||
            error.message.includes('Token expired') ||
            error.message.includes('User not found')
          ) {
            return reply.status(401).send({
              success: false,
              error: 'Unauthorized',
            });
          }
          if (error.message.includes('Current password is incorrect')) {
            return reply.status(400).send({
              success: false,
              error: 'Current password is incorrect',
            });
          }
        }

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // 简单管理员校验（可用更安全方式替换）
  function isAdmin(request: FastifyRequest) {
    const adminSecret = process.env['ADMIN_SECRET'] || 'admin';
    return request.headers['x-admin-secret'] === adminSecret;
  }

  /**
   * 生成邀请码
   * POST /api/auth/invite
   * header: x-admin-secret
   * body: { count: number }
   */
  fastify.post('/invite', async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }
    const { count = 1 } = request.body as { count?: number };
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      await prisma.inviteCode.create({ data: { code } });
      codes.push(code);
    }
    return { success: true, codes };
  });

  /**
   * 查询所有邀请码
   * GET /api/auth/invite
   * header: x-admin-secret
   */
  fastify.get('/invite', async (request, reply) => {
    if (!isAdmin(request)) {
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }
    const codes = await prisma.inviteCode.findMany({ orderBy: { createdAt: 'desc' } });
    return { success: true, codes };
  });
}
