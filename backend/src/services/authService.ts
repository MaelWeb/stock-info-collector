import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { z } from 'zod';
import { AuditService } from './auditService';

const prisma = new PrismaClient();

/**
 * 用户注册数据验证schema
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  inviteCode: z.string().min(4, 'Invite code is required'),
});

/**
 * 用户登录数据验证schema
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * JWT载荷接口
 */
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * 认证服务类
 * @description 处理用户注册、登录、JWT生成和验证等认证相关功能
 */
export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN: string;

  constructor() {
    this.JWT_SECRET = process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-in-production';
    this.JWT_EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '7d';
  }

  /**
   * @description 用户注册（带邀请码）
   * @param userData - 用户注册数据
   * @returns 注册成功的用户信息（不包含密码）
   * @throws {Error} 当邮箱已存在、邀请码无效或数据验证失败时
   */
  async register(userData: z.infer<typeof registerSchema>): Promise<Omit<User, 'password'>> {
    try {
      // 验证输入数据
      const validatedData = registerSchema.parse(userData);

      // 检查邀请码
      const invite = await prisma.inviteCode.findUnique({ where: { code: validatedData.inviteCode } });
      if (!invite || invite.used) {
        throw new Error('Invalid or used invite code');
      }

      // 检查邮箱是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // 加密密码
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

      // 创建用户
      const user = await prisma.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 标记邀请码为已用
      await prisma.inviteCode.update({
        where: { code: validatedData.inviteCode },
        data: { used: true, usedBy: user.id, usedAt: new Date() },
      });

      return user;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((e) => e.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
      throw error;
    }
  }

  /**
   * @description 用户登录
   * @param loginData - 用户登录数据
   * @returns 包含用户信息和JWT令牌的登录结果
   * @throws {Error} 当邮箱不存在或密码错误时
   */
  async login(loginData: z.infer<typeof loginSchema>): Promise<{
    user: Omit<User, 'password'>;
    token: string;
  }> {
    try {
      // 验证输入数据
      const validatedData = loginSchema.parse(loginData);

      // 查找用户
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // 生成JWT令牌
      const token = this.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // 返回用户信息（不包含密码）和令牌
      const { password, ...userWithoutPassword } = user;

      // 记录登录日志（异步，不阻塞登录流程）
      AuditService.logLogin(user.id).catch((error) => {
        console.error('记录登录日志失败:', error);
      });

      return {
        user: userWithoutPassword,
        token,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((e) => e.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
      throw error;
    }
  }

  /**
   * @description 生成JWT令牌
   * @param payload - JWT载荷数据
   * @returns JWT令牌字符串
   */
  private generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  /**
   * @description 验证JWT令牌
   * @param token - JWT令牌字符串
   * @returns 解码后的JWT载荷
   * @throws {Error} 当令牌无效或过期时
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * @description 从请求头中提取并验证JWT令牌
   * @param authHeader - Authorization请求头
   * @returns 解码后的JWT载荷
   * @throws {Error} 当令牌格式错误或验证失败时
   */
  extractTokenFromHeader(authHeader: string | undefined): JWTPayload {
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header format');
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    return this.verifyToken(token);
  }

  /**
   * @description 根据用户ID获取用户信息
   * @param userId - 用户ID
   * @returns 用户信息（不包含密码）
   * @throws {Error} 当用户不存在时
   */
  async getUserById(userId: string): Promise<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * @description 更新用户信息
   * @param userId - 用户ID
   * @param updateData - 要更新的用户数据
   * @returns 更新后的用户信息（不包含密码）
   * @throws {Error} 当用户不存在或更新失败时
   */
  async updateUser(userId: string, updateData: Partial<Pick<User, 'name' | 'email'>>): Promise<Omit<User, 'password'>> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      throw new Error('Failed to update user');
    }
  }

  /**
   * @description 更改用户密码
   * @param userId - 用户ID
   * @param currentPassword - 当前密码
   * @param newPassword - 新密码
   * @throws {Error} 当当前密码错误或更新失败时
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // 获取用户当前密码
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // 验证当前密码
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });
  }
}
