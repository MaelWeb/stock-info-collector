import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { superAdminConfig } from '../config';

const prisma = new PrismaClient();

/**
 * @description 超级管理员服务类
 */
export class SuperAdminService {
  /**
   * @description 初始化超级管理员账号
   * @returns 创建结果
   */
  static async initializeSuperAdmin() {
    try {
      // 检查是否已配置超级管理员
      if (!superAdminConfig.email || !superAdminConfig.password || !superAdminConfig.name) {
        console.log('超级管理员配置不完整，跳过初始化');
        return { success: false, message: '超级管理员配置不完整' };
      }

      // 检查是否已存在超级管理员
      const existingSuperAdmin = await prisma.user.findFirst({
        where: { role: 'super_admin' },
      });

      if (existingSuperAdmin) {
        console.log('超级管理员已存在，跳过初始化');
        return { success: false, message: '超级管理员已存在' };
      }

      // 检查邮箱是否已被使用
      const existingUser = await prisma.user.findUnique({
        where: { email: superAdminConfig.email },
      });

      if (existingUser) {
        console.log('邮箱已被使用，无法创建超级管理员');
        return { success: false, message: '邮箱已被使用' };
      }

      // 加密密码
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(superAdminConfig.password, saltRounds);

      // 创建超级管理员
      const superAdmin = await prisma.user.create({
        data: {
          email: superAdminConfig.email,
          password: hashedPassword,
          name: superAdminConfig.name,
          role: 'super_admin',
          isActive: true,
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

      console.log('超级管理员创建成功:', superAdmin.email);
      return { success: true, user: superAdmin };
    } catch (error) {
      console.error('创建超级管理员失败:', error);
      return { success: false, message: '创建超级管理员失败' };
    }
  }

  /**
   * @description 检查用户是否为超级管理员
   * @param userId - 用户ID
   * @returns 是否为超级管理员
   */
  static async isSuperAdmin(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      return user?.role === 'super_admin';
    } catch (error) {
      console.error('检查超级管理员权限失败:', error);
      return false;
    }
  }

  /**
   * @description 检查用户是否为管理员（包括超级管理员）
   * @param userId - 用户ID
   * @returns 是否为管理员
   */
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      return user?.role === 'admin' || user?.role === 'super_admin';
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      return false;
    }
  }

  /**
   * @description 获取所有用户列表（管理员功能）
   * @returns 用户列表
   */
  static async getAllUsers() {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return users;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw new Error('获取用户列表失败');
    }
  }

  /**
   * @description 更新用户角色和状态
   * @param userId - 用户ID
   * @param updates - 更新数据
   * @returns 更新后的用户
   */
  static async updateUserRole(userId: string, updates: { role?: string; isActive?: boolean }) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updates,
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
      console.error('更新用户角色失败:', error);
      throw new Error('更新用户角色失败');
    }
  }

  /**
   * @description 删除用户（仅超级管理员）
   * @param userId - 用户ID
   * @returns 删除结果
   */
  static async deleteUser(userId: string) {
    try {
      // 检查是否为超级管理员
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (user?.role === 'super_admin') {
        throw new Error('不能删除超级管理员账号');
      }

      await prisma.user.delete({
        where: { id: userId },
      });

      return { success: true };
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  }
}
