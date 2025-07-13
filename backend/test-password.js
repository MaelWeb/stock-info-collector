/*
 * @Author: Mael mael.liang@live.com
 * @Date: 2025-07-12 20:08:35
 * @LastEditors: Mael mael.liang@live.com
 * @LastEditTime: 2025-07-13 00:19:41
 * @FilePath: /stock-info-collector/backend/test-password.js
 * @Description:
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testPassword() {
  try {
    console.log('=== 测试用户密码 ===');

    // 获取用户信息（包含密码）
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
      },
    });

    console.log('用户列表:');
    users.forEach((user) => {
      console.log(`- 邮箱: ${user.email}`);
      console.log(`  姓名: ${user.name}`);
      console.log(`  密码哈希: ${user.password.substring(0, 20)}...`);
      console.log('');
    });

    // 测试常见密码
    const testPasswords = [
      'default123',
      'password123',
      '123456789',
      'admin123',
      'test123456',
      'liayal123',
      'admin@liayal.com',
      'password',
      '123456',
      'admin',
    ];

    console.log('=== 测试密码匹配 ===');
    for (const user of users) {
      console.log(`\n测试用户: ${user.email}`);
      for (const testPassword of testPasswords) {
        const isMatch = await bcrypt.compare(testPassword, user.password);
        if (isMatch) {
          console.log(`✅ 找到匹配密码: "${testPassword}"`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPassword();
