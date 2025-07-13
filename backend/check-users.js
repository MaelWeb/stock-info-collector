const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('=== 检查用户数据 ===');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('用户列表:');
    users.forEach((user) => {
      console.log(`- ID: ${user.id}`);
      console.log(`  邮箱: ${user.email}`);
      console.log(`  姓名: ${user.name}`);
      console.log(`  创建时间: ${user.createdAt}`);
      console.log('');
    });

    console.log('=== 检查邀请码 ===');
    const inviteCodes = await prisma.inviteCode.findMany({
      select: {
        id: true,
        code: true,
        used: true,
        usedBy: true,
        usedAt: true,
        createdAt: true,
      },
    });

    console.log('邀请码列表:');
    inviteCodes.forEach((invite) => {
      console.log(`- ID: ${invite.id}`);
      console.log(`  邀请码: ${invite.code}`);
      console.log(`  已使用: ${invite.used}`);
      console.log(`  使用者ID: ${invite.usedBy || '未使用'}`);
      console.log(`  使用时间: ${invite.usedAt || '未使用'}`);
      console.log(`  创建时间: ${invite.createdAt}`);
      console.log('');
    });
  } catch (error) {
    console.error('检查数据时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
