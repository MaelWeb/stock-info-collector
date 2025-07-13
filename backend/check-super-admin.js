const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkSuperAdmin() {
  try {
    console.log('=== 检查超级管理员状态 ===\n');

    // 检查所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log('所有用户:');
    users.forEach((user) => {
      console.log(`- 邮箱: ${user.email}`);
      console.log(`  姓名: ${user.name}`);
      console.log(`  角色: ${user.role}`);
      console.log(`  状态: ${user.isActive ? '激活' : '禁用'}`);
      console.log(`  创建时间: ${user.createdAt}`);
      console.log('');
    });

    // 检查超级管理员
    const superAdmins = users.filter((u) => u.role === 'super_admin');
    console.log(`超级管理员数量: ${superAdmins.length}`);

    if (superAdmins.length === 0) {
      console.log('❌ 没有找到超级管理员账号');
      console.log('\n可能的原因:');
      console.log('1. 后端服务启动时没有成功创建超级管理员');
      console.log('2. .env 文件中的超级管理员配置不完整');
      console.log('3. 数据库连接问题');

      // 检查环境变量
      console.log('\n=== 检查环境变量 ===');
      const env = require('dotenv').config();
      console.log('SUPER_ADMIN_EMAIL:', process.env.SUPER_ADMIN_EMAIL || '未设置');
      console.log('SUPER_ADMIN_PASSWORD:', process.env.SUPER_ADMIN_PASSWORD ? '已设置' : '未设置');
      console.log('SUPER_ADMIN_NAME:', process.env.SUPER_ADMIN_NAME || '未设置');
    } else {
      console.log('✅ 找到超级管理员账号:');
      superAdmins.forEach((admin) => {
        console.log(`- ${admin.email} (${admin.name})`);
      });

      // 测试登录
      console.log('\n=== 测试登录 ===');
      const testEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
      const testPassword = process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';

      const user = await prisma.user.findUnique({
        where: { email: testEmail },
        select: { password: true, role: true },
      });

      if (user) {
        const isPasswordValid = await bcrypt.compare(testPassword, user.password);
        console.log(`测试邮箱: ${testEmail}`);
        console.log(`测试密码: ${testPassword}`);
        console.log(`密码验证: ${isPasswordValid ? '✅ 正确' : '❌ 错误'}`);
        console.log(`用户角色: ${user.role}`);
      } else {
        console.log(`❌ 找不到邮箱为 ${testEmail} 的用户`);
      }
    }
  } catch (error) {
    console.error('检查过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperAdmin();
